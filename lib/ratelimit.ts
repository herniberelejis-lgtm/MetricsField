import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit por clave (IP, o IP+recurso). Con UPSTASH_REDIS_REST_URL/TOKEN
// cargadas usa Upstash Redis — el límite es global entre todas las
// instancias de Vercel, así que no se puede saltear cayendo en otra. Sin
// esas variables (o si están cargadas con un valor inválido — el
// constructor de Redis valida el formato de la URL y tira sincrónico) cae a
// un contador en memoria por-instancia (alcanza para desarrollo local; en
// producción sin Redis, un atacante puede evadir el límite reintentando
// hasta caer en otra instancia).
//
// El try/catch importa: este módulo se importa desde una route de Next.js,
// y un throw a nivel de módulo tumba el build ENTERO en "Collecting page
// data" (pasó de verdad: Preview de Vercel con UPSTASH_REDIS_REST_URL
// cargada pero con un valor que no es una URL https válida). Una env var
// mal cargada en un entorno no puede tirar abajo el build de todos los
// demás.

/** Valor de una env var sin espacios ni comillas envolventes. En el panel de
 * Vercel es fácil pegar `"https://…"` con las comillas del .env — pasó en
 * Production y el rate limit quedó en memoria sin que nadie lo notara. */
export function limpiarValorEnv(valor: string | undefined): string {
  const v = (valor ?? "").trim();
  const m = v.match(/^(["'])(.*)\1$/);
  return (m ? m[2] : v).trim();
}

function crearRedis(): Redis | null {
  const url = limpiarValorEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = limpiarValorEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch (err) {
    console.error("Rate limit: UPSTASH_REDIS_REST_URL/TOKEN inválidas, cae a memoria —", err);
    return null;
  }
}

const redis = crearRedis();

// Un Ratelimit (con su propio script Lua) por combinación (máximo, ventana)
// — se cachean para no recrearlo en cada request; las llamadas del código
// solo usan un puñado de combinaciones fijas (login, PIN, taps...).
const limitadoresRedis = new Map<string, Ratelimit>();
function limitadorRedis(maximo: number, ventanaMs: number): Ratelimit {
  const clave = `${maximo}:${ventanaMs}`;
  let l = limitadoresRedis.get(clave);
  if (!l) {
    l = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(maximo, `${ventanaMs} ms`),
      analytics: false,
      prefix: "ratelimit",
      // Si Redis tarda más que esto, Ratelimit deja pasar el request: el
      // cartel NFC no puede quedar colgado esperando al rate limit.
      timeout: 1500,
    });
    limitadoresRedis.set(clave, l);
  }
  return l;
}

// --- Fallback en memoria, solo si no hay Redis configurado ---
type Ventana = { conteo: number; reinicia: number };
const mapaMemoria = new Map<string, Ventana>();
function permitirMemoria(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const actual = mapaMemoria.get(clave);
  if (!actual || ahora > actual.reinicia) {
    mapaMemoria.set(clave, { conteo: 1, reinicia: ahora + ventanaMs });
    return true;
  }
  if (actual.conteo >= maximo) return false;
  actual.conteo += 1;
  return true;
}

/** IP del cliente para usar como clave de rate limit. En Vercel estos
 * headers los pone la plataforma (no los controla el cliente). Compartido
 * por todas las actions con límite para que la clave no divirja entre
 * endpoints. */
export function ipDelRequest(h: Headers): string {
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";
  return claveDeIp(ip);
}

/** IPv4 tal cual; IPv6 agrupada por su /64. Un proveedor le da a cada
 * cliente un /64 entero (2^64 direcciones): contar por dirección exacta
 * dejaría a una sola persona rotar IPs y saltear cualquier límite. */
export function claveDeIp(ip: string): string {
  const limpia = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!limpia.includes(":")) return limpia;
  // IPv4 embebida (::ffff:1.2.3.4): es una IPv4.
  const v4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(limpia);
  if (v4) return v4[1];
  const [izq, der] = limpia.split("::");
  const a = izq ? izq.split(":") : [];
  const b = der !== undefined && der !== "" ? der.split(":") : [];
  const faltan = limpia.includes("::") ? 8 - a.length - b.length : 0;
  const grupos = [...a, ...Array(Math.max(faltan, 0)).fill("0"), ...b];
  if (grupos.length !== 8 || !grupos.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return limpia;
  return `${grupos.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** Devuelve true si el request está permitido; false si superó el límite. */
export async function permitir(clave: string, maximo: number, ventanaMs: number): Promise<boolean> {
  if (redis) {
    try {
      const { success, reason } = await limitadorRedis(maximo, ventanaMs).limit(clave);
      // Si Upstash no contestó a tiempo, Ratelimit deja pasar: en ese caso
      // decide el contador en memoria, para que un Redis lento no abra
      // login, PIN y portal de par en par.
      if (reason === "timeout") return permitirMemoria(clave, maximo, ventanaMs);
      return success;
    } catch (err) {
      // Token inválido, Upstash caído, etc.: el límite sigue en memoria en
      // vez de tirar abajo el tap, el login o el portal.
      console.error("Rate limit: falló Upstash, uso el contador en memoria —", err);
    }
  }
  return permitirMemoria(clave, maximo, ventanaMs);
}

// Limpieza perezosa del fallback en memoria: cada tanto, purgar ventanas
// vencidas para no crecer sin límite. Con Redis el mapa casi siempre está
// vacío (solo se usa si Upstash falla), así que limpiar no cuesta nada.
let ultimaLimpieza = Date.now();
export function limpiarVencidos(): void {
  const ahora = Date.now();
  if (ahora - ultimaLimpieza < 60_000) return;
  ultimaLimpieza = ahora;
  for (const [k, v] of mapaMemoria) {
    if (ahora > v.reinicia) mapaMemoria.delete(k);
  }
}
