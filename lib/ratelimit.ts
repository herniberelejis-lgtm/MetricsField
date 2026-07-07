import "server-only";

// Rate limit simple en memoria por clave (IP). Suficiente para frenar spam
// básico en los endpoints públicos de escritura. En un despliegue con varias
// instancias esto es por-instancia (no global); para el volumen de un cartel
// físico alcanza. Si el sitio recibe abuso serio, migrar a Upstash Redis.

type Ventana = { conteo: number; reinicia: number };
const mapa = new Map<string, Ventana>();

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
export function permitir(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const actual = mapa.get(clave);
  if (!actual || ahora > actual.reinicia) {
    mapa.set(clave, { conteo: 1, reinicia: ahora + ventanaMs });
    return true;
  }
  if (actual.conteo >= maximo) return false;
  actual.conteo += 1;
  return true;
}

// Limpieza perezosa: cada tanto, purgar ventanas vencidas para no crecer
// sin límite en memoria.
let ultimaLimpieza = Date.now();
export function limpiarVencidos(): void {
  const ahora = Date.now();
  if (ahora - ultimaLimpieza < 60_000) return;
  ultimaLimpieza = ahora;
  for (const [k, v] of mapa) {
    if (ahora > v.reinicia) mapa.delete(k);
  }
}
