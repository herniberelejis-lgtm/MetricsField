import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { crearCookieSesionGoogle, leerCookieSesionGoogle, SESION_MAX_MS } from "./sesion";
import {
  ADMIN_SCOPE,
  canjearCodigo,
  decodificarIdToken,
  dominioCookieOauth,
  oauthConfigurado,
  origenCanonico,
  urlDeAutorizacion,
} from "./google-oauth";
import { piezaEsDeCuenta, salPinAutogestion } from "./db";
import { piezaAutorizada } from "./llavero";

// Cuenta de Google de quien maneja piezas autogestionadas (Mis piezas). No
// es un login a MetricsField ni al panel: solo prueba "soy este mail" para
// guardar las piezas en la cuenta y recuperarlas desde cualquier celular.
// Reusa el OAuth que ya existe (mismo client y el mismo redirect_uri del
// login del equipo, que ya está registrado en Cloud Console): el callback
// del admin desvía acá cuando el state empieza con PREFIJO_STATE.
//
// La sesión es una cookie propia (audiencia "piezas": no sirve para el
// panel ni para el portal), solo bajo /t como el llavero.

export const PREFIJO_STATE = "pz_";
const COOKIE_CUENTA = "mf_cuenta";
const COOKIE_STATE = "piezas_oauth_state";
const RUTA = "/t";

function secreto(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

/** Mail de la cuenta de Google con la que entró este navegador, o null. */
export async function cuentaActual(): Promise<string | null> {
  const valor = (await cookies()).get(COOKIE_CUENTA)?.value;
  if (!valor || !secreto()) return null;
  const s = await leerCookieSesionGoogle(valor, secreto(), "piezas");
  return s?.email.toLowerCase() ?? null;
}

/** Solo desde server actions. */
export async function cerrarCuenta(): Promise<void> {
  (await cookies()).set(COOKIE_CUENTA, "", { path: RUTA, maxAge: 0 });
}

/** ¿Este navegador puede manejar la pieza? Por el llavero del celular o
 * porque está guardada en la cuenta de Google con la que entró. Devuelve la
 * sal actual del PIN (la que exigen los cambios sin PIN) o null. */
export async function accesoAPieza(slug: string): Promise<string | null> {
  const sal = await salPinAutogestion(slug);
  if (!sal) return null;
  if (await piezaAutorizada(slug, sal)) return sal;
  const email = await cuentaActual();
  return email && (await piezaEsDeCuenta(slug, email)) ? sal : null;
}

// ---------- Vaivén con Google ----------

/** GET /t/cuenta/google: manda a elegir la cuenta de Google. */
export function empezarLoginGoogle(req: NextRequest): NextResponse {
  if (!oauthConfigurado()) return NextResponse.redirect(new URL("/t/mis-piezas?cuenta=no-disponible", req.url));
  const state = `${PREFIJO_STATE}${crypto.randomBytes(16).toString("hex")}`;
  const redirectUri = `${origenCanonico(req.nextUrl.origin)}/api/admin/oauth/callback`;
  const res = NextResponse.redirect(urlDeAutorizacion({ redirectUri, state, scope: ADMIN_SCOPE }));
  res.cookies.set(COOKIE_STATE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    domain: dominioCookieOauth(),
    maxAge: 600,
    path: "/",
  });
  return res;
}

/** La vuelta de Google (desde el callback del admin, por el prefijo del
 * state): crea la sesión y vuelve a Mis piezas, que guarda en la cuenta las
 * piezas de este celular. */
export async function completarLoginGoogle(req: NextRequest): Promise<NextResponse> {
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(COOKIE_STATE)?.value;
  const volver = (q: string) => {
    const res = NextResponse.redirect(new URL(`/t/mis-piezas?${q}`, req.url));
    res.cookies.delete({ name: COOKIE_STATE, domain: dominioCookieOauth(), path: "/" });
    return res;
  };
  if (!state || !cookieState || state !== cookieState) return volver("cuenta=error");
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return volver("cuenta=cancelado");

  const redirectUri = `${origenCanonico(req.nextUrl.origin)}/api/admin/oauth/callback`;
  const { idToken } = await canjearCodigo(code, redirectUri);
  const datos = idToken ? decodificarIdToken(idToken) : null;
  if (!datos || !secreto()) return volver("cuenta=error");

  const res = volver("vincular=1");
  res.cookies.set(COOKIE_CUENTA, await crearCookieSesionGoogle(datos.email.toLowerCase(), datos.nombre, secreto(), "piezas"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESION_MAX_MS / 1000,
    path: RUTA,
  });
  return res;
}
