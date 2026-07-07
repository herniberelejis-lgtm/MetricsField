// Formato y verificación de las cookies de sesión del panel — UNA sola
// implementación compartida entre lib/auth.ts (Node, server actions) y
// middleware.ts (Edge). Usa solo WebCrypto y helpers estándar (TextEncoder,
// atob/btoa), disponibles en ambos runtimes, para que el formato firmado no
// pueda divergir entre el guard del middleware y el de las server actions.
// Acá no hay acceso a env vars ni a la base: las claves llegan por parámetro.

export const SESION_MAX_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

function base64UrlABytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesABase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacBase64Url(clave: string, mensaje: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clave),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(mensaje));
  return bytesABase64Url(new Uint8Array(sig));
}

/** Comparación en tiempo constante para no filtrar info por timing. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- Cookie por contraseña compartida: "exp.firma" ----------
// No lleva la contraseña ni su hash: lleva un vencimiento firmado por HMAC
// usando la contraseña como clave. Capturar la cookie no permite deducirla
// ni fabricar sesiones nuevas; cambiar ADMIN_PASSWORD corta las sesiones.

export async function crearCookiePassword(password: string): Promise<string> {
  const exp = String(Date.now() + SESION_MAX_MS);
  return `${exp}.${await hmacBase64Url(password, `pw.${exp}`)}`;
}

export async function cookiePasswordValida(valor: string, password: string): Promise<boolean> {
  if (!password) return false;
  const [exp, firma] = valor.split(".");
  if (!exp || !firma) return false;
  if (!/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  return iguales(firma, await hmacBase64Url(password, `pw.${exp}`));
}

// ---------- Cookie por Google: "payload.firma", exp dentro del payload ----------

export interface SesionGoogle {
  email: string;
  nombre: string;
}

export async function crearCookieSesionGoogle(
  email: string,
  nombre: string,
  secreto: string,
): Promise<string> {
  const exp = Date.now() + SESION_MAX_MS;
  const payload = bytesABase64Url(new TextEncoder().encode(JSON.stringify({ email, nombre, exp })));
  return `${payload}.${await hmacBase64Url(secreto, payload)}`;
}

export async function leerCookieSesionGoogle(
  valor: string,
  secreto: string,
): Promise<SesionGoogle | null> {
  if (!secreto) return null;
  const [payload, firma] = valor.split(".");
  if (!payload || !firma) return null;
  if (!iguales(firma, await hmacBase64Url(secreto, payload))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlABytes(payload))) as {
      email?: string;
      nombre?: string;
      exp?: number;
    };
    if (!data.email) return null;
    if (!data.exp || Date.now() > data.exp) return null; // sesión vencida
    return { email: data.email, nombre: data.nombre ?? "" };
  } catch {
    return null;
  }
}
