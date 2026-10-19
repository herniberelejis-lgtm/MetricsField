import "server-only";
import { metricaActual, metricaAnterior, type Cliente } from "./types";
import { sanearHistorico } from "./historico";
import { fmtMes, fmtNum, delta } from "./format";
import { enviarEmail } from "./email";
import { businessProfileHabilitado } from "./gbp";
import { resolverCuenta } from "./db/clientes";
import type { ResumenSemanal } from "./resumen-semanal";

// Alertas al dueño del comercio (no al equipo interno) cuando pasa algo que
// necesita su atención ya — hoy: una reseña de 3★ o menos. Sin email
// cargado en emailNotificaciones, no se manda nada — nunca se asume una
// dirección.

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

const ESTILO = `font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c2530;line-height:1.5;`;

// El link al portal sale SIEMPRE del código de la cuenta raíz (más
// ?sucursal= si el aviso es de una sucursal): el código propio de una
// sucursal no es credencial del portal y no debe circular por mail.
export async function linkPortalDe(cliente: Cliente, ancla = "resenas"): Promise<string | null> {
  const url = baseUrl();
  if (!url) return null;
  const cuenta = await resolverCuenta(cliente);
  const sucursal = cuenta.id === cliente.id ? "" : `?sucursal=${encodeURIComponent(cliente.id)}`;
  return `${url}/portal/${cuenta.codigoAcceso}${sucursal}${ancla ? `#${ancla}` : ""}`;
}

function layout(titulo: string, cuerpo: string, linkPortal: string | null): string {
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

function estrellasHtml(n: number): string {
  return `<span style="color:#f4b400;">${"★".repeat(n)}</span><span style="color:#dadce0;">${"★".repeat(5 - n)}</span>`;
}

// El autor y el texto de una reseña los escribe cualquiera en Google — hoy
// se cargan a mano (confiable), pero apenas se conecte la Reviews API van
// a venir de reseñadores reales sin ningún control. Escapar acá para que
// ese día no habilite HTML/enlaces armados dentro del mail al dueño.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function alertarResenaMala(
  cliente: Cliente,
  resena: { autor: string; estrellas: number; texto: string },
): Promise<void> {
  if (!cliente.emailNotificaciones) return;
  const cuerpo = `
    <p style="font-size:14px;">Te llegó una reseña de <strong>${escapeHtml(resena.autor)}</strong> en Google:</p>
    <p style="font-size:16px;">${estrellasHtml(resena.estrellas)}</p>
    <p style="font-size:14px;background:#f8f9fa;border-radius:10px;padding:12px 14px;">${escapeHtml(resena.texto) || "(sin comentario)"}</p>
  `;
  await enviarEmail({
    to: cliente.emailNotificaciones,
    asunto: `Nueva reseña de ${resena.estrellas}★ en ${cliente.nombre}`,
    html: layout("Nueva reseña que necesita tu respuesta", cuerpo, await linkPortalDe(cliente)),
  });
}

/** Resumen mensual empujado por mail — para que no dependa de que el dueño
 * se acuerde de entrar al portal. Usa la métrica del mes ya cargada
 * (mismos números que ve en "Métricas del mes"), no recalcula nada nuevo.
 * false si no hay métrica del mes o no tiene email cargado — no manda un
 * mail vacío. */
export async function enviarResumenMensual(cliente: Cliente): Promise<boolean> {
  if (!cliente.emailNotificaciones) return false;
  // Mismo histórico saneado que ve en el portal (lib/historico.ts).
  const saneado = { ...cliente, historico: sanearHistorico(cliente.historico) };
  const m = metricaActual(saneado);
  if (!m) return false;
  const prev = metricaAnterior(saneado);
  const dResenas =
    prev && !prev.nuevasSinDato && !m.nuevasSinDato ? delta(m.resenasNuevas, prev.resenasNuevas) : null;

  const filaDelta = (d: typeof dResenas) =>
    d && d.dir !== "flat" ? ` (${d.valor >= 0 ? "+" : ""}${d.valor} vs mes anterior)` : "";

  const cuerpo = `
    <p style="font-size:14px;">Así estuvo ${escapeHtml(cliente.nombre)} en ${fmtMes(m.mes)}:</p>
    <ul style="font-size:14px;padding-left:18px;">
      <li>${
        m.nuevasSinDato
          ? `${fmtNum(m.resenasTotal)} reseñas en total`
          : `${fmtNum(m.resenasNuevas)} reseñas nuevas${filaDelta(dResenas)} — ${fmtNum(m.resenasTotal)} en total`
      }</li>
      <li>Rating promedio: ${m.ratingPromedio.toFixed(1)}★</li>
      ${
        businessProfileHabilitado()
          ? `<li>${fmtNum(m.visitasPerfil)} visitas a tu ficha de Google, ${fmtNum(m.llamadas)} llamadas</li>`
          : ""
      }
    </ul>
  `;
  return enviarEmail({
    to: cliente.emailNotificaciones,
    asunto: `Tu mes en MetricsField — ${cliente.nombre} (${fmtMes(m.mes)})`,
    html: layout(`Tu resumen de ${fmtMes(m.mes)}`, cuerpo, await linkPortalDe(cliente)),
  });
}

/** "Tu semana en Google", cada lunes: los mismos números y conclusiones que
 * el portal (lib/resumen-semanal.ts). false si no tiene email cargado. */
export async function enviarResumenSemanal(cliente: Cliente, r: ResumenSemanal): Promise<boolean> {
  if (!cliente.emailNotificaciones) return false;
  return enviarEmail({ to: cliente.emailNotificaciones, ...(await mailResumenSemanal(cliente, r)) });
}

/** Asunto y HTML del resumen del lunes (lo usa también la prueba del admin). */
export async function mailResumenSemanal(cliente: Cliente, r: ResumenSemanal): Promise<{ asunto: string; html: string }> {
  const numeros = r.numeros
    .map(
      (n) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:22px;font-weight:800;vertical-align:baseline;">${escapeHtml(n.valor)}</td><td style="padding:6px 0;font-size:14px;color:#333;">${escapeHtml(n.label)}</td></tr>`,
    )
    .join("");
  const cuerpo = `
    ${numeros ? `<table style="border-collapse:collapse;margin:4px 0 8px;">${numeros}</table>` : ""}
    ${r.destacado ? `<p style="font-size:14px;font-weight:600;background:#E8F5EF;color:#0B5E40;border-radius:10px;padding:10px 12px;">${escapeHtml(r.destacado)}</p>` : ""}
    ${r.tarea ? `<p style="font-size:14px;background:#FFF4E5;color:#8A3F00;border-radius:10px;padding:10px 12px;"><strong>Para hacer:</strong> ${escapeHtml(r.tarea)}</p>` : ""}
  `;
  return {
    asunto: `Tu semana en Google — ${cliente.nombre}`,
    html: layout(`Tu semana en Google, ${escapeHtml(cliente.nombre)}`, cuerpo, await linkPortalDe(cliente, "")),
  };
}
