import type { MetricaMensual } from "./types";

// Saneado del histórico mensual para lo que ve el cliente. El total de
// reseñas de un mes sale de Google (Places) y es confiable, salvo cuando un
// sync leyó otra ficha (place_id mal cargado, mientras se corregía): ese mes
// queda con un total imposible y arrastra a los vecinos. Caso real, La Gran
// Feria: jul 1399 → ago 13 → sep 1423. Agosto ensuciaba la tabla y el
// gráfico de calificación, y septiembre quedó con "0 reseñas nuevas"
// porque el salto 13→1423 se tomó como corrección de base — así el
// promedio daba ~7 por mes y "A tu ritmo" decía "+2 años".
//
// No toca la base: el panel de admin sigue viendo el dato crudo (y puede
// borrar el mes malo); esto solo decide qué se le muestra al cliente.

/** Mismo tope que el sync (lib/db/google-sync.ts): un salto mayor en un mes
 * no son reseñas nuevas, es una corrección de base. */
const MAX_RESENAS_NUEVAS_MES = 150;

/** Bajada del total que se tolera como real (Google borra alguna reseña). */
function tolerancia(total: number): number {
  return Math.max(10, Math.round(total * 0.02));
}

/**
 * Devuelve el histórico sin los meses con un total imposible (una caída
 * fuerte que después se recupera) y con las reseñas nuevas recalculadas
 * donde ese mes las había arruinado. Marca `nuevasSinDato` donde el número
 * de reseñas nuevas no se conoce (el primer mes medido, o un salto de
 * corrección de base): esos meses no cuentan para promedios ni
 * comparaciones.
 */
export function sanearHistorico(historico: MetricaMensual[]): MetricaMensual[] {
  const salida: MetricaMensual[] = [];
  let ultimoTotal: number | null = null;
  let anteriorDescartado = false;

  historico.forEach((h, i) => {
    // Sin total (carga manual vieja): se deja como está y no mueve la base.
    if (!(h.resenasTotal > 0)) {
      salida.push({ ...h });
      return;
    }

    if (ultimoTotal === null) {
      ultimoTotal = h.resenasTotal;
      // El primer mes medido por el sync siempre guarda 0 (no tiene contra
      // qué comparar): no es un dato.
      salida.push(h.resenasNuevas === 0 ? { ...h, nuevasSinDato: true } : { ...h });
      return;
    }

    const base: number = ultimoTotal;
    const diferencia = h.resenasTotal - base;

    // Caída fuerte del total que más adelante se recupera: el mes leyó otra
    // ficha. Si no se recupera nunca, es la ficha correcta nueva y se acepta.
    if (diferencia < -tolerancia(base)) {
      const serecupera = historico
        .slice(i + 1)
        .some((x) => x.resenasTotal > 0 && x.resenasTotal >= base - tolerancia(base));
      if (serecupera) {
        anteriorDescartado = true;
        return;
      }
    }

    ultimoTotal = h.resenasTotal;
    const plausible = diferencia >= -tolerancia(base) && diferencia <= MAX_RESENAS_NUEVAS_MES;
    if (plausible && (anteriorDescartado || (h.resenasNuevas === 0 && diferencia > 0))) {
      salida.push({ ...h, resenasNuevas: Math.max(0, diferencia) });
    } else if (!plausible && h.resenasNuevas === 0) {
      salida.push({ ...h, nuevasSinDato: true });
    } else {
      salida.push({ ...h });
    }
    anteriorDescartado = false;
  });

  return salida;
}

/** Promedio de reseñas nuevas por mes sobre los meses COMPLETOS con dato
 * (sin el mes en curso, que todavía no terminó, ni los `nuevasSinDato`).
 * null si no hay ninguno. */
export function ritmoMensual(
  historico: MetricaMensual[],
  mesEnCurso: string,
): { promedio: number; meses: number } | null {
  const validos = historico.filter((h) => !h.nuevasSinDato && h.mes !== mesEnCurso);
  if (validos.length === 0) return null;
  const promedio = validos.reduce((acc, h) => acc + h.resenasNuevas, 0) / validos.length;
  return { promedio, meses: validos.length };
}
