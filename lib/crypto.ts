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
//
// Rotación: cambiar TOKEN_ENCRYPTION_KEY deja ilegibles todos los tokens
// cifrados con la anterior (pasó de verdad: un cliente quedó con su Google
// "conectado" pero sin sincronizar, error "unable to authenticate data").
// Para rotar sin romper a nadie: mover el valor viejo a
// TOKEN_ENCRYPTION_KEY_ANTERIOR y poner el nuevo en TOKEN_ENCRYPTION_KEY.
// descifrar() prueba primero la actual y después la anterior; cifrar() usa
// siempre la actual, así que cada token se va re-cifrando con la clave nueva
// la próxima vez que el cliente reconecta.

const PREFIJO = "enc1:";

function clave(variable = "TOKEN_ENCRYPTION_KEY"): Buffer | null {
  const hex = process.env[variable];
  if (!hex) return null;
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error(`${variable} debe ser 64 caracteres hex (32 bytes) — generala con: openssl rand -hex 32`);
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
  const anterior = clave("TOKEN_ENCRYPTION_KEY_ANTERIOR");
  try {
    return descifrarCon(k, valor);
  } catch (e) {
    if (!anterior) throw e;
    return descifrarCon(anterior, valor);
  }
}

function descifrarCon(k: Buffer, valor: string): string {
  const [ivHex, tagHex, dataHex] = valor.slice(PREFIJO.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const texto = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return texto.toString("utf8");
}
