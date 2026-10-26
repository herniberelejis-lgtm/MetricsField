import crypto from "node:crypto";

// Link de baja del aviso semanal de las piezas: lleva el mail y una firma
// HMAC, así nadie puede dar de baja a otro cambiando el mail en la URL. La
// clave sale de un secreto que ya existe en producción; sin ninguno no hay
// link (el mail dice que respondan "BAJA").

function clave(): Buffer | null {
  const secreto = process.env.BAJA_SECRET || process.env.CRON_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!secreto) return null;
  return crypto.createHash("sha256").update(`baja-novedades:${secreto}`).digest();
}

export function firmarBaja(email: string): string | null {
  const k = clave();
  if (!k) return null;
  return crypto.createHmac("sha256", k).update(email.trim().toLowerCase()).digest("base64url");
}

export function bajaValida(email: string, firma: string): boolean {
  const esperada = firmarBaja(email);
  if (!esperada || !firma) return false;
  const a = Buffer.from(esperada);
  const b = Buffer.from(String(firma));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
