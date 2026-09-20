import "server-only";
import crypto from "node:crypto";

// Primitivas de identidad y cifrado de Loyalty. Nada acá toca la base —
// se puede testear sin DATABASE_URL, igual que lib/crypto.ts. La capa de
// datos (lib/db/loyalty.ts, L3) es quien las usa antes de leer/escribir.
//
// Diferencia clave con lib/crypto.ts: ahí TOKEN_ENCRYPTION_KEY es OPCIONAL
// (hay tokens viejos en texto plano que hay que seguir leyendo). Acá
// LOYALTY_PII_KEY y LOYALTY_IP_PEPPER son OBLIGATORIAS — Loyalty es un
// módulo nuevo, no hay dato viejo en texto plano con el que ser
// compatible, así que no existe un modo "sin cifrar" tolerado. Ver
// docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §4 y §8.

function claveDesdeEnv(nombreVar: string): Buffer {
  const b64 = process.env[nombreVar];
  if (!b64) {
    throw new Error(
      `Falta la variable de entorno ${nombreVar}. Generarla una sola vez con: openssl rand -base64 32`,
    );
  }
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) {
    throw new Error(`${nombreVar} debe decodificar a 32 bytes en base64 — generala con: openssl rand -base64 32`);
  }
  return buf;
}

// ---------- Credencial de membresía ----------

/** Token de sesión del cliente final: 256 bits de entropía. Es la
 * credencial completa — como una tarjeta de plástico, quien lo tiene la
 * usa. Viaja en la cookie y en el link de respaldo; NUNCA se guarda en la
 * base (solo su hash, ver hashToken). */
export function generarToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** SHA-256 del token, para guardar en `loyalty.membresias.token_hash` y
 * para buscar por él. El hash no permite reconstruir el token (a
 * diferencia de hmacTelefono, acá no hace falta cifrado reversible: nadie
 * necesita "leer" el token de vuelta, solo verificar que coincide). */
export function hashToken(token: string): Buffer {
  return crypto.createHash("sha256").update(token, "utf8").digest();
}

// ---------- Teléfono: normalización + índice ciego ----------

/** Normaliza un teléfono argentino a un E.164 canónico con marcador de
 * celular (+549<area><número>, 10 dígitos después del 9). Es DELIBERADO
 * asumir celular siempre: el caso de uso de este producto (registro para
 * wallet/WhatsApp) es casi 100% celular, y sin esto la normalización no
 * puede decidir si insertar el "9" o no. No es una librería de telefonía
 * general — si el producto necesitara otros países o landlines, esto se
 * reemplaza por una librería real (ej. libphonenumber).
 *
 * Deliberadamente NO intenta adivinar ni quitar el prefijo local "15" de
 * celulares (convención previa a 2013): sin una tabla de códigos de área
 * completa, esa heurística puede corromper un número válido que
 * legítimamente empiece con "15". Si el resultado no tiene exactamente
 * 10 dígitos de área+número, se rechaza en vez de adivinar.
 *
 * Formatos que sí resuelve (los mismos dígitos lógicos, distinta forma de
 * escribirlos): con o sin espacios/guiones, con "+54", con "54", con "0"
 * de discado local, con o sin el "9" de celular ya puesto.
 */
export function normalizarTelefono(entrada: string): string {
  let d = entrada.replace(/\D/g, "");

  if (d.startsWith("00")) d = d.slice(2); // discado internacional: 0054...
  if (d.startsWith("54")) d = d.slice(2); // código de país, con o sin "+" (ya lo sacamos arriba)
  else if (d.startsWith("0")) d = d.slice(1); // discado local con trunk 0: 0351...

  if (d.startsWith("9")) d = d.slice(1); // marcador E.164 de celular, si ya venía puesto

  if (d.length !== 10) {
    throw new Error(`Teléfono inválido: "${entrada}" no resuelve a 10 dígitos de área+número`);
  }

  return `+549${d}`;
}

/** HMAC-SHA256 del teléfono ya normalizado, con LOYALTY_PII_KEY. Es el
 * índice ciego: permite el UNIQUE de loyalty.clientes y la búsqueda por
 * igualdad sin guardar el teléfono en claro ni con cifrado determinístico
 * (que filtraría igualdad directamente en el ciphertext). SIEMPRE
 * normalizar con normalizarTelefono() antes de llamar esto, o el UNIQUE
 * no cumple su función. */
export function hmacTelefono(telefonoE164: string): Buffer {
  return crypto.createHmac("sha256", claveDesdeEnv("LOYALTY_PII_KEY")).update(telefonoE164, "utf8").digest();
}

// ---------- Cifrado de datos personales (teléfono, nombre, email) ----------

/** Cifra un dato personal con AES-256-GCM y LOYALTY_PII_KEY. A diferencia
 * de lib/crypto.ts, el resultado es un Buffer listo para una columna
 * BYTEA (no un string con prefijo) — el formato es [iv(12) | tag(16) |
 * ciphertext], todo concatenado, porque no hace falta legibilidad en la
 * base ni compatibilidad con datos viejos sin cifrar. */
export function cifrar(texto: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", claveDesdeEnv("LOYALTY_PII_KEY"), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, cifrado]);
}

/** Descifra un Buffer producido por cifrar(). Tira si el valor fue
 * manipulado (GCM autentica) o si cambió LOYALTY_PII_KEY sin un plan de
 * rotación — ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §8. */
export function descifrar(valor: Buffer): string {
  const iv = valor.subarray(0, 12);
  const tag = valor.subarray(12, 28);
  const cifrado = valor.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", claveDesdeEnv("LOYALTY_PII_KEY"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}

// ---------- IP: hash con clave, nunca en texto plano ----------

/** HMAC-SHA256 de una IP con LOYALTY_IP_PEPPER — nunca un hash pelado
 * (SHA-256 sin clave): el espacio completo de direcciones IPv4 se
 * revierte por fuerza bruta en segundos con una GPU, así que un hash sin
 * clave no es dato disociado. Clave separada de LOYALTY_PII_KEY a
 * propósito: son dos secretos con blast radius distinto. */
export function hmacIp(ip: string): Buffer {
  return crypto.createHmac("sha256", claveDesdeEnv("LOYALTY_IP_PEPPER")).update(ip, "utf8").digest();
}
