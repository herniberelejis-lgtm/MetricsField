import type { Kpi, Tablero } from "./tablero";
import type { Seguimiento } from "./seguimiento-competencia";

// El informe del lunes para el dueño, por partes: cómo lo encontraron en
// Google, sus reseñas (y cuántas se respondieron), cómo le fue contra su
// competencia y qué hizo MetricsField en su local. Los números salen del
// mismo tablero de 7 días que ve en el portal (lib/tablero.ts), para que el
// mail y el portal nunca digan cosas distintas. Función pura.

export interface ResenaInforme {
  fecha: string; // 'YYYY-MM-DD'
  estrellas: number;
  deGoogle: boolean;
  respondida: boolean;
  automatica: boolean;
}

export interface EntradaInforme {
  /** Tablero armado con `dias: 7`. */
  tablero: Tablero;
  resenas: ResenaInforme[];
  /** Comparación contra la foto de la competencia del lunes anterior. */
  competencia: Seguimiento | null;
  competidoresCargados: number;
  /** false mientras Google no habilite visitas/llamadas (el portal también las oculta). */
  mostrarRendimientoGoogle: boolean;
  /** "Tu calificación: 4,6★, te faltan 21 de 5★ para el 4,7". */
  meta: string | null;
  hoy: Date;
}

export interface Indicador {
  valor: string;
  label: string;
  /** "12% más que la semana anterior", o null si no hay con qué comparar. */
  cambio: string | null;
  tono: "sube" | "baja" | "igual" | null;
  nota?: string;
}

export interface InformeSemanal {
  periodo: string;
  rendimiento: Indicador[];
  resenas: {
    nuevas: number;
    promedio: string | null;
    respondidas: number;
    automaticas: number;
    aMano: number;
    /** De esta semana, todavía sin responder. */
    pendientes: number;
    /** De 3★ o menos sin responder, de cualquier fecha: lo urgente. */
    pendientesMalas: number;
    meta: string | null;
  } | null;
  competencia:
    | { tipo: "tabla"; dias: number; filas: { nombre: string; esPropio: boolean; nuevas: number; rating: string | null }[]; lectura: string }
    | { tipo: "aviso"; texto: string }
    | null;
  enTuLocal: {
    toques: Indicador;
    /** Reseñas que llegaron después de un toque; null sin reseñas de Google para cruzar. */
    resenasDelCartel: number | null;
    piezas: { pieza: string; toques: number; rinde: string }[];
    lectura: string | null;
  } | null;
}

const DIA = 86_400_000;
const OFFSET_CORDOBA_MS = -3 * 3600_000;

function fechaCordoba(ms: number): string {
  return new Date(ms + OFFSET_CORDOBA_MS).toISOString().slice(0, 10);
}

