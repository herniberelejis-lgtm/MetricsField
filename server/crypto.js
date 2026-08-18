const crypto = require("node:crypto");

const PREFIJO = "enc1:";

function clave() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes)");
  }
  return buf;
}

function cifrar(texto) {
  const k = clave();
  if (!k || !texto) return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIJO}${iv.toString("hex")}:${tag.toString("hex")}:${cifrado.toString("hex")}`;
}

function descifrar(valor) {
  if (!valor.startsWith(PREFIJO)) return valor;
  const k = clave();
  if (!k) throw new Error("Hay un valor cifrado pero falta TOKEN_ENCRYPTION_KEY");
  const [ivHex, tagHex, dataHex] = valor.slice(PREFIJO.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const texto = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return texto.toString("utf8");
}

module.exports = { cifrar, descifrar };
