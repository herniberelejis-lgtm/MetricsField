// Validación del contacto opcional que deja el comprador de una pieza al
// activarla (canal Mercado Libre). Funciones puras: se testean sin base.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@.]{2,}$/;

/** Mail en minúsculas y sin espacios; "" si viene vacío; null si es inválido. */
export function normalizarEmail(email: string): string | null {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return "";
  return e.length <= 120 && EMAIL.test(e) ? e : null;
}

/** WhatsApp solo con dígitos (el "+", espacios y guiones se sacan); "" si
 * viene vacío; null si no parece un número (8 a 15 dígitos). */
export function normalizarWhatsapp(numero: string): string | null {
  const d = String(numero ?? "").replace(/[\s()+.-]/g, "");
  if (!d) return "";
  return /^\d{8,15}$/.test(d) ? d : null;
}

export type ContactoActivacion =
  | { ok: true; email: string; whatsapp: string; acepta: boolean }
  | { ok: false; error: string };

/** El contacto solo cuenta si el comprador marcó la casilla; sin casilla,
 * lo que haya escrito se descarta (no se guarda nada sin permiso). */
export function validarContacto(datos: { email?: string; whatsapp?: string; acepta?: boolean }): ContactoActivacion {
  if (!datos.acepta) return { ok: true, email: "", whatsapp: "", acepta: false };
  const email = normalizarEmail(datos.email ?? "");
  if (email === null) return { ok: false, error: "Revisá el mail: no parece válido." };
  const whatsapp = normalizarWhatsapp(datos.whatsapp ?? "");
  if (whatsapp === null) return { ok: false, error: "Revisá el WhatsApp: escribilo con código de área, solo números." };
  if (!email && !whatsapp) return { ok: false, error: "Para el aviso semanal dejanos tu mail o tu WhatsApp (o destildá la casilla)." };
  return { ok: true, email, whatsapp, acepta: true };
}
