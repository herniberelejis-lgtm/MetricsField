import crypto from "node:crypto";

// Llavero de piezas: qué piezas autogestionadas puede cambiar este
// navegador sin volver a poner el PIN. Vive en una sola cookie HttpOnly
// (ver lib/llavero.ts) con entradas "código.firma" separadas por "~".
//
// La firma de cada pieza es HMAC(clave del servidor, código + sal del PIN):
// - sin el secreto del servidor nadie la puede fabricar (ni con la base
//   entera en la mano: la sal sola no alcanza);
// - cada vez que cambia el PIN cambia la sal (hashearPin genera una nueva),
//   así que cambiar el PIN deja sin efecto a todos los navegadores que la
//   tenían — es lo que hace "entregar" y el PIN nuevo del admin.
// Funciones puras para poder probarlas sin Next (test/llavero.test.ts).

/** Tope de piezas por navegador: ~31 bytes por entrada mantiene la cookie
 * bien por debajo de los 4 KB que aceptan todos los navegadores. */
export const MAX_PIEZAS_LLAVERO = 100;

const LARGO_FIRMA = 16; // 96 bits en base64url
const CODIGO = /^[a-z0-9-]{1,80}$/;
const FIRMA = /^[A-Za-z0-9_-]{16}$/;

/** Clave propia del llavero derivada del secreto base, para no reutilizar
 * tal cual la clave de otra cosa (sesiones del admin, etc.). */
export function claveLlavero(secretoBase: string): Buffer {
  return crypto.createHmac("sha256", secretoBase).update("metricsfield/llavero-piezas/v1").digest();
}

export function firmaPieza(clave: Buffer, codigo: string, salPin: string): string {
  return crypto
    .createHmac("sha256", clave)
    .update(`pieza:${codigo}:${salPin}`)
    .digest("base64url")
    .slice(0, LARGO_FIRMA);
}

export function firmaValida(clave: Buffer, codigo: string, salPin: string | null, firma: string): boolean {
  // Sin sal no hay PIN (pieza reasignada a un cliente, o nunca activada):
  // nada que autorizar, nunca una firma calculada sobre un valor vacío.
  if (!salPin || !FIRMA.test(firma)) return false;
  const esperada = Buffer.from(firmaPieza(clave, codigo, salPin));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

/** Lee la cookie. Descarta en silencio lo que no tenga forma válida (cookie
 * vieja, editada a mano): nunca tira error. El orden se conserva. */
export function leerLlavero(valor: string | undefined | null): Map<string, string> {
  const m = new Map<string, string>();
  if (!valor) return m;
  for (const entrada of valor.split("~")) {
    const [codigo, firma, ...resto] = entrada.split(".");
    if (resto.length || !codigo || !firma || !CODIGO.test(codigo) || !FIRMA.test(firma)) continue;
    m.delete(codigo);
    m.set(codigo, firma);
  }
  return m;
}

/** Escribe la cookie, quedándose con las últimas MAX_PIEZAS_LLAVERO. */
export function escribirLlavero(m: Map<string, string>): string {
  return [...m.entries()]
    .slice(-MAX_PIEZAS_LLAVERO)
    .map(([codigo, firma]) => `${codigo}.${firma}`)
    .join("~");
}

/** Agrega o actualiza una pieza (queda al final: la más reciente). */
export function conPieza(m: Map<string, string>, codigo: string, firma: string): Map<string, string> {
  const nuevo = new Map(m);
  nuevo.delete(codigo);
  nuevo.set(codigo, firma);
  return nuevo;
}

export function sinPieza(m: Map<string, string>, codigo: string): Map<string, string> {
  const nuevo = new Map(m);
  nuevo.delete(codigo);
  return nuevo;
}

// ---------- "Sumar una pieza": el navegador espera un escaneo ----------
// Marca firmada con vencimiento adentro: mientras está vigente, escanear una
// pieza autogestionada que este navegador no tiene muestra "sumala con su
// PIN" en vez de mandar a Google. Solo afecta a este navegador.

export function crearMarcaSumar(clave: Buffer, hastaMs: number): string {
  const hasta = String(Math.floor(hastaMs));
  const firma = crypto.createHmac("sha256", clave).update(`sumar:${hasta}`).digest("base64url").slice(0, LARGO_FIRMA);
  return `${hasta}.${firma}`;
}

export function marcaSumarVigente(clave: Buffer, valor: string | undefined | null, ahoraMs: number): boolean {
  if (!valor) return false;
  const [hasta, firma] = valor.split(".");
  if (!hasta || !firma || !/^\d{10,16}$/.test(hasta) || Number(hasta) < ahoraMs) return false;
  const esperada = Buffer.from(crearMarcaSumar(clave, Number(hasta)).split(".")[1]);
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

// ---------- Ticket para sumar una pieza recién activada ----------
// Guardar una cookie desde una server action hace que Next vuelva a dibujar
// la página donde está parado el usuario: al activar, eso reemplazaba la
// pantalla de "¡Listo!" (con el PIN) por la del dueño. Por eso la action de
// activar no toca cookies: devuelve este ticket firmado (5 minutos, atado a
// la pieza y a su PIN actual) y el navegador lo canjea en /t/llavero.

export function crearTicket(clave: Buffer, codigo: string, salPin: string, hastaMs: number): string {
  const hasta = String(Math.floor(hastaMs));
  const firma = crypto
    .createHmac("sha256", clave)
    .update(`ticket:${codigo}:${salPin}:${hasta}`)
    .digest("base64url")
    .slice(0, LARGO_FIRMA);
  return `${codigo}.${hasta}.${firma}`;
}

/** El código de la pieza que dice el ticket (sin verificar todavía). */
export function codigoDeTicket(ticket: string): string | null {
  const [codigo] = String(ticket ?? "").split(".");
  return codigo && CODIGO.test(codigo) ? codigo : null;
}

export function ticketValido(clave: Buffer, ticket: string, salPin: string | null, ahoraMs: number): boolean {
  const [codigo, hasta, firma, ...resto] = String(ticket ?? "").split(".");
  if (resto.length || !salPin || !codigo || !hasta || !firma || !/^\d{10,16}$/.test(hasta) || Number(hasta) < ahoraMs) {
    return false;
  }
  const esperada = Buffer.from(crearTicket(clave, codigo, salPin, Number(hasta)).split(".")[2]);
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

/** Navegadores internos de apps (Instagram, Facebook, Line, la app de
 * Google, WebViews de Android): no comparten cookies con Chrome/Safari, así
 * que lo que se guarde ahí no sirve cuando después se escanea con la cámara. */
export function esNavegadorInterno(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|GSA\/|; wv\)|MicroMessenger|TikTok|musical_ly/i.test(userAgent);
}
