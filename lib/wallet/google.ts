import "server-only";
import crypto from "node:crypto";

// Integración con Google Wallet Issuer API. Sin dependencia nueva: la
// Issuer API es HTTP + JWT firmado con RS256, y node:crypto firma RS256
// nativo — no hace falta jsonwebtoken ni google-auth-library para esto,
// mismo criterio minimalista que ya usa lib/crypto.ts.
//
// Variables de entorno (ver .env.example):
//   GOOGLE_WALLET_ISSUER_ID            — Issuer ID numérico de la consola de Google Wallet
//   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL — email de la cuenta de servicio
//   GOOGLE_WALLET_SERVICE_ACCOUNT_KEY   — clave privada PEM de esa cuenta de servicio
//
// Sin las tres cargadas, toda función acá tira — no hay modo degradado
// silencioso posible (a diferencia de SMTP o Places): sin esto no hay
// Wallet, y fallar ruidoso es mejor que un botón "Guardar" que no hace nada.
//
// CONEXIONES
//   Se conecta a: walletobjects.googleapis.com (API real de Google, HTTP)
//                 y oauth2.googleapis.com (para el access token)
//   Depende de:   GOOGLE_WALLET_ISSUER_ID/_SERVICE_ACCOUNT_EMAIL/_KEY
//   Lo usa:       app/(loyalty)/l/[codigo]/actions.ts — crearClase (una
//                 vez por programa, lazy) → crearOActualizarObjeto (una
//                 vez por membresía) → generarLinkGuardar (el botón que
//                 ve el cliente). Nada de esto se llama desde ningún otro
//                 lugar del repo (Reviews no lo toca).
//   No se conecta a la base — quien persiste el resultado (google_class_id
//   en loyalty.programas, google_object_id/estado_google en
//   loyalty.membresias) es el llamador, vía lib/db/loyalty.ts.

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

function credenciales() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const clavePrivada = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;
  if (!issuerId || !email || !clavePrivada) {
    throw new Error(
      "Faltan GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL / GOOGLE_WALLET_SERVICE_ACCOUNT_KEY"
    );
  }
  // En Vercel las variables de entorno no soportan saltos de línea reales
  // cómodamente — es común cargar la clave con "\n" literal y despiralizarla acá.
  return { issuerId, email, clavePrivada: clavePrivada.replace(/\\n/g, "\n") };
}

function base64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function firmarJwtRS256(payload: Record<string, unknown>, clavePrivada: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const encabezado = base64Url(JSON.stringify(header));
  const cuerpo = base64Url(JSON.stringify(payload));
  const firmante = crypto.createSign("RSA-SHA256");
  firmante.update(`${encabezado}.${cuerpo}`);
  const firma = base64Url(firmante.sign(clavePrivada));
  return `${encabezado}.${cuerpo}.${firma}`;
}

let tokenCache: { valor: string; expiraEn: number } | null = null;

/** Intercambia un JWT firmado por un access token OAuth2 (flujo JWT Bearer
 * de cuenta de servicio, RFC 7523) — sin SDK, dos llamadas HTTP. Cachea el
 * token en memoria del proceso hasta 1 minuto antes de su expiración real. */
async function obtenerAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEn) return tokenCache.valor;

  const { email, clavePrivada } = credenciales();
  const ahora = Math.floor(Date.now() / 1000);
  const assertion = firmarJwtRS256(
    {
      iss: email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    },
    clavePrivada
  );

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Google OAuth2 token exchange falló (${resp.status}): ${await resp.text()}`);
  }
  const datos = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache = { valor: datos.access_token, expiraEn: Date.now() + (datos.expires_in - 60) * 1000 };
  return datos.access_token;
}

/** POST-o-PUT idempotente contra la Issuer API: intenta crear (POST); si ya
 * existe (409), actualiza (PUT). La Issuer API no tiene un verbo "upsert"
 * real, este es el patrón que la propia documentación de Google recomienda. */
async function crearOActualizar(recurso: string, id: string, cuerpo: Record<string, unknown>): Promise<void> {
  const token = await obtenerAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const creacion = await fetch(`${WALLET_API}/${recurso}`, {
    method: "POST",
    headers,
    body: JSON.stringify(cuerpo),
  });
  if (creacion.ok) return;
  if (creacion.status !== 409) {
    throw new Error(`Google Wallet ${recurso} POST falló (${creacion.status}): ${await creacion.text()}`);
  }
  const actualizacion = await fetch(`${WALLET_API}/${recurso}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(cuerpo),
  });
  if (!actualizacion.ok) {
    throw new Error(`Google Wallet ${recurso} PUT falló (${actualizacion.status}): ${await actualizacion.text()}`);
  }
}

/** Da de alta (o actualiza) la LoyaltyClass de un programa — una por
 * programa, reusada por todas sus membresías. Idempotente: se puede
 * llamar en cada alta de programa sin duplicar nada.
 *
 * El id se arma con `programa.id` (UUID de loyalty.programas), NUNCA con
 * el id/slug del comercio: las clases de Google Wallet no se pueden
 * borrar jamás, así que si se usara un slug editable y alguien lo
 * cambiara, la clase quedaría huérfana para siempre (ver
 * docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §7). */
export async function crearClase(programa: { id: string; nombreComercio: string }): Promise<string> {
  const { issuerId } = credenciales();
  const classId = `${issuerId}.${programa.id}`;
  await crearOActualizar("loyaltyClass", classId, {
    id: classId,
    issuerName: programa.nombreComercio,
    programName: `${programa.nombreComercio} — Fidelización`,
    reviewStatus: "UNDER_REVIEW",
  });
  return classId;
}

/** Da de alta (o actualiza) el LoyaltyObject de una membresía puntual, con
 * el saldo actual. Se llama tanto al registrar al cliente como cada vez
 * que cambian los puntos (`actualizarPuntos` es un alias semántico de esta
 * misma función — PUT es upsert, no hay una operación separada de "solo
 * modificar" en la Issuer API). */
export async function crearOActualizarObjeto(datos: {
  classId: string;
  membresiaId: string;
  nombreCliente: string;
  saldo: number;
}): Promise<string> {
  const { issuerId } = credenciales();
  const objectId = `${issuerId}.${datos.membresiaId}`;
  await crearOActualizar("loyaltyObject", objectId, {
    id: objectId,
    classId: datos.classId,
    state: "ACTIVE",
    accountName: datos.nombreCliente,
    loyaltyPoints: { balance: { int: datos.saldo }, label: "Puntos" },
  });
  return objectId;
}

export const actualizarPuntos = crearOActualizarObjeto;

/** Link firmado "Agregar a Google Wallet" — el botón que ve el cliente en
 * la landing. REQUIERE que el objeto ya exista en el servidor de Google
 * (llamar crearOActualizarObjeto antes) porque el JWT solo lo REFERENCIA
 * por id, sin el payload inline: Google documenta un límite práctico de
 * ~1800 caracteres para la URL de guardado en el navegador, y el payload
 * inline con nombre + puntos puede pisar ese límite. Referenciar por id
 * mantiene el link corto siempre, sin importar cuánto crezca el nombre
 * del cliente o del comercio (ver
 * docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §7). */
export function generarLinkGuardar(datos: { objectId: string }): string {
  const { email, clavePrivada } = credenciales();
  const ahora = Math.floor(Date.now() / 1000);
  const jwt = firmarJwtRS256(
    {
      iss: email,
      aud: "google",
      typ: "savetowallet",
      iat: ahora,
      payload: {
        loyaltyObjects: [{ id: datos.objectId }],
      },
    },
    clavePrivada
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
