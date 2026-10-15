import crypto from "node:crypto";

// Credenciales del cliente final de Loyalty (el 4to sistema de acceso, ver
// docs/LOYALTY-PRODUCTO-COMPLETO.md §8). Todo es HMAC con LOYALTY_PII_KEY y
// nada toca la base, así que se testea sin DATABASE_URL (test/loyalty-firma).
//
// Tres tokens distintos, cada uno con su propio prefijo dentro de la firma
// para que uno nunca valga como otro:
// - sesión: la cookie del celular del cliente (1 año).
// - visita: lo que agrega /t/<slug> al mandar a /l/<comercio> — solo un tap
//   real en el cartel suma puntos, no volver a abrir la página (15 min).
// - tarjeta: va dentro del pase de Google Wallet ("Ver mi tarjeta"); es lo
//   que le devuelve la sesión al cliente si cambió de celular o borró las
//   cookies. La tarjeta guardada en su Wallet ES la credencial.

const SESION_MS = 365 * 24 * 60 * 60 * 1000;
export const VISITA_MS = 15 * 60 * 1000;

/** null si falta la clave en producción: Loyalty no funciona sin ella
 * (fallar cerrado, nunca firmar con una clave conocida). En tu PC hay una
 * de desarrollo para poder probar sin configurar nada. */
export function claveLoyalty(): string | null {
  const clave = process.env.LOYALTY_PII_KEY;
  if (clave) return clave;
  return process.env.NODE_ENV === "production" ? null : "clave-de-desarrollo-loyalty";
}

function firmar(texto: string, clave: string): string {
  return crypto.createHmac("sha256", clave).update(texto).digest("base64url");
}

function firmaValida(texto: string, firma: string, clave: string): boolean {
  const esperada = Buffer.from(firmar(texto, clave));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

function requerirClave(): string {
  const clave = claveLoyalty();
  if (!clave) throw new Error("Falta LOYALTY_PII_KEY: Loyalty no puede firmar credenciales.");
  return clave;
}

// ---------- Sesión del cliente final (cookie) ----------

export const COOKIE_CLIENTE_FINAL = "loyalty_cliente";

export function crearCookieClienteFinal(clienteFinalId: string, ahora = Date.now()): string {
  const exp = ahora + SESION_MS;
  return `${clienteFinalId}.${exp}.${firmar(`sesion:${clienteFinalId}:${exp}`, requerirClave())}`;
}

export function leerCookieClienteFinal(valor: string | undefined, ahora = Date.now()): string | null {
  const clave = claveLoyalty();
  if (!clave || !valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, expTxt, firma] = partes;
  const exp = Number(expTxt);
  if (!id || !Number.isFinite(exp) || exp < ahora) return null;
  return firmaValida(`sesion:${id}:${exp}`, firma, clave) ? id : null;
}

// ---------- Visita (tap real en el cartel) ----------

export function crearTokenVisita(comercioId: string, ahora = Date.now()): string {
  return `${ahora}.${firmar(`visita:${comercioId}:${ahora}`, requerirClave())}`;
}

/** Válido solo para ESE comercio y durante 15 minutos desde el tap. */
export function tokenVisitaValido(token: string | undefined, comercioId: string, ahora = Date.now()): boolean {
  const clave = claveLoyalty();
  if (!clave || !token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const emitido = Number(partes[0]);
  if (!Number.isFinite(emitido)) return false;
  // Un minuto de tolerancia hacia adelante por relojes de instancias distintas.
  if (emitido > ahora + 60_000 || ahora - emitido > VISITA_MS) return false;
  return firmaValida(`visita:${comercioId}:${emitido}`, partes[1], clave);
}

// ---------- Link de la tarjeta (dentro del pase de Wallet) ----------

export function crearTokenTarjeta(membresiaId: string): string {
  return `${membresiaId}.${firmar(`tarjeta:${membresiaId}`, requerirClave())}`;
}

export function leerTokenTarjeta(token: string | undefined): string | null {
  const clave = claveLoyalty();
  if (!clave || !token) return null;
  const corte = token.lastIndexOf(".");
  if (corte <= 0) return null;
  const membresiaId = token.slice(0, corte);
  return firmaValida(`tarjeta:${membresiaId}`, token.slice(corte + 1), clave) ? membresiaId : null;
}

// ---------- Teléfono ----------

/** El teléfono es la identidad global del cliente final (único en
 * clientes_finales), así que "351 555-1234", "0351 15 555 1234" y
 * "+54 9 351 555 1234" tienen que ser la misma persona: se guarda el
 * número nacional de 10 dígitos (característica + número, sin 0 ni 15).
 * Números de otros países quedan tal cual, solo dígitos. null si no
 * parece un teléfono. */
export function normalizarTelefono(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.length < 8 || d.length > 15) return null;
  const internacional = entrada.trim().startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54") && d.length >= 12) {
    d = d.slice(2);
    if (d.startsWith("9") && d.length === 11) d = d.slice(1);
  } else if (internacional) {
    return d;
  }
  if (d.startsWith("0")) d = d.slice(1);
  // El "15" de los celulares va después de la característica (2 a 4
  // dígitos): 351 15 5551234 → 351 5551234. Se prueba primero la de 3
  // (Córdoba), después Buenos Aires (11) y las de 4 del interior.
  if (d.length === 12) {
    for (const corte of [3, 2, 4]) {
      if (d.slice(corte, corte + 2) === "15") {
        d = d.slice(0, corte) + d.slice(corte + 2);
        break;
      }
    }
  }
  return d.length >= 8 && d.length <= 15 ? d : null;
}
