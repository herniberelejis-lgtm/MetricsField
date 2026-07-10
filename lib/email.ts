import "server-only";
import nodemailer from "nodemailer";

// Envío de email por SMTP genérico — funciona con Gmail/Google Workspace
// (smtp.gmail.com + contraseña de aplicación), o con cualquier otro
// proveedor (Resend, SendGrid, etc. también exponen un endpoint SMTP). Sin
// las env vars cargadas, emailHabilitado() da false y el resto de la app
// se salta el envío en silencio — mismo patrón que GOOGLE_PLACES_API_KEY.

export function emailHabilitado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
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
    console.error("Error enviando email:", e);
    return false;
  }
}
