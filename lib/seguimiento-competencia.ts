import type { FilaComparativa } from "./comparativa-competencia";

// "Desde que los seguimos": la comparativa mes a mes necesita un mes entero
// cerrado de fotos de la competencia, así que un comercio con la
// competencia recién cargada esperaba hasta el mes siguiente para ver algo.
// Esto guarda el punto de partida de cada uno (reseñas totales y
// calificación) el primer día que se lo mira, y compara contra eso: "desde
// el 11/10 captaste 6 reseñas, tu competencia promedió 4". Se guarda como
// JSON en `ajustes` (sin cambio de esquema). Funciones puras: se testean
// sin base.

export interface PuntoPartida {
  total: number;
  rating: number | null;
  /** 'YYYY-MM-DD' del día en que se tomó. */
  desde: string;
}

export interface BaseSeguimiento {
  propio: PuntoPartida | null;
  /** Por id de competidor. */
  competidores: Record<string, PuntoPartida>;
}

export interface EstadoActual {
  propio: { total: number | null; rating: number | null };
  competidores: { id: number; nombre: string; total: number | null; rating: number | null }[];
}

/** Suma a la base lo que todavía no tiene punto de partida (el comercio o
 * un competidor agregado después). Nunca mueve un punto ya guardado.
 * `cambio` dice si hay que volver a guardarla. */
export function completarBase(
  base: BaseSeguimiento | null,
  actual: EstadoActual,
  hoy: string,
): { base: BaseSeguimiento; cambio: boolean } {
  const nueva: BaseSeguimiento = {
    propio: base?.propio ?? null,
    competidores: { ...(base?.competidores ?? {}) },
  };
  let cambio = base === null;
  if (!nueva.propio && actual.propio.total !== null) {
    nueva.propio = { total: actual.propio.total, rating: actual.propio.rating, desde: hoy };
    cambio = true;
  }
  for (const c of actual.competidores) {
    if (c.total === null || nueva.competidores[String(c.id)]) continue;
    nueva.competidores[String(c.id)] = { total: c.total, rating: c.rating, desde: hoy };
    cambio = true;
  }
  return { base: nueva, cambio };
}

export interface Seguimiento {
  /** Desde cuándo se sigue al comercio (el punto de partida propio). */
  desde: string;
  dias: number;
  filas: (FilaComparativa & { desde: string })[];
  puesto: { puesto: number; total: number } | null;
  promedioCompetencia: number | null;
  ratingCompetencia: number | null;
}

function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

function promedio(valores: number[]): number | null {
  return valores.length > 0 ? valores.reduce((acc, v) => acc + v, 0) / valores.length : null;
}

/** Reseñas captadas y cambio de calificación de cada uno desde su punto de
 * partida. null si el comercio todavía no tiene punto de partida. */
export function seguimientoDesdeBase(base: BaseSeguimiento, actual: EstadoActual, hoy: string): Seguimiento | null {
  if (!base.propio) return null;
  const filas: Seguimiento["filas"] = [];

  for (const c of actual.competidores) {
    const p = base.competidores[String(c.id)];
    if (!p || c.total === null) continue;
    filas.push({
      id: c.id,
      nombre: c.nombre,
      esPropio: false,
      nuevas: Math.max(0, c.total - p.total),
      rating: c.rating,
      deltaRating: c.rating !== null && p.rating !== null ? c.rating - p.rating : null,
      desde: p.desde,
    });
  }
  if (actual.propio.total !== null) {
    filas.push({
      id: "propio",
      nombre: "Vos",
      esPropio: true,
      nuevas: Math.max(0, actual.propio.total - base.propio.total),
      rating: actual.propio.rating,
      deltaRating:
        actual.propio.rating !== null && base.propio.rating !== null
          ? actual.propio.rating - base.propio.rating
          : null,
      desde: base.propio.desde,
    });
  }
  filas.sort((a, b) => (b.nuevas ?? 0) - (a.nuevas ?? 0));

  // El puesto y el promedio solo cuentan a quienes arrancaron el mismo día
  // que el comercio: si no, un competidor seguido hace 3 días se compararía
  // contra 20 días propios.
  const comparables = filas.filter((f) => f.desde === base.propio!.desde);
  const propia = comparables.find((f) => f.esPropio);
  const competencia = comparables.filter((f) => !f.esPropio);
  return {
    desde: base.propio.desde,
    dias: diasEntre(base.propio.desde, hoy),
    filas,
    puesto:
      propia && comparables.length > 1
        ? {
            puesto: comparables.filter((f) => (f.nuevas ?? 0) > (propia.nuevas ?? 0)).length + 1,
            total: comparables.length,
          }
        : null,
    promedioCompetencia: promedio(competencia.map((f) => f.nuevas ?? 0)),
    ratingCompetencia: promedio(competencia.flatMap((f) => (f.rating === null ? [] : [f.rating]))),
  };
}
