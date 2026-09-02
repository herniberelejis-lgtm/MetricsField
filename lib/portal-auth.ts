import "server-only";
import { cookies } from "next/headers";
import { esEmailAutorizadoPortal, portalRequiereLoginGoogle } from "./db";
import {
  SESION_MAX_MS,
  crearCookieSesionGoogle as crearCookieSesionGoogleFormato,
  leerCookieSesionGoogle,
} from "./sesion";

// Sesión de Google del PORTAL de un cliente — separada de la del panel de
// admin (lib/auth.ts, cookie admin_google_session): distinta cookie, y acá
// "estar logueado" no alcanza solo con eso, además hay que estar en la
// allowlist de portal_usuarios DE ESE comercio puntual (una misma cuenta de
// Google puede estar autorizada en el portal de un cliente y no en el de
// otro). El formato y la verificación de la cookie viven en lib/sesion.ts,
// compartido con el resto del login por Google.

export const COOKIE_PORTAL_GOOGLE = "portal_google_session";
export { SESION_MAX_MS, portalRequiereLoginGoogle };

// La cookie se firma con el client secret de OAuth, igual que la del panel
// de admin — ya es un secreto de servidor que existe si esta función va a
// usarse (sin OAuth configurado no hay login por Google posible acá).
function claveFirmaGoogle(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

export async function crearCookieSesionPortal(email: string, nombre: string): Promise<string> {
  return crearCookieSesionGoogleFormato(email, nombre, claveFirmaGoogle());
}

/** Email de quien está mirando el portal ahora, si tiene una sesión de
 * Google válida — sin importar todavía si está autorizado para ESTE
 * comercio en particular (eso lo resuelve tieneAccesoPortal). */
export async function emailSesionPortal(): Promise<string | null> {
  const jar = await cookies();
  const valor = jar.get(COOKIE_PORTAL_GOOGLE)?.value;
  if (!valor) return null;
  const sesion = await leerCookieSesionGoogle(valor, claveFirmaGoogle());
  return sesion?.email ?? null;
}

/** true si quien está mirando ahora tiene sesión de Google válida Y esa
 * cuenta está en la allowlist del portal de este comercio (siempre la
 * cuenta raíz — ver portalRequiereLoginGoogle). */
export async function tieneAccesoPortal(comercioId: string): Promise<boolean> {
  const email = await emailSesionPortal();
  if (!email) return false;
  return esEmailAutorizadoPortal(comercioId, email);
}
