import "server-only";
import crypto from "node:crypto";

// PIN de edición de las piezas de hardware autogestionadas (canal Mercado
// Libre): lo elige el comprador al activar su cartel y lo vuelve a pedir
// cada vez que quiere cambiar el link de reseña. Baja entropía a propósito
// (6 dígitos, fácil de anotar en la caja) — la defensa real contra fuerza
// bruta es el rate limit en la action que lo verifica, no el hash en sí.
// Igual se guarda con scrypt + salt random, nunca en texto plano.

export function pinValido(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function hashearPin(pin: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return { hash, salt };
}

export function pinCoincide(pin: string, hash: string, salt: string): boolean {
  const candidato = crypto.scryptSync(pin, salt, 32);
  const esperado = Buffer.from(hash, "hex");
  if (candidato.length !== esperado.length) return false;
  return crypto.timingSafeEqual(candidato, esperado);
}
