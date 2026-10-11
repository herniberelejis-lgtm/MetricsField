import type { BenchmarkMes, MetricaMensual } from "./types";

// Comparativa mes a mes contra la competencia: cuántas reseñas captó cada
// uno EN el mes (no el total acumulado, que siempre favorece al más viejo)
// y cómo cerró su calificación. Sale de las fotos mensuales que congela el
// cron (competidores_snapshots) y del histórico propio ya saneado
// (lib/historico.ts). Funciones puras: se testean sin base.

export interface FilaComparativa {
  /** "propio" para el comercio; el id del competidor para el resto. */
  id: "propio" | number;
  nombre: string;
  esPropio: boolean;
  /** Reseñas nuevas en el mes; null si no se puede saber. */
  nuevas: number | null;
  /** Calificación al cierre del mes (o a hoy, si el mes está en curso). */
  rating: number | null;
  /** Cambio de calificación contra el mes anterior. */
  deltaRating: number | null;
}

export interface ComparativaMes {
  mes: string; // 'YYYY-MM'
  enCurso: boolean;
  /** Ordenadas por reseñas captadas, de más a menos. */
  filas: FilaComparativa[];
  /** Puesto del comercio en captación de reseñas (1 = el que más captó). */
  puesto: { puesto: number; total: number } | null;
  /** Promedio de reseñas captadas por la competencia ese mes. */
  promedioCompetencia: number | null;
  /** Calificación promedio de la competencia al cierre del mes. */
  ratingCompetencia: number | null;
}

/** 'YYYY-MM' del mes siguiente. */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

function promedio(valores: number[]): number | null {
  return valores.length > 0 ? valores.reduce((acc, v) => acc + v, 0) / valores.length : null;
}

/**
 * Una comparativa por cada mes que tenga la foto del mes anterior (sin ella
 * no hay forma de saber cuántas captó la competencia). `benchmark` viene del
 * más nuevo al más viejo (getBenchmarkMensual); el resultado, también.
 */
export function comparativaMensual(
  benchmark: BenchmarkMes[],
  historico: MetricaMensual[],
  mesEnCurso: string,
): ComparativaMes[] {
  const propioPorMes = new Map(historico.map((h) => [h.mes, h]));
  const salida: ComparativaMes[] = [];

  for (let i = 0; i < benchmark.length - 1; i++) {
    const actual = benchmark[i];
    const anterior = benchmark[i + 1];
    // Solo meses consecutivos: si el cron no corrió un mes entero, la resta
    // juntaría dos meses y no sería "captadas en el mes".
    if (mesSiguiente(anterior.mes) !== actual.mes) continue;

    const previoPorId = new Map(anterior.competidores.map((c) => [c.id, c]));
    const filas: FilaComparativa[] = actual.competidores.map((c) => {
      const prev = previoPorId.get(c.id);
      const nuevas =
        c.totalResenas !== null && prev?.totalResenas !== null && prev?.totalResenas !== undefined
          ? Math.max(0, c.totalResenas - prev.totalResenas)
          : null;
      const deltaRating =
        c.rating !== null && prev?.rating !== null && prev?.rating !== undefined ? c.rating - prev.rating : null;
      return { id: c.id, nombre: c.nombre, esPropio: false, nuevas, rating: c.rating, deltaRating };
    });

    const propio = propioPorMes.get(actual.mes);
    const propioPrevio = propioPorMes.get(anterior.mes);
    filas.push({
      id: "propio",
      nombre: "Vos",
      esPropio: true,
      nuevas: propio && !propio.nuevasSinDato ? propio.resenasNuevas : null,
      rating: propio ? propio.ratingPromedio : null,
      deltaRating: propio && propioPrevio ? propio.ratingPromedio - propioPrevio.ratingPromedio : null,
    });

    // Sin dato de captación ni de calificación, una fila no aporta nada.
    const conDato = filas.filter((f) => f.nuevas !== null || f.rating !== null);
    conDato.sort((a, b) => (b.nuevas ?? -1) - (a.nuevas ?? -1));

    const filaPropia = conDato.find((f) => f.esPropio);
    const conCaptacion = conDato.filter((f) => f.nuevas !== null);
    const puesto =
      filaPropia && filaPropia.nuevas !== null && conCaptacion.length > 1
        ? {
            puesto: conCaptacion.filter((f) => (f.nuevas ?? 0) > (filaPropia.nuevas ?? 0)).length + 1,
            total: conCaptacion.length,
          }
        : null;

    const competencia = conDato.filter((f) => !f.esPropio);
    salida.push({
      mes: actual.mes,
      enCurso: actual.mes === mesEnCurso,
      filas: conDato,
      puesto,
      promedioCompetencia: promedio(competencia.flatMap((f) => (f.nuevas === null ? [] : [f.nuevas]))),
      ratingCompetencia: promedio(competencia.flatMap((f) => (f.rating === null ? [] : [f.rating]))),
    });
  }

  return salida;
}

/** Desde qué mes va a haber comparativa, si todavía no hay ninguna: el mes
 * siguiente a la primera foto de la competencia. null si no hay fotos. */
export function primerMesComparable(benchmark: BenchmarkMes[]): string | null {
  if (benchmark.length === 0) return null;
  const masViejo = benchmark[benchmark.length - 1].mes;
  return mesSiguiente(masViejo);
}
