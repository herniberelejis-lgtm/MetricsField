import "server-only";
import crypto from "node:crypto";

// Cifrado simétrico (AES-256-GCM) para secretos sensibles que hoy se
// guardan en columnas de texto plano — hoy solo comercios.google_refresh_token.
// Con ese refresh token, cualquiera que lo tenga puede pedir un access token
// nuevo y leer la ficha de Google Business Profile del cliente hasta que lo
// revoque a mano — merece estar cifrado en reposo, no solo detrás del
// acceso a la base.
//
// TOKEN_ENCRYPTION_KEY es opcional (64 caracteres hex = 32 bytes). Sin
// ella, cifrar()/descifrar() son no-op — el valor se guarda/lee tal cual,
// como siempre. Así un deploy sin la variable cargada no rompe la conexión
// de Google de nadie; simplemente sigue en texto plano hasta que se cargue.

const PREFIJO = "enc1:";

function clave(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes) — generala con: openssl rand -hex 32");
  }
  return buf;
}

/** Cifra un valor para guardar en la base. Sin TOKEN_ENCRYPTION_KEY
 * configurada, devuelve el valor sin cambios (ver comentario arriba). */
export function cifrar(texto: string): string {
  const k = clave();
  if (!k || !texto) return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIJO}${iv.toString("hex")}:${tag.toString("hex")}:${cifrado.toString("hex")}`;
}

/** Descifra un valor leído de la base. Si no tiene el prefijo de cifrado
 * (token guardado antes de cargar TOKEN_ENCRYPTION_KEY, o la variable
 * sigue sin configurar) lo devuelve tal cual — compatibilidad hacia atrás
 * sin necesitar una migración de datos aparte. */
export function descifrar(valor: string): string {
  if (!valor.startsWith(PREFIJO)) return valor;
  const k = clave();
  if (!k) {
    throw new Error("Hay un valor cifrado pero falta TOKEN_ENCRYPTION_KEY para leerlo.");
  }
  const [ivHex, tagHex, dataHex] = valor.slice(PREFIJO.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const texto = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return texto.toString("utf8");
}
