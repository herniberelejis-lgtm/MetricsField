import "server-only";
import { metricaActual, metricaAnterior, type Cliente } from "./types";
import { sanearHistorico } from "./historico";
import { fmtMes, fmtNum, delta } from "./format";
import { enviarEmail } from "./email";
import { businessProfileHabilitado } from "./gbp";
import { resolverCuenta } from "./db/clientes";
import type { ResumenSemanal } from "./resumen-semanal";
import type { Indicador, InformeSemanal } from "./informe-semanal";

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

/** Google rechazó una respuesta que la automática había publicado: la
 * automática ya quedó apagada (lib/db/google-sync.ts) y se le avisa al
 * dueño para que responda esas a mano y decida si la vuelve a prender. */
export async function alertarRespuestaRechazada(cliente: Cliente, cantidad: number): Promise<void> {
  if (!cliente.emailNotificaciones) return;
  const cuerpo = `
    <p style="font-size:14px;">Google no publicó ${cantidad === 1 ? "una respuesta" : `${cantidad} respuestas`} a reseñas de ${escapeHtml(cliente.nombre)}: las revisa antes de mostrarlas y ${cantidad === 1 ? "esa no pasó" : "esas no pasaron"} su control.</p>
    <p style="font-size:14px;">Por las dudas, <strong>pausamos las respuestas automáticas</strong>. ${cantidad === 1 ? "La reseña volvió" : "Las reseñas volvieron"} a tu lista para que ${cantidad === 1 ? "la respondas" : "las respondas"} a mano. Cuando quieras, podés volver a prenderlas desde tu portal.</p>
  `;
  await enviarEmail({
    to: cliente.emailNotificaciones,
    asunto: `Pausamos las respuestas automáticas de ${cliente.nombre}`,
    html: layout("Google no publicó una respuesta", cuerpo, await linkPortalDe(cliente)),
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

const COLOR_TONO = { sube: "#0B5E40", baja: "#8A3F00", igual: "#5f6368" } as const;

function seccion(titulo: string, contenido: string): string {
  return `
    <div style="margin-top:20px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5f6368;margin-bottom:6px;">${titulo}</div>
      ${contenido}
    </div>`;
}

function filaNumero(valor: string, label: string, detalle: string | null, tono: Indicador["tono"] = null): string {
  const color = tono ? COLOR_TONO[tono] : "#5f6368";
  return `<tr>
    <td style="padding:5px 12px 5px 0;font-size:20px;font-weight:800;vertical-align:top;white-space:nowrap;">${escapeHtml(valor)}</td>
    <td style="padding:6px 0;font-size:14px;color:#333;vertical-align:top;">${escapeHtml(label)}${
      detalle ? `<br><span style="font-size:12px;color:${color};">${escapeHtml(detalle)}</span>` : ""
    }</td>
  </tr>`;
}

function tabla(filas: string): string {
  return `<table style="border-collapse:collapse;">${filas}</table>`;
}

function aviso(texto: string, fondo: string, color: string): string {
  return `<p style="font-size:14px;background:${fondo};color:${color};border-radius:10px;padding:10px 12px;margin:8px 0 0;">${texto}</p>`;
}

function htmlInforme(i: InformeSemanal): string {
  const partes: string[] = [];

  if (i.rendimiento.length) {
    // Google publica con 2 o 3 días de demora: la aclaración va una sola vez.
    const nota = i.rendimiento.find((r) => r.nota)?.nota;
    partes.push(
      seccion(
        "Cómo te encontraron en Google",
        tabla(i.rendimiento.map((r) => filaNumero(r.valor, r.label, r.cambio, r.tono)).join("")) +
          (nota ? `<p style="font-size:12px;color:#5f6368;margin:4px 0 0;">${escapeHtml(nota)}.</p>` : ""),
      ),
    );
  }

  if (i.resenas) {
    const r = i.resenas;
    const filas = [
      filaNumero(String(r.nuevas), r.nuevas === 1 ? "reseña nueva" : "reseñas nuevas", r.promedio ? `${r.promedio}★ de promedio` : null),
    ];
    if (r.nuevas > 0) {
      filas.push(
        filaNumero(
          String(r.respondidas),
          r.respondidas === 1 ? "respondida" : "respondidas",
          [
            r.automaticas ? `${r.automaticas} se respondieron solas` : null,
            r.aMano ? `${r.aMano} a mano` : null,
            r.pendientes ? `${r.pendientes} sin responder` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        ),
      );
    }
    let contenido = tabla(filas.join(""));
    if (r.pendientesMalas) {
      contenido += aviso(
        `<strong>${r.pendientesMalas === 1 ? "Una reseña de 3★ o menos espera" : `${r.pendientesMalas} reseñas de 3★ o menos esperan`} tu respuesta.</strong> Responder rápido y sin discutir es lo que más cuida tu calificación.`,
        "#FFF4E5",
        "#8A3F00",
      );
    }
    if (r.meta) contenido += `<p style="font-size:13px;color:#333;margin:8px 0 0;">${escapeHtml(r.meta)}</p>`;
    partes.push(seccion("Tus reseñas", contenido));
  }

  if (i.competencia?.tipo === "tabla") {
    const filas = i.competencia.filas
      .map(
        (f) => `<tr>
          <td style="padding:5px 12px 5px 0;font-size:14px;${f.esPropio ? "font-weight:800;" : "color:#333;"}">${escapeHtml(f.nombre)}</td>
          <td style="padding:5px 12px 5px 0;font-size:14px;text-align:right;${f.esPropio ? "font-weight:800;" : ""}">+${f.nuevas}</td>
          <td style="padding:5px 0;font-size:13px;color:#5f6368;text-align:right;">${f.rating ? `${f.rating}★` : ""}</td>
        </tr>`,
      )
      .join("");
    partes.push(
      seccion(
        "Vs. tu competencia",
        `<p style="font-size:14px;margin:0 0 6px;">${escapeHtml(i.competencia.lectura)}</p>
         <table style="border-collapse:collapse;min-width:260px;">
           <tr><td style="font-size:11px;color:#5f6368;padding-bottom:2px;"></td><td style="font-size:11px;color:#5f6368;text-align:right;padding:0 12px 2px 0;">reseñas</td><td style="font-size:11px;color:#5f6368;text-align:right;padding-bottom:2px;">calif.</td></tr>
           ${filas}
         </table>`,
      ),
    );
  } else if (i.competencia?.tipo === "aviso") {
    partes.push(seccion("Vs. tu competencia", `<p style="font-size:14px;color:#333;margin:0;">${escapeHtml(i.competencia.texto)}</p>`));
  }

  if (i.enTuLocal) {
    const t = i.enTuLocal;
    const filas = [filaNumero(t.toques.valor, "toques al cartel", t.toques.cambio, t.toques.tono)];
    if (t.resenasDelCartel !== null) {
      filas.push(filaNumero(String(t.resenasDelCartel), t.resenasDelCartel === 1 ? "reseña llegó después de un toque" : "reseñas llegaron después de un toque", null));
    }
    let contenido = tabla(filas.join(""));
    if (t.lectura) contenido += `<p style="font-size:14px;color:#333;margin:6px 0 0;">${escapeHtml(t.lectura)}</p>`;
    if (t.piezas.length > 1) {
      contenido += `<p style="font-size:13px;color:#5f6368;margin:8px 0 0;">${t.piezas
        .map((p) => `${escapeHtml(p.pieza)}: ${p.toques} ${p.toques === 1 ? "toque" : "toques"}${p.rinde !== "—" ? ` (${escapeHtml(p.rinde)})` : ""}`)
        .join("<br>")}</p>`;
    }
    partes.push(seccion("MetricsField en tu local", contenido));
  }

  return partes.join("");
}

/** Asunto y HTML del resumen del lunes (lo usa también la prueba del admin). */
export async function mailResumenSemanal(cliente: Cliente, r: ResumenSemanal): Promise<{ asunto: string; html: string }> {
  const numeros = r.numeros
    .map(
      (n) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:22px;font-weight:800;vertical-align:baseline;">${escapeHtml(n.valor)}</td><td style="padding:6px 0;font-size:14px;color:#333;">${escapeHtml(n.label)}</td></tr>`,
    )
    .join("");
  // Con informe, los números van por sección; sin él (sin datos suficientes
  // para armarlo), los tres números de siempre.
  const cuerpo = `
    ${r.informe ? `<p style="font-size:13px;color:#5f6368;margin:0;">${escapeHtml(r.informe.periodo)}</p>${htmlInforme(r.informe)}` : numeros ? `<table style="border-collapse:collapse;margin:4px 0 8px;">${numeros}</table>` : ""}
    ${r.destacado ? `<p style="font-size:14px;font-weight:600;background:#E8F5EF;color:#0B5E40;border-radius:10px;padding:10px 12px;margin-top:20px;">${escapeHtml(r.destacado)}</p>` : ""}
    ${r.tarea ? `<p style="font-size:14px;background:#FFF4E5;color:#8A3F00;border-radius:10px;padding:10px 12px;"><strong>Para hacer esta semana:</strong> ${escapeHtml(r.tarea)}</p>` : ""}
  `;
  return {
    asunto: `Tu semana en Google — ${cliente.nombre}`,
    html: layout(`Tu semana en Google, ${escapeHtml(cliente.nombre)}`, cuerpo, await linkPortalDe(cliente, "")),
  };
}
