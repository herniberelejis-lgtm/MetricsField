const nodemailer = require("nodemailer");
const { reportarFalla } = require("./monitor");

function emailHabilitado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;

function getTransporter() {
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

async function enviarEmail(opts) {
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
    void reportarFalla("email", e, { para: opts.to });
    return false;
  }
}

module.exports = { emailHabilitado, enviarEmail };
