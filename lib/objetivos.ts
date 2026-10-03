// Cuentas para "Mi Rating en Google": a partir del rating y el total de
// reseñas que muestra Google (Places), qué tan cerca está el próximo
// escalón y cuánto pesa una mala reseña. Sale solo de datos reales — no
// necesita la API de reseñas.
//
// Google muestra el promedio redondeado a un decimal, y ese es el único
// dato que tenemos: el promedio exacto puede estar hasta 0,05 arriba o
// abajo. Por eso todo esto es aproximado y la UI lo dice.

/** Reseñas de 5★ seguidas (sin ninguna mala en el medio) que hacen falta
 * para que Google muestre la próxima décima. null si ya está en 5.0 o no
 * hay reseñas. */
export function resenasParaProximaDecima(
  rating: number,
  total: number,
): { objetivo: number; faltan: number } | null {
  if (total <= 0 || rating >= 4.95) return null;
  const objetivo = (Math.floor(rating * 10 + 1e-9) + 1) / 10;
  // Google redondea: para mostrar 4.9 alcanza un promedio de 4.85.
  const umbral = objetivo - 0.05;
  const faltan = Math.max(1, Math.ceil((total * (umbral - rating)) / (5 - umbral)));
  return { objetivo, faltan };
}

/** Cuántas reseñas de 5★ hacen falta para compensar UNA de 1★ y volver al
 * promedio actual. null si el promedio es 5 (no hay forma de compensar,
 * cualquier 1★ lo baja) o 1. */
export function cincoEstrellasPorCadaUna(rating: number): number | null {
  if (rating >= 5 || rating <= 1) return null;
  return Math.ceil((rating - 1) / (5 - rating));
}

/** Cómo quedaría el promedio después de una sola reseña de 1★. */
export function ratingDespuesDeUnaMala(rating: number, total: number): number {
  return (rating * total + 1) / (total + 1);
}
