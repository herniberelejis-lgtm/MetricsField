"use server";

import crypto from "node:crypto";
import QRCode from "qrcode";
import { emailAdminActual, requireAdmin } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/db";
import { crearClase, crearOActualizarObjeto, generarLinkGuardar } from "@/lib/wallet/google";

// Prueba de punta a punta de Google Wallet, antes de que exista el registro
// real de Loyalty: crea una clase "MetricsField (prueba)" y una tarjeta con
// 3 puntos, y devuelve el link "Guardar en Google Wallet". Pega contra la
// Issuer API de verdad, así que si algo de la configuración de Google está
// mal (clave, permisos, API apagada) aparece acá y no con un cliente.

export type ResultadoPaseDemo =
  | { ok: true; link: string; qr: string }
  | { ok: false; error: string; pista: string | null }
  | null;

const COMERCIO_PRUEBA = { id: "prueba-metricsfield", nombre: "MetricsField (prueba)" };

/** Traduce los errores típicos de Google a qué tocar en la consola. */
function pistaPara(error: string): string | null {
  if (/Faltan GOOGLE_WALLET/.test(error)) {
    return "Las variables de Wallet no están en este ambiente. Hoy están cargadas solo en Preview de Vercel.";
  }
  if (/DECODER|PEM|asn1|bad base64|unsupported/i.test(error)) {
    return "La clave privada está mal pegada en GOOGLE_WALLET_SERVICE_ACCOUNT_KEY. Tiene que ir completa, desde -----BEGIN PRIVATE KEY----- hasta -----END PRIVATE KEY-----\\n, sin comillas.";
  }
  if (/invalid_grant|Invalid JWT|invalid_client/i.test(error)) {
    return "Google no reconoce la clave: el email y la clave no son de la misma cuenta de servicio, o la clave se borró en Cloud Console.";
  }
  if (/SERVICE_DISABLED|has not been used|is disabled/i.test(error)) {
    return "Falta habilitar la \"Google Wallet API\" en Cloud Console (APIs y servicios) del proyecto donde está la cuenta de servicio.";
  }
  if (/\(403\)|PERMISSION_DENIED/.test(error)) {
    return "La cuenta de servicio no tiene permiso sobre el emisor: agregala en Pay & Wallet Console → Usuarios con nivel Desarrollador.";
  }
  return null;
}

export async function accionPaseDemoWallet(): Promise<ResultadoPaseDemo> {
  await requireAdmin();
  try {
    const classId = await crearClase(COMERCIO_PRUEBA);
    const datos = {
      classId,
      membresiaId: `prueba-${crypto.randomUUID()}`,
      nombreCliente: "Cliente de prueba",
      saldo: 3,
    };
    const objectId = await crearOActualizarObjeto(datos);
    const link = generarLinkGuardar({ ...datos, objectId });
    // El JWT entra entero en el QR: pesa ~1 KB, por eso corrección baja.
    const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: "L", margin: 2, width: 360 });
    await registrarAuditoria(await emailAdminActual(), "prueba_wallet", objectId);
    return { ok: true, link, qr };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("accionPaseDemoWallet:", error);
    return { ok: false, error, pista: pistaPara(error) };
  }
}
