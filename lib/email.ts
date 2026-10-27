import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { reportarFalla } from "./monitor";
import { servicioExternoPermitido } from "./politica-gasto";

// Envío de email por SMTP genérico — funciona con Gmail/Google Workspace
// (smtp.gmail.com + contraseña de aplicación), o con cualquier otro
// proveedor (Resend, SendGrid, etc. también exponen un endpoint SMTP). Sin
// las env vars cargadas, emailHabilitado() da false y el resto de la app
// se salta el envío en silencio — mismo patrón que GOOGLE_PLACES_API_KEY.

export function emailHabilitado(): boolean {
  return servicioExternoPermitido("smtp") && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Nunca tira excepción: un email que falla no debe romper el flujo que lo
 * dispara (crear una reseña, sincronizar Google). Devuelve false y loguea. */
export async function enviarEmail(opts: {
  to: string;
  asunto: string;
  html: string;
}): Promise<boolean> {
  if (!emailHabilitado() || !opts.to.trim()) return false;
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.asunto,
      html: opts.html,
    });
    return true;
  } catch (e) {
    // El envío de email falla en silencio a propósito (nunca tumba el flujo
    // que lo llamó), así que el reporte es la única forma de enterarse.
    // El destinatario va enmascarado: el reporte sale a un webhook externo
    // y alcanza con el dominio + primera letra para saber a quién era.
    void reportarFalla("email", e, { para: enmascararEmail(opts.to) });
    return false;
  }
}

function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

/** Qué variables de mail faltan (para el diagnóstico del admin). */
export function variablesEmailFaltantes(): string[] {
  return ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((v) => !process.env[v]);
}

/** Traduce el error de SMTP a qué revisar. Nunca incluye la contraseña:
 * solo el código y la respuesta del servidor. */
export function explicarErrorEmail(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; response?: string; message?: string } | null;
  const code = err?.code ?? "";
  const respuesta = (err?.response ?? err?.message ?? "").slice(0, 200);
  if (code === "EAUTH" || err?.responseCode === 535 || err?.responseCode === 534) {
    return `El servidor rechazó el usuario o la contraseña (SMTP_USER / SMTP_PASS). Con Gmail o Google Workspace, SMTP_PASS tiene que ser una "contraseña de aplicación" de 16 letras, no la contraseña normal, y la cuenta necesita la verificación en 2 pasos activada. Respuesta: ${respuesta}`;
  }
  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED", "ENOTFOUND"].includes(code)) {
    return `No se pudo conectar a SMTP_HOST en el puerto SMTP_PORT. Para Gmail: smtp.gmail.com y 587. Detalle: ${code} ${respuesta}`;
  }
  if (code === "EENVELOPE" || err?.responseCode === 553 || err?.responseCode === 550 || err?.responseCode === 501) {
    return `El servidor no acepta EMAIL_FROM como remitente: tiene que ser la misma casilla de SMTP_USER (o un alias verificado de esa cuenta), por ejemplo "MetricsField <casilla@dominio.com>". Respuesta: ${respuesta}`;
  }
  return `Falló el envío (${code || err?.responseCode || "sin código"}): ${respuesta}`;
}

/** Envío de prueba desde el admin: a diferencia de enviarEmail, devuelve el
 * motivo exacto si falla, para saber qué corregir en Vercel. */
export async function probarEnvioEmail(opts: {
  to: string;
  asunto: string;
  html: string;
}): Promise<{ ok: true; remitente: string } | { ok: false; error: string }> {
  if (!servicioExternoPermitido("smtp")) return { ok: false, error: "Correo pausado por el modo sin gasto. Primero verificá que el proveedor SMTP sea gratuito." };
  const faltan = variablesEmailFaltantes();
  if (faltan.length) return { ok: false, error: `Faltan cargar en Vercel (Production): ${faltan.join(", ")}.` };
  const remitente = process.env.EMAIL_FROM || process.env.SMTP_USER || "";
  try {
    await getTransporter().verify();
    await getTransporter().sendMail({ from: remitente, to: opts.to, subject: opts.asunto, html: opts.html });
    return { ok: true, remitente };
  } catch (e) {
    return { ok: false, error: explicarErrorEmail(e) };
  }
}
