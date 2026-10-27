import "server-only";
import { Redis } from "@upstash/redis";
import { modoSinGasto } from "./politica-gasto";

// Una única operación atómica reserva TODOS los contadores antes de llamar
// a Google. No hay fallback en memoria ni devolución de cupo ante errores:
// un timeout puede haber sido facturado por el proveedor igualmente.
export const RESERVAR_CUPO = `
for i, key in ipairs(KEYS) do
  local count = tonumber(redis.call('GET', key) or '0')
  if count >= tonumber(ARGV[(i-1)*2+1]) then return 0 end
end
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('PEXPIRE', key, ARGV[(i-1)*2+2]) end
end
return 1`;

function limite(nombre: string, defecto: number): number | null {
  const valor = process.env[nombre];
  if (valor === undefined || valor === "") return defecto;
  if (!/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return Number.isSafeInteger(n) && n >= 0 && n <= 100_000 ? n : null;
}

async function reservar(contadores: { clave: string; maximo: number; ventana: number }[]): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url?.startsWith("https://") || !token) return false;
  try {
    const redis = new Redis({ url, token, retry: { retries: 0 }, signal: () => AbortSignal.timeout(2000) });
    const resultado = await redis.eval(
      RESERVAR_CUPO,
      contadores.map(c => `places-seguridad:v1:${c.clave}`),
      contadores.flatMap(c => [c.maximo, c.ventana]),
    );
    return resultado === 1;
  } catch {
    // Nada de tokens, consultas o URLs de Redis en los logs.
    console.error("Places: se bloqueó una consulta porque el control de cupo no está disponible.");
    return false;
  }
}

/** Para rutas/actions pagas: falla cerrado incluso en local y previews. */
export async function permitirConsultaPaga(clave: string, maximo: number, ventana: number): Promise<boolean> {
  if (modoSinGasto()) return false;
  if (process.env.GOOGLE_PLACES_HABILITADO !== "true") return false;
  return reservar([{ clave: `actor:${clave}`, maximo, ventana }]);
}

/** Tope agregado de TODAS las llamadas de lib/places, entre instancias.
 * Redis debe ser compartido por todos los despliegues que usen la clave.
 * Cuenta intentos, no pesos/dólares: las SKUs tienen precios diferentes. */
export async function reservarConsultaPlaces(): Promise<boolean> {
  if (modoSinGasto()) return false;
  if (process.env.GOOGLE_PLACES_HABILITADO !== "true") return false;
  const diario = limite("GOOGLE_PLACES_MAX_DIA", 0);
  const mensual = limite("GOOGLE_PLACES_MAX_MES", 0);
  if (diario === null || mensual === null) return false;
  if (diario === 0 || mensual === 0) return false;
  const fecha = new Date().toISOString();
  return reservar([
    { clave: `dia:${fecha.slice(0, 10)}`, maximo: diario, ventana: 2 * 86400_000 },
    { clave: `mes:${fecha.slice(0, 7)}`, maximo: mensual, ventana: 32 * 86400_000 },
  ]);
}

/** Único punto de salida a Places: sin reintentos ni redirecciones y con
 * timeout. La URL y los field masks los fija el código, nunca el usuario. */
export async function fetchPlacesSeguro(url: string, opciones: RequestInit & { next?: { revalidate: number } }): Promise<Response> {
  const destino = new URL(url);
  if (destino.origin !== "https://places.googleapis.com") {
    // Simulador permitido únicamente en desarrollo local, sin credenciales reales.
    const simulador = process.env.NODE_ENV !== "production" && !process.env.VERCEL &&
      process.env.PLACES_API_BASE && destino.origin === new URL(process.env.PLACES_API_BASE).origin &&
      ["localhost", "127.0.0.1"].includes(destino.hostname);
    if (!simulador) return new Response(null, { status: 503 });
  }
  if (!(await reservarConsultaPlaces())) return new Response(null, { status: 429 });
  try {
    return await fetch(url, { ...opciones, redirect: "error", signal: AbortSignal.timeout(8000) });
  } catch {
    return new Response(null, { status: 503 });
  }
}
