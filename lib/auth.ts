import "server-only";
import { cookies } from "next/headers";
import { esAdminPermitido } from "./db";
import {
  SESION_MAX_MS,
  cookiePasswordValida,
  crearCookiePassword as crearCookiePasswordFormato,
  crearCookieSesionGoogle as crearCookieSesionGoogleFormato,
  leerCookieSesionGoogle,
} from "./sesion";

// Autenticación del panel de admin — dos formas, una sesión:
// 1. Contraseña compartida (histórica): cookie con un vencimiento firmado
//    por HMAC usando la contraseña como clave (ver lib/sesion.ts).
// 2. Google, restringido a la allowlist de `admins`: cookie firmada (HMAC)
//    con el email de quien entró + vencimiento, para que auditoria.ts sepa
//    quién hizo qué. La sesión por Google es la preferida — deja identidad.
//
// El formato y la verificación de ambas cookies viven en lib/sesion.ts,
// compartido con middleware.ts para que nunca diverjan. Este archivo agrega
// lo que el middleware no puede hacer: leer env vars de servidor con
// "server-only" y consultar la base (allowlist).

const COOKIE = "admin_session";
export const COOKIE_GOOGLE = "admin_google_session";
export { SESION_MAX_MS };

// La cookie de Google se firma con el client secret de OAuth: ya es un
// secreto de servidor que existe si esta función va a usarse (sin OAuth
// configurado no hay login por Google posible), así evitamos pedir una
// variable de entorno nueva solo para esto.
function claveFirmaGoogle(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

/** Arma el valor de la cookie de sesión por contraseña compartida. */
export async function crearCookiePassword(): Promise<string> {
  return crearCookiePasswordFormato(process.env.ADMIN_PASSWORD ?? "");
}

/** Arma el valor de la cookie de sesión por Google: payload.firma — el
 * payload lleva el vencimiento adentro, verificado al leer. */
export async function crearCookieSesionGoogle(email: string, nombre: string): Promise<string> {
  return crearCookieSesionGoogleFormato(email, nombre, claveFirmaGoogle());
}

export async function tieneSesionAdmin(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  // Sin contraseña configurada: abierto solo en desarrollo (tu PC).
  if (!password) return process.env.NODE_ENV !== "production";
  const jar = await cookies();

  const porPassword = jar.get(COOKIE)?.value;
  if (porPassword && (await cookiePasswordValida(porPassword, password))) return true;

  const porGoogle = jar.get(COOKIE_GOOGLE)?.value;
  if (porGoogle && (await leerCookieSesionGoogle(porGoogle, claveFirmaGoogle()))) return true;

  return false;
}

/** Email de quien está logueado, solo si entró con Google — para auditoria.
 * Con login por contraseña no hay forma de saber quién es (por eso el
 * objetivo es migrar el equipo al login con Google). */
export async function emailAdminActual(): Promise<string | null> {
  const jar = await cookies();
  const porGoogle = jar.get(COOKIE_GOOGLE)?.value;
  if (!porGoogle) return null;
  return (await leerCookieSesionGoogle(porGoogle, claveFirmaGoogle()))?.email ?? null;
}

/**
 * Guard de las server actions de admin (defensa en profundidad). El
 * middleware ya bloquea las rutas /admin/*, pero las server actions son
 * endpoints POST y deben verificar la sesión por sí mismas: así nunca
 * pueden ejecutarse desde una ruta pública ni por un request forjado.
 *
 * Si la sesión es por Google, re-chequea la allowlist `admins` en cada
 * mutación: sacar a alguien de /admin/administradores le revoca el acceso
 * aunque su cookie siga vigente. La consulta falla cerrada a propósito —
 * si la base no responde, la mutación iba a fallar igual un paso después.
 * OJO: esto solo cubre sesiones por Google; la contraseña compartida no
 * tiene identidad, ahí la única revocación es rotar ADMIN_PASSWORD.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await tieneSesionAdmin())) {
    throw new Error("No autorizado. Iniciá sesión en el panel.");
  }
  const email = await emailAdminActual();
  if (email && !(await esAdminPermitido(email))) {
    throw new Error("Tu acceso al panel fue revocado.");
  }
}
