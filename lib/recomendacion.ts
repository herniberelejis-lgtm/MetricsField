import type { Cliente, MetricaMensual } from "./types";
import { citasIA } from "./types";

// Genera una recomendación concreta para el mes siguiente en base a la
// evolución del cliente. Es determinística (misma entrada → misma salida)
// y refleja las palancas del proyecto (reseñas, GBP, GEO/IA, schema).

export function recomendacionDelMes(
  c: Cliente,
  actual?: MetricaMensual,
  previa?: MetricaMensual,
  hoy: Date = new Date(),
): string | null {
  if (!actual) return null;

  // Si `actual` es el mes en curso, todavía no terminó: comparar sus reseñas
  // tal cual contra un mes completo daba "cayó el ritmo" casi todos los
  // principios de mes. Se proyecta al mes completo según los días que van.
  const mesHoy = hoy.toISOString().slice(0, 7);
  let resenasDelMes = actual.resenasNuevas;
  if (actual.mes === mesHoy) {
    const dia = hoy.getUTCDate();
    const diasDelMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0)).getUTCDate();
    // Los primeros días la proyección no dice nada: no se compara.
    resenasDelMes = dia >= 7 ? (actual.resenasNuevas / dia) * diasDelMes : Number.NaN;
  }
  const resenasBajaron =
    previa !== undefined && Number.isFinite(resenasDelMes) && resenasDelMes < previa.resenasNuevas * 0.8;
  const ratingBajo = actual.ratingPromedio < 4.5;
  // Solo si alguna vez se midió IA (el equipo carga las citaciones a mano):
  // "no aparecés en IA" sin haberlo medido sería inventado.
  const midioIA = c.historico.some((h) => citasIA(h) > 0);
  const sinIA = c.plan === "Premium" && midioIA && citasIA(actual) === 0;

  if (ratingBajo) {
    return `Tu calificación está en ${actual.ratingPromedio.toFixed(1)}★, por debajo de 4.5. Respondé las reseñas negativas (en la pestaña Reseñas tenés la respuesta sugerida) y que cada cliente contento toque el cartel antes de irse.`;
  }
  if (resenasBajaron) {
    return "Vienen entrando menos reseñas que el mes pasado. Recordale al equipo ofrecer el cartel al cobrar y ponelo donde el cliente espera (mostrador, mesas, caja).";
  }
  if (sinIA) {
    return "Este mes no registramos recomendaciones tuyas en ChatGPT, Copilot ni Perplexity. Estamos sumando contenido para que vuelvas a aparecer.";
  }
  if (c.plan === "Base") {
    return "Buen mes de reseñas y calificación. El próximo paso es aparecer cuando alguien le pregunta a ChatGPT o Copilot por tu rubro: consultanos por el plan Premium.";
  }
  return "Buen mes en reseñas y en IA. Mantené el ritmo: que todo el equipo ofrezca el cartel al cobrar.";
}
