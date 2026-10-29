import "server-only";
import { sql } from "./sql";
import { enviarEmail } from "./email";
import { estadoDeLugar, type EstadoLugar } from "./places";
import { getAdmins, getAjustesConPrefijo, setAjuste } from "./db";
import { hayQueAvisar, leerRevision, siguienteRevision, TEXTO_ESTADO, type Revision } from "./revision-piezas-core";

// Revisión semanal de las piezas autogestionadas (corre con el cron de los
// lunes, app/api/cron/resumen-semanal): si la ficha de Google a la que
// apunta una pieza cerró o desapareció, la pieza manda a cada cliente a un
// lugar que no sirve y nadie se entera. Se mira el estado del lugar en
// Places (businessStatus) y se guarda en `ajustes` (clave estado_pieza:<id>),
// sin columnas nuevas. Se avisa una sola vez por problema: al equipo y, si
// tenemos cómo, a quien maneja la pieza.
// Solo piezas con lugar de Google elegido en la lista: un link pegado a mano
// no se puede revisar sin abrir la página de Google.

export const PREFIJO_ESTADO = "estado_pieza:";
const MAXIMO_POR_CORRIDA = 400;
const EN_PARALELO = 8;

interface PiezaARevisar {
  id: string;
  nombre: string;
  placeId: string;
  avisarA: string[];
}

async function piezasARevisar(): Promise<PiezaARevisar[]> {
  try {
    const rows = await sql`
      SELECT id, nombre_negocio, google_place_id, contacto_email, novedades_aceptadas_en, novedades_baja_en, duenio_email
      FROM links_nfc
      WHERE autogestionado = TRUE AND comercio_id IS NULL AND activo = TRUE
        AND google_place_id IS NOT NULL AND google_place_id <> ''
      ORDER BY id
      LIMIT ${MAXIMO_POR_CORRIDA}
    `;
    return rows.map((r) => {
      const avisarA = new Set<string>();
      if (r.duenio_email) avisarA.add(String(r.duenio_email).toLowerCase());
      // El contacto del aviso semanal solo si lo aceptó y no se dio de baja.
      if (r.contacto_email && r.novedades_aceptadas_en && !r.novedades_baja_en) avisarA.add(String(r.contacto_email).toLowerCase());
      return { id: r.id as string, nombre: (r.nombre_negocio as string) || "tu negocio", placeId: r.google_place_id as string, avisarA: [...avisarA] };
    });
  } catch (e) {
    // Sin las migraciones 019/020 no hay lugar guardado: nada que revisar.
    console.error("Revisión de piezas:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Estado guardado de cada pieza (para el admin y Mis piezas). */
export async function estadosDePiezas(): Promise<Map<string, Revision>> {
  const crudos = await getAjustesConPrefijo(PREFIJO_ESTADO);
  const m = new Map<string, Revision>();
  for (const [id, valor] of crudos) {
    const r = leerRevision(valor);
    if (r) m.set(id, r);
  }
  return m;
}

function base(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://app.metricsfield.com").replace(/\/+$/, "");
}

const ESTILO = "font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c2530;line-height:1.5;";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function mailDuenio(p: PiezaARevisar, estado: EstadoLugar): { asunto: string; html: string } {
  return {
    asunto: `Tu pieza de ${p.nombre} necesita que la revises`,
    html: `<div style="${ESTILO}max-width:480px;margin:0 auto;padding:24px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#2563eb;">MetricsField</div>
      <h1 style="font-size:17px;margin:8px 0 12px;">Tu pieza puede no estar funcionando</h1>
      <p style="font-size:14px;">Revisamos tu pieza de <strong>${esc(p.nombre)}</strong> y encontramos esto: <strong>${esc(TEXTO_ESTADO[estado])}</strong>.</p>
      <p style="font-size:14px;">Mientras siga así, quien la escanee puede no poder dejar su reseña. Si el negocio cambió de ficha o de dirección, cambiá a dónde lleva la pieza en un minuto desde Mis piezas.</p>
      <a href="${base()}/t/mis-piezas" style="display:inline-block;margin-top:14px;padding:10px 18px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">Abrir Mis piezas</a>
      <p style="font-size:12px;color:#5f6b7a;margin-top:18px;">Si ya lo sabías o el negocio cerró, podés ignorar este mail. Código de la pieza: ${esc(p.id)}.</p>
    </div>`,
  };
}

function mailEquipo(problemas: { p: PiezaARevisar; estado: EstadoLugar; avisado: boolean }[]): { asunto: string; html: string } {
  const filas = problemas
    .map(
      ({ p, estado, avisado }) =>
        `<tr><td style="padding:4px 8px;font-family:monospace;">${esc(p.id)}</td><td style="padding:4px 8px;">${esc(p.nombre)}</td><td style="padding:4px 8px;">${esc(TEXTO_ESTADO[estado])}</td><td style="padding:4px 8px;">${avisado ? "Avisado" : "Sin contacto"}</td></tr>`,
    )
    .join("");
  return {
    asunto: `${problemas.length === 1 ? "1 pieza" : `${problemas.length} piezas`} de Mercado Libre con la ficha de Google caída`,
    html: `<div style="${ESTILO}max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="font-size:17px;">Piezas autogestionadas que necesitan revisión</h1>
      <p style="font-size:14px;">La revisión semanal encontró fichas de Google cerradas o que ya no existen. Las que dicen "Sin contacto" no tienen a quién avisarle: si es un cliente conocido, escribile vos.</p>
      <table style="font-size:13px;border-collapse:collapse;">${filas}</table>
      <a href="${base()}/admin/hardware" style="display:inline-block;margin-top:14px;font-size:14px;">Ver en Admin → Hardware</a>
    </div>`,
  };
}

export async function revisarPiezasAutogestionadas(ahora = new Date()): Promise<{ revisadas: number; problemas: number; avisos: number }> {
  const piezas = await piezasARevisar();
  const anteriores = await estadosDePiezas();
  const nuevos: { p: PiezaARevisar; estado: EstadoLugar; avisado: boolean }[] = [];
  let revisadas = 0;
  let avisos = 0;

  for (let i = 0; i < piezas.length; i += EN_PARALELO) {
    const tanda = piezas.slice(i, i + EN_PARALELO);
    const estados = await Promise.all(tanda.map((p) => estadoDeLugar(p.placeId).catch(() => null)));
    for (let j = 0; j < tanda.length; j++) {
      const p = tanda[j];
      const estado = estados[j];
      if (!estado) continue; // no se pudo saber: se deja lo que había
      revisadas++;
      const anterior = anteriores.get(p.id) ?? null;
      await setAjuste(`${PREFIJO_ESTADO}${p.id}`, JSON.stringify(siguienteRevision(anterior, estado, ahora)));
      if (!hayQueAvisar(anterior, estado)) continue;
      let avisado = false;
      for (const email of p.avisarA) {
        if (await enviarEmail({ to: email, ...mailDuenio(p, estado) })) {
          avisado = true;
          avisos++;
        }
      }
      nuevos.push({ p, estado, avisado });
    }
  }

  if (nuevos.length > 0) {
    try {
      for (const a of await getAdmins()) await enviarEmail({ to: a.email, ...mailEquipo(nuevos) });
    } catch (e) {
      console.error("Revisión de piezas: aviso al equipo", e instanceof Error ? e.message : e);
    }
  }
  return { revisadas, problemas: nuevos.length, avisos };
}
