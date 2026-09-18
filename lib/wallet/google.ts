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

/** Da de alta (o actualiza) la LoyaltyClass de un comercio — una por
 * comercio, reusada por todas sus membresías. Idempotente: se puede llamar
 * en cada alta de comercio sin duplicar nada. */
export async function crearClase(comercio: { id: string; nombre: string }): Promise<string> {
  const { issuerId } = credenciales();
  const classId = `${issuerId}.${comercio.id}`;
  await crearOActualizar("loyaltyClass", classId, {
    id: classId,
    issuerName: comercio.nombre,
    programName: `${comercio.nombre} — Fidelización`,
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
 * la landing. No requiere que el objeto ya exista en el servidor de Google
 * (el JWT trae el objeto inline), pero llamamos crearOActualizarObjeto
 * antes igual para que el saldo quede sincronizado del lado de Google
 * incluso si el cliente nunca vuelve a tocar el botón. */
export function generarLinkGuardar(datos: {
  classId: string;
  objectId: string;
  nombreCliente: string;
  saldo: number;
}): string {
  const { email, clavePrivada } = credenciales();
  const ahora = Math.floor(Date.now() / 1000);
  const jwt = firmarJwtRS256(
    {
      iss: email,
      aud: "google",
      typ: "savetowallet",
      iat: ahora,
      payload: {
        loyaltyObjects: [
          {
            id: datos.objectId,
            classId: datos.classId,
            state: "ACTIVE",
            accountName: datos.nombreCliente,
            loyaltyPoints: { balance: { int: datos.saldo }, label: "Puntos" },
          },
        ],
      },
    },
    clavePrivada
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
