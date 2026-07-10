import "server-only";
import { metricaActual, metricaAnterior, type Cliente } from "./types";
import { fmtMes, fmtNum, delta } from "./format";
import { enviarEmail } from "./email";

// Alertas al dueño del comercio (no al equipo interno) cuando pasa algo que
// necesita su atención ya — hoy: una reseña de 3★ o menos, o una queja
// privada nueva. Sin email cargado en emailNotificaciones, no se manda
// nada — nunca se asume una dirección.

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

const ESTILO = `font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c2530;line-height:1.5;`;

function layout(titulo: string, cuerpo: string, cliente: Cliente): string {
  const url = baseUrl();
  const linkPortal = url ? `${url}/portal/${cliente.codigoAcceso}#resenas` : null;
  return `
    <div style="${ESTILO}max-width:480px;margin:0 auto;padding:24px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#2563eb;">Taply</div>
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

function estrellasHtml(n: number): string {
  return `<span style="color:#f4b400;">${"★".repeat(n)}</span><span style="color:#dadce0;">${"★".repeat(5 - n)}</span>`;
}

export async function alertarResenaMala(
  cliente: Cliente,
  resena: { autor: string; estrellas: number; texto: string },
): Promise<void> {
  if (!cliente.emailNotificaciones) return;
  const cuerpo = `
    <p style="font-size:14px;">Te llegó una reseña de <strong>${resena.autor}</strong> en Google:</p>
    <p style="font-size:16px;">${estrellasHtml(resena.estrellas)}</p>
    <p style="font-size:14px;background:#f8f9fa;border-radius:10px;padding:12px 14px;">${resena.texto || "(sin comentario)"}</p>
  `;
  await enviarEmail({
    to: cliente.emailNotificaciones,
    asunto: `Nueva reseña de ${resena.estrellas}★ en ${cliente.nombre}`,
    html: layout("Nueva reseña que necesita tu respuesta", cuerpo, cliente),
  });
}

export async function alertarFeedback(
  cliente: Cliente,
  feedback: { estrellas: number; texto: string },
): Promise<void> {
  if (!cliente.emailNotificaciones) return;
  const cuerpo = `
    <p style="font-size:14px;">Alguien dejó una queja privada en vez de publicarla en Google (${estrellasHtml(feedback.estrellas)}):</p>
    <p style="font-size:14px;background:#f8f9fa;border-radius:10px;padding:12px 14px;">${feedback.texto}</p>
    <p style="font-size:13px;color:#5f6b7a;">Es tu chance de resolverlo antes de que se haga público — nadie más lo vio todavía.</p>
  `;
  await enviarEmail({
    to: cliente.emailNotificaciones,
    asunto: `Queja privada nueva en ${cliente.nombre}`,
    html: layout("Feedback privado sin resolver", cuerpo, cliente),
  });
}

/** Resumen mensual empujado por mail — para que no dependa de que el dueño
 * se acuerde de entrar al portal. Usa la métrica del mes ya cargada
 * (mismos números que ve en "Métricas del mes"), no recalcula nada nuevo.
 * false si no hay métrica del mes o no tiene email cargado — no manda un
 * mail vacío. */
export async function enviarResumenMensual(cliente: Cliente): Promise<boolean> {
  if (!cliente.emailNotificaciones) return false;
  const m = metricaActual(cliente);
  if (!m) return false;
  const prev = metricaAnterior(cliente);
  const dResenas = prev ? delta(m.resenasNuevas, prev.resenasNuevas) : null;

  const filaDelta = (d: typeof dResenas) =>
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
    to: cliente.emailNotificaciones,
    asunto: `Tu mes en Taply — ${cliente.nombre} (${fmtMes(m.mes)})`,
    html: layout(`Tu resumen de ${fmtMes(m.mes)}`, cuerpo, cliente),
  });
}
