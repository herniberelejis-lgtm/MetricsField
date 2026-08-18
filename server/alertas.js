const { enviarEmail } = require("./email");
const { metricaActual, metricaAnterior } = require("./utils");

function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

const ESTILO = "font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c2530;line-height:1.5;";

function layout(titulo, cuerpo, cliente) {
  const url = baseUrl();
  const linkPortal = url ? `${url}/portal/${cliente.codigoAcceso}#resenas` : null;
  return `
    <div style="${ESTILO}max-width:480px;margin:0 auto;padding:24px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#2563eb;">MetricsField</div>
      <h1 style="font-size:17px;margin:8px 0 12px;">${titulo}</h1>
      ${cuerpo}
      ${
        linkPortal
          ? `<a href="${linkPortal}" style="display:inline-block;margin-top:18px;padding:10px 18px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">Ver en tu portal</a>`
          : ""
      }
    </div>
  `;
}

function estrellasHtml(n) {
  return `<span style="color:#f4b400;">${"★".repeat(n)}</span><span style="color:#dadce0;">${"★".repeat(5 - n)}</span>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function resolverEmailNotificaciones(cliente) {
  if (cliente.emailNotificaciones) return cliente;
  if (!cliente.comercioPadreId) return cliente;
  const { getCliente } = require("./db/clientes");
  const cuenta = await getCliente(cliente.comercioPadreId);
  return cuenta ?? cliente;
}

async function alertarResenaMala(cliente, resena) {
  const destino = await resolverEmailNotificaciones(cliente);
  if (!destino.emailNotificaciones) return;
  const cuerpo = `
    <p style="font-size:14px;">Te llegó una reseña de <strong>${escapeHtml(resena.autor)}</strong> en Google:</p>
    <p style="font-size:16px;">${estrellasHtml(resena.estrellas)}</p>
    <p style="font-size:14px;background:#f8f9fa;border-radius:10px;padding:12px 14px;">${escapeHtml(resena.texto) || "(sin comentario)"}</p>
  `;
  await enviarEmail({
    to: destino.emailNotificaciones,
    asunto: `Nueva reseña de ${resena.estrellas}★ en ${cliente.nombre}`,
    html: layout("Nueva reseña que necesita tu respuesta", cuerpo, destino),
  });
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtMes(ym) {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

function fmtNum(n) {
  return new Intl.NumberFormat("es-AR").format(n);
}

function delta(actual, anterior) {
  const d = actual - anterior;
  if (d === 0) return { dir: "flat", valor: 0 };
  return { dir: d > 0 ? "up" : "down", valor: d };
}

async function enviarResumenMensual(cliente) {
  const destino = await resolverEmailNotificaciones(cliente);
  if (!destino.emailNotificaciones) return false;
  const m = metricaActual(cliente);
  if (!m) return false;
  const prev = metricaAnterior(cliente);
  const dResenas = prev ? delta(m.resenasNuevas, prev.resenasNuevas) : null;
  const filaDelta = (d) =>
    d && d.dir !== "flat" ? ` (${d.valor >= 0 ? "+" : ""}${d.valor} vs mes anterior)` : "";

  const cuerpo = `
    <p style="font-size:14px;">Así estuvo ${cliente.nombre} en ${fmtMes(m.mes)}:</p>
    <ul style="font-size:14px;padding-left:18px;">
      <li>${fmtNum(m.resenasNuevas)} reseñas nuevas${filaDelta(dResenas)} — ${fmtNum(m.resenasTotal)} en total</li>
      <li>Rating promedio: ${m.ratingPromedio.toFixed(1)}★</li>
      <li>${fmtNum(m.visitasPerfil)} visitas a tu ficha de Google, ${fmtNum(m.llamadas)} llamadas</li>
    </ul>
  `;
  return enviarEmail({
    to: destino.emailNotificaciones,
    asunto: `Tu mes en MetricsField — ${cliente.nombre} (${fmtMes(m.mes)})`,
    html: layout(`Tu resumen de ${fmtMes(m.mes)}`, cuerpo, destino),
  });
}

module.exports = { alertarResenaMala, enviarResumenMensual };
