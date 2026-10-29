import "server-only";
import { cookies } from "next/headers";
import {
  claveLlavero,
  codigoDeTicket,
  crearTicket,
  ticketValido,
  conPieza,
  crearMarcaSumar,
  escribirLlavero,
  firmaPieza,
  firmaValida,
  leerLlavero,
  marcaSumarVigente,
  sinPieza,
} from "./llavero-core";

// Cookie del llavero de piezas (ver lib/llavero-core.ts). Solo bajo /t: no
// viaja en cada pedido al admin ni a los archivos estáticos, y las server
// actions de /t/... y /t/mis-piezas la reciben igual (hacen POST a esa URL).
// Leerla se puede en cualquier página; escribirla, solo en server actions
// (Next 15 no deja poner cookies desde una página).

const COOKIE_LLAVERO = "mf_llavero";
const COOKIE_SUMAR = "mf_sumar";
const RUTA = "/t";
const UN_ANO_S = 60 * 60 * 24 * 365;
export const MINUTOS_SUMAR = 10;

/** El secreto del llavero. Sin ninguno configurado el llavero queda
 * apagado y todo vuelve a pedir el PIN (nunca se firma con algo vacío). */
function clave(): Buffer | null {
  const base =
    process.env.LLAVERO_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.CRON_SECRET ||
    "";
  return base ? claveLlavero(`${base}|${process.env.VERCEL_ENV ?? "local"}`) : null;
}

function opciones(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: Boolean(process.env.VERCEL),
    path: RUTA,
    maxAge,
  };
}

/** Las piezas que dice tener este navegador (sin verificar: para eso,
 * piezaAutorizada con la sal actual de la base). */
export async function leerPiezasDelLlavero(): Promise<Map<string, string>> {
  return leerLlavero((await cookies()).get(COOKIE_LLAVERO)?.value);
}

/** ¿Este navegador puede cambiar esta pieza sin PIN? `salPin` es la sal
 * actual del PIN en la base (null si la pieza no tiene PIN). */
export async function piezaAutorizada(codigo: string, salPin: string | null): Promise<boolean> {
  const k = clave();
  if (!k || !salPin) return false;
  const firma = (await leerPiezasDelLlavero()).get(codigo);
  return firma ? firmaValida(k, codigo, salPin, firma) : false;
}

export function firmaVerificable(codigo: string, salPin: string | null, firma: string): boolean {
  const k = clave();
  return k ? firmaValida(k, codigo, salPin, firma) : false;
}

/** Solo desde server actions. */
export async function guardarEnLlavero(codigo: string, salPin: string | null): Promise<void> {
  const k = clave();
  if (!k || !salPin) return;
  const jar = await cookies();
  const m = conPieza(leerLlavero(jar.get(COOKIE_LLAVERO)?.value), codigo, firmaPieza(k, codigo, salPin));
  jar.set(COOKIE_LLAVERO, escribirLlavero(m), opciones(UN_ANO_S));
}

/** Solo desde server actions. */
export async function quitarDelLlavero(codigo: string): Promise<void> {
  const jar = await cookies();
  const m = sinPieza(leerLlavero(jar.get(COOKIE_LLAVERO)?.value), codigo);
  jar.set(COOKIE_LLAVERO, escribirLlavero(m), opciones(UN_ANO_S));
}

// ---------- Modo "sumar una pieza" ----------

export async function modoSumarActivo(): Promise<boolean> {
  const k = clave();
  return k ? marcaSumarVigente(k, (await cookies()).get(COOKIE_SUMAR)?.value, Date.now()) : false;
}

/** Solo desde server actions. Empieza (o estira) la espera de un escaneo. */
export async function empezarModoSumar(): Promise<boolean> {
  const k = clave();
  if (!k) return false;
  (await cookies()).set(
    COOKIE_SUMAR,
    crearMarcaSumar(k, Date.now() + MINUTOS_SUMAR * 60_000),
    opciones(MINUTOS_SUMAR * 60),
  );
  return true;
}

/** Solo desde server actions. */
export async function terminarModoSumar(): Promise<void> {
  (await cookies()).set(COOKIE_SUMAR, "", opciones(0));
}

// ---------- Ticket (ver lib/llavero-core.ts) ----------

export function ticketParaSumar(codigo: string, salPin: string | null): string | null {
  const k = clave();
  return k && salPin ? crearTicket(k, codigo, salPin, Date.now() + 5 * 60_000) : null;
}

/** Valida un ticket contra la sal actual (la busca quien llama con el
 * código que devuelve codigoDelTicket). */
export function codigoDelTicket(ticket: string): string | null {
  return codigoDeTicket(ticket);
}

export function ticketVigente(ticket: string, salPin: string | null): boolean {
  const k = clave();
  return k ? ticketValido(k, ticket, salPin, Date.now()) : false;
}
