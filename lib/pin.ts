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

/** Para un PIN que se ELIGE (activar, cambiar, entregar, el equipo): además
 * de válido, que no sea de los primeros que alguien prueba — todos iguales
 * (1111), escalera (1234, 9876) o un par repetido (1212). No se usa para
 * VERIFICAR: quien ya tiene uno así tiene que poder seguir entrando. */
export function pinSeguro(pin: string): boolean {
  if (!pinValido(pin)) return false;
  const d = [...pin].map(Number);
  const pasos = d.slice(1).map((x, i) => x - d[i]);
  if (pasos.every((p) => p === 0) || pasos.every((p) => p === 1) || pasos.every((p) => p === -1)) return false;
  if (pin.length % 2 === 0 && pin === pin.slice(0, 2).repeat(pin.length / 2)) return false;
  return true;
}

/** PIN al azar de 4 dígitos que ya pasa pinSeguro. */
export function pinAlAzar(): string {
  for (;;) {
    const pin = String(crypto.randomInt(1000, 10000));
    if (pinSeguro(pin)) return pin;
  }
}

export const ERROR_PIN_FACIL = "Ese PIN es muy fácil de adivinar (como 1234, 1111 o 1212). Elegí otro.";

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