export function fmt1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function indicador(k: Kpi): Indicador | null {
  if (k.valor === null) return null;
  const pct = k.delta ? Number(k.delta.texto.replace("%", "")) : NaN;
  const cambio =
    !k.delta
      ? null
      : k.delta.tono === "igual"
        ? "igual que la semana anterior"
        : k.delta.tono === "sube" && pct >= 200
          ? // Un "2100% más" contra una semana casi vacía asusta más de lo que informa.
            `más del ${pct >= 300 ? "triple" : "doble"} que la semana anterior`
          : `${k.delta.texto} ${k.delta.tono === "sube" ? "más" : "menos"} que la semana anterior`;
  return { valor: k.valor, label: k.label, cambio, tono: k.delta?.tono ?? null, nota: k.nota };
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** null si no hay nada que contar en ninguna parte. */
export function armarInformeSemanal(e: EntradaInforme): InformeSemanal | null {
  const kpi = (id: Kpi["id"]) => e.tablero.kpis.find((k) => k.id === id);

  // ---- cómo te encontraron en Google ----
  const rendimiento = e.mostrarRendimientoGoogle
    ? (["vistas", "llegar", "llamadas"] as const)
        .map((id) => kpi(id))
        .map((k) => (k ? indicador(k) : null))
        .filter((i): i is Indicador => i !== null)
    : [];

  // ---- reseñas ----
  const desde = fechaCordoba(e.hoy.getTime() - 6 * DIA);
  const deGoogle = e.resenas.filter((r) => r.deGoogle);
  let resenas: InformeSemanal["resenas"] = null;
  if (deGoogle.length > 0) {
    const semana = deGoogle.filter((r) => r.fecha >= desde);
    const respondidas = semana.filter((r) => r.respondida);
    const automaticas = respondidas.filter((r) => r.automatica).length;
    resenas = {
      nuevas: semana.length,
      promedio: semana.length ? fmt1(semana.reduce((a, r) => a + r.estrellas, 0) / semana.length) : null,
      respondidas: respondidas.length,
      automaticas,
      aMano: respondidas.length - automaticas,
      pendientes: semana.length - respondidas.length,
      pendientesMalas: deGoogle.filter((r) => !r.respondida && r.estrellas <= 3).length,
      meta: e.meta,
    };
  }

  // ---- vs. tu competencia ----
  let competencia: InformeSemanal["competencia"] = null;
  const filas = e.competencia?.filas.filter((f) => f.desde === e.competencia!.desde && f.nuevas !== null) ?? [];
  if (e.competencia && filas.length >= 2) {
    const propia = filas.find((f) => f.esPropio);
    const otros = filas.filter((f) => !f.esPropio);
    const promedio = otros.length ? otros.reduce((a, f) => a + (f.nuevas ?? 0), 0) / otros.length : 0;
    const dias = e.competencia.dias;
    const periodo = dias >= 6 && dias <= 8 ? "Esta semana" : `En los últimos ${dias} días`;
    let lectura = "";
    if (propia) {
      const puesto = e.competencia.puesto;
      lectura =
        `${periodo} sumaste ${plural(propia.nuevas ?? 0, "reseña", "reseñas")}; tu competencia, ${fmt1(promedio)} en promedio.` +
        (puesto ? ` Quedaste ${puesto.puesto}.º de ${puesto.total} en reseñas nuevas.` : "");
    }
    competencia = {
      tipo: "tabla",
      dias,
      filas: filas.map((f) => ({
        nombre: f.esPropio ? "Vos" : f.nombre,
        esPropio: f.esPropio,
        nuevas: f.nuevas ?? 0,
        rating: f.rating === null ? null : fmt1(f.rating),
      })),
      lectura,
    };
  } else if (e.competidoresCargados > 0) {
    competencia = {
      tipo: "aviso",
      texto: `Desde hoy medimos a ${plural(e.competidoresCargados, "competidor", "competidores")}: el lunes que viene te mostramos cuántas reseñas sumó cada uno contra vos.`,
    };
  } else {
    competencia = { tipo: "aviso", texto: "Cargá a tu competencia desde el portal y cada lunes te mostramos cómo te fue contra ellos." };
  }

  // ---- MetricsField en tu local ----
  let enTuLocal: InformeSemanal["enTuLocal"] = null;
  const kToques = kpi("toques");
  const toques = kToques ? indicador(kToques) : null;
  const piezas = e.tablero.piezas;
  const totalToques = piezas.reduce((a, p) => a + p.toques, 0);
  if (toques && totalToques > 0) {
    const sinCruce = piezas.some((p) => p.resenas === null);
    const resenasDelCartel = sinCruce ? null : piezas.reduce((a, p) => a + (p.resenas ?? 0), 0);
    let lectura: string | null = null;
    if (resenasDelCartel !== null && resenasDelCartel > 0) {
      const cada = Math.max(1, Math.round(totalToques / resenasDelCartel));
      lectura =
        cada === 1
          ? `Casi cada toque terminó en una reseña.`
          : `1 de cada ${cada} toques terminó en una reseña.`;
    } else if (resenasDelCartel === 0) {
      lectura = "Hubo toques pero ninguno terminó en reseña: probá pedirla en voz alta al cobrar, con el cartel a la vista.";
    }
    enTuLocal = {
      toques,
      resenasDelCartel,
      piezas: piezas.slice(0, 3).map((p) => ({ pieza: p.pieza, toques: p.toques, rinde: p.rinde })),
      lectura,
    };
  }

  if (rendimiento.length === 0 && !resenas && !enTuLocal && competencia?.tipo !== "tabla") return null;
  return { periodo: e.tablero.periodo, rendimiento, resenas, competencia, enTuLocal };
}

/** Líneas para WhatsApp (formato de WhatsApp: *negrita*). */
export function lineasWhatsAppInforme(i: InformeSemanal): string[] {
  const l: string[] = [];
  if (i.rendimiento.length) {
    l.push("", "*En Google*");
    for (const r of i.rendimiento) l.push(`• ${r.label}: *${r.valor}*${r.cambio ? ` (${r.cambio})` : ""}`);
  }
  if (i.resenas) {
    const r = i.resenas;
    l.push("", "*Reseñas*");
    l.push(`• *${r.nuevas}* nuevas${r.promedio ? `, ${r.promedio}★ de promedio` : ""}`);
    if (r.nuevas > 0)
      l.push(`• *${r.respondidas}* respondidas${r.automaticas ? ` (${r.automaticas} solas, ${r.aMano} a mano)` : ""}${r.pendientes ? `, ${r.pendientes} sin responder` : ""}`);
    if (r.pendientesMalas) l.push(`• ⚠️ ${plural(r.pendientesMalas, "reseña de 3★ o menos espera", "reseñas de 3★ o menos esperan")} tu respuesta`);
    if (r.meta) l.push(`• ${r.meta}`);
  }
  if (i.competencia?.tipo === "tabla") {
    l.push("", "*Vs. tu competencia*", i.competencia.lectura);
  }
  if (i.enTuLocal) {
    const t = i.enTuLocal;
    l.push("", "*MetricsField en tu local*");
    l.push(`• *${t.toques.valor}* toques al cartel${t.toques.cambio ? ` (${t.toques.cambio})` : ""}`);
    if (t.resenasDelCartel !== null) l.push(`• *${t.resenasDelCartel}* reseñas llegaron después de un toque`);
    if (t.lectura) l.push(`• ${t.lectura}`);
  }
  return l;
}
