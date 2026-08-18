// Misma lógica que lib/sesion.ts — cookies firmadas del panel (sin Next).

const SESION_MAX_MS = 1000 * 60 * 60 * 24 * 30;

function base64UrlABytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = Buffer.from(b64 + pad, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesABase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacBase64Url(clave, mensaje) {
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

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function crearCookiePassword(password) {
  const exp = String(Date.now() + SESION_MAX_MS);
  return `${exp}.${await hmacBase64Url(password, `pw.${exp}`)}`;
}

async function cookiePasswordValida(valor, password) {
  if (!password) return false;
  const [exp, firma] = valor.split(".");
  if (!exp || !firma) return false;
  if (!/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  return iguales(firma, await hmacBase64Url(password, `pw.${exp}`));
}

async function crearCookieSesionGoogle(email, nombre, secreto) {
  const exp = Date.now() + SESION_MAX_MS;
  const payload = bytesABase64Url(new TextEncoder().encode(JSON.stringify({ email, nombre, exp })));
  return `${payload}.${await hmacBase64Url(secreto, payload)}`;
}

async function leerCookieSesionGoogle(valor, secreto) {
  if (!secreto) return null;
  const [payload, firma] = valor.split(".");
  if (!payload || !firma) return null;
  if (!iguales(firma, await hmacBase64Url(secreto, payload))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlABytes(payload)));
    if (!data.email) return null;
    if (!data.exp || Date.now() > data.exp) return null;
    return { email: data.email, nombre: data.nombre ?? "" };
  } catch {
    return null;
  }
}

module.exports = {
  SESION_MAX_MS,
  crearCookiePassword,
  cookiePasswordValida,
  crearCookieSesionGoogle,
  leerCookieSesionGoogle,
};
