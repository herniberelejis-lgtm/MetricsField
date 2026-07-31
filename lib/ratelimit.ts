import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit por clave (IP, o IP+recurso). Con UPSTASH_REDIS_REST_URL/TOKEN
// cargadas usa Upstash Redis — el límite es global entre todas las
// instancias de Vercel, así que no se puede saltear cayendo en otra. Sin
// esas variables cae a un contador en memoria por-instancia (alcanza para
// desarrollo local; en producción sin Redis, un atacante puede evadir el
// límite reintentando hasta caer en otra instancia).

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

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
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "desconocida"
  );
}

/** Devuelve true si el request está permitido; false si superó el límite. */
export async function permitir(clave: string, maximo: number, ventanaMs: number): Promise<boolean> {
  if (redis) {
    const { success } = await limitadorRedis(maximo, ventanaMs).limit(clave);
    return success;
  }
  return permitirMemoria(clave, maximo, ventanaMs);
}

// Limpieza perezosa del fallback en memoria: cada tanto, purgar ventanas
// vencidas para no crecer sin límite. Con Redis no hace falta — las claves
// expiran solas (TTL nativo del sliding window).
let ultimaLimpieza = Date.now();
export function limpiarVencidos(): void {
  if (redis) return;
  const ahora = Date.now();
  if (ahora - ultimaLimpieza < 60_000) return;
  ultimaLimpieza = ahora;
  for (const [k, v] of mapaMemoria) {
    if (ahora > v.reinicia) mapaMemoria.delete(k);
  }
}
