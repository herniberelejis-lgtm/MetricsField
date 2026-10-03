import type { ResenasPorHoraDia } from "@/lib/db/resenas";

// Semáforo de reseñas (buenas / medias / malas) y su versión por hora, a
// partir de una lista de reseñas con estrellas y fecha. Sirve para las dos
// fuentes que hay: las reseñas completas (API de reseñas o cargadas a mano)
// o, mientras tanto, las públicas que muestra Google en la ficha (Places).

const ZONA_HORARIA = "America/Argentina/Cordoba";

export interface ResenaParaSemaforo {
  estrellas: number;
  /** ISO; null si no se sabe cuándo se publicó. */
  fecha: string | null;
  /** Texto corto para mostrar ("hace 2 días"). */
  cuando: string;
}

export interface Semaforo {
  buenas: number; // 4–5★
  medias: number; // 3★
  malas: number; // 1–2★
  total: number;
}

export function contarSemaforo(resenas: { estrellas: number }[]): Semaforo {
  const buenas = resenas.filter((r) => r.estrellas >= 4).length;
  const medias = resenas.filter((r) => r.estrellas === 3).length;
  const malas = resenas.filter((r) => r.estrellas <= 2).length;
  return { buenas, medias, malas, total: buenas + medias + malas };
}

function partesCordoba(fecha: Date): { dia: string; hora: number } {
  const dia = fecha.toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
  const hora = Number(
    fecha.toLocaleTimeString("en-GB", { timeZone: ZONA_HORARIA, hour: "2-digit", hour12: false }).slice(0, 2),
  );
  return { dia, hora: hora % 24 };
}

/** Grilla día×hora de los últimos `dias` días (hora de Córdoba), con el
 * promedio de estrellas de las reseñas publicadas en cada hora — el mismo
 * formato que getResenasPorHoraSemana, para el mapa de calor en colores. */
export function grillaPorHora(
  resenas: ResenaParaSemaforo[],
  dias = 7,
  ahora: Date = new Date(),
): ResenasPorHoraDia[] {
  const fechas: string[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    fechas.push(partesCordoba(new Date(ahora.getTime() - i * 86_400_000)).dia);
  }
  const suma = new Map<string, { total: number; n: number }>();
  for (const r of resenas) {
    if (!r.fecha) continue;
    const { dia, hora } = partesCordoba(new Date(r.fecha));
    if (!fechas.includes(dia)) continue;
    const clave = `${dia}|${hora}`;
    const acc = suma.get(clave) ?? { total: 0, n: 0 };
    suma.set(clave, { total: acc.total + r.estrellas, n: acc.n + 1 });
  }
  return fechas.map((fecha) => ({
    fecha,
    horas: Array.from({ length: 24 }, (_, hora) => {
      const acc = suma.get(`${fecha}|${hora}`);
      if (!acc) return { rating: null, cantidad: 0 };
      const rating = Math.min(5, Math.max(1, Math.round(acc.total / acc.n))) as 1 | 2 | 3 | 4 | 5;
      return { rating, cantidad: acc.n };
    }),
  }));
}
