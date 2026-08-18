const crypto = require("node:crypto");

function pinValido(pin) {
  return /^\d{4,8}$/.test(pin);
}

function hashearPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return { hash, salt };
}

function pinCoincide(pin, hash, salt) {
  const candidato = crypto.scryptSync(pin, salt, 32);
  const esperado = Buffer.from(hash, "hex");
  if (candidato.length !== esperado.length) return false;
  return crypto.timingSafeEqual(candidato, esperado);
}

module.exports = { pinValido, hashearPin, pinCoincide };
