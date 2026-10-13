// Semáforo de reseñas (buenas / medias / malas) y mapa de calor por hora, a
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

function partesCordoba(fecha: Date): { dia: string; hora: number; diaSemana: number } {
  const dia = fecha.toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
  const hora = Number(
    fecha.toLocaleTimeString("en-GB", { timeZone: ZONA_HORARIA, hour: "2-digit", hour12: false }).slice(0, 2),
  );
  const corto = fecha.toLocaleDateString("en-US", { timeZone: ZONA_HORARIA, weekday: "short" });
  // 0 = lunes … 6 = domingo (la semana arranca el lunes, como en Argentina).
  const diaSemana = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(corto);
  return { dia, hora: hora % 24, diaSemana };
}

// ---------- Mapa de calor: día de la semana × hora ----------
// En vez de los últimos 7 días calendario (con pocas reseñas, una grilla
// casi vacía), junta un período más largo — las reseñas del mes o las
// últimas 100 — en una semana tipo: cada celda es "los martes a las 20 h",
// coloreada por el promedio de estrellas de lo que llegó en esa franja.
// Solo reseñas con hora exacta (las de Google sincronizadas o cargadas con
// hora): sin hora no hay casilla donde ponerlas.

export interface CeldaMapa {
  /** Promedio redondeado de estrellas; null si no llegó ninguna. */
  rating: 1 | 2 | 3 | 4 | 5 | null;
  cantidad: number;
}

export interface FilaMapa {
  /** "lun", "mar"… */
  etiqueta: string;
  horas: CeldaMapa[];
}

export interface VistaMapa {
  clave: "mes" | "ultimas";
  nombre: string;
  /** Cuántas reseñas entran en el mapa. */
  total: number;
  filas: FilaMapa[];
}

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function mapaSemanal(resenas: { estrellas: number; fecha: string | null }[]): FilaMapa[] {
  const suma = DIAS_SEMANA.map(() => Array.from({ length: 24 }, () => ({ total: 0, n: 0 })));
  for (const r of resenas) {
    if (!r.fecha) continue;
    const { diaSemana, hora } = partesCordoba(new Date(r.fecha));
    if (diaSemana < 0) continue;
    suma[diaSemana][hora].total += r.estrellas;
    suma[diaSemana][hora].n += 1;
  }
  return DIAS_SEMANA.map((etiqueta, d) => ({
    etiqueta,
    horas: suma[d].map(({ total, n }) => ({
      rating: n === 0 ? null : (Math.min(5, Math.max(1, Math.round(total / n))) as 1 | 2 | 3 | 4 | 5),
      cantidad: n,
    })),
  }));
}

/** Las dos vistas del mapa: las reseñas del mes en curso (hora de Córdoba)
 * y las últimas 100. `resenas` puede venir en cualquier orden. */
export function vistasMapaResenas(
  resenas: { estrellas: number; fecha: string | null }[],
  ahora: Date = new Date(),
): VistaMapa[] {
  const conHora = resenas
    .filter((r): r is { estrellas: number; fecha: string } => Boolean(r.fecha))
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const mesHoy = partesCordoba(ahora).dia.slice(0, 7);
  const delMes = conHora.filter((r) => partesCordoba(new Date(r.fecha)).dia.startsWith(mesHoy));
  const ultimas = conHora.slice(0, 100);
  return [
    { clave: "mes", nombre: "Este mes", total: delMes.length, filas: mapaSemanal(delMes) },
    {
      clave: "ultimas",
      nombre: ultimas.length === 100 ? "Últimas 100" : `Todas (${ultimas.length})`,
      total: ultimas.length,
      filas: mapaSemanal(ultimas),
    },
  ];
}
