import { terminosFrecuentes, type TerminoFrecuente } from "./keywords";
import type { ResenaCRM } from "./types";

// Google no expone qué reseña vino de qué tap — no hay forma de atribuir
// una reseña puntual a la tarjeta NFC personal de un empleado. Lo que sí
// se puede hacer, honesto: buscar el nombre del empleado en el TEXTO de
// las reseñas ("Juan me atendió genial") y armar una señal de menciones.
// No es el 100% de las reseñas — solo las que lo nombran — pero es señal
// real, no inventada. Los TAPS de su tarjeta, en cambio, sí son un dato
// 100% real y exacto (vienen de la tabla taps, contados por link) — mide
// uso/compromiso, no calidad de atención.

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface MencionEmpleado {
  nombre: string;
  /** Taps de su/s tarjeta/s NFC — exacto, real, sin proxy. */
  taps: number;
  /** Reseñas que nombran a este empleado en el texto — proxy, no atribución exacta. */
  menciones: number;
  ratingPromedio: number;
  ejemplos: { autor: string; estrellas: number; texto: string; fecha: string }[];
  /** Términos recurrentes sobre las reseñas de ≤3★ que lo mencionan — vacío si no hay suficiente texto. */
  quejasFrecuentes: TerminoFrecuente[];
}

export interface LinkEmpleado {
  nombreEmpleado: string;
  taps: number;
}

/** Une tarjetas NFC personales con las reseñas del local: taps reales por
 * empleado (sumados si tiene más de una tarjeta) + menciones de su primer
 * nombre en el texto de las reseñas (palabra completa, sin distinguir
 * mayúsculas ni acentos), con rating promedio de esas menciones y sus
 * quejas más repetidas. Incluye a todo empleado con al menos una tarjeta
 * asignada, tenga o no menciones todavía — ordenado por menciones (no es
 * un ranking: es el único orden que no depende de qué tan seguido lo
 * nombran, no de qué tan bien atiende). */
export function metricasPorEmpleado(
  resenas: ResenaCRM[],
  links: LinkEmpleado[],
): MencionEmpleado[] {
  const tapsPorNombre = new Map<string, number>();
  for (const l of links) {
    const nombre = l.nombreEmpleado.trim();
    if (!nombre) continue;
    tapsPorNombre.set(nombre, (tapsPorNombre.get(nombre) ?? 0) + l.taps);
  }

  return [...tapsPorNombre.entries()]
    .map(([nombre, taps]): MencionEmpleado => {
      const primerNombre = nombre.split(/\s+/)[0];
      const patron = new RegExp(`\\b${escaparRegex(normalizar(primerNombre))}\\b`, "i");
      const coincidentes = resenas.filter((r) => r.texto.trim() && patron.test(normalizar(r.texto)));
      const ratingPromedio =
        coincidentes.length > 0
          ? coincidentes.reduce((acc, r) => acc + r.estrellas, 0) / coincidentes.length
          : 0;
      const quejasFrecuentes = terminosFrecuentes(
        coincidentes.filter((r) => r.estrellas <= 3).map((r) => r.texto),
        { max: 4, minimo: 2 },
      );
      return {
        nombre,
        taps,
        menciones: coincidentes.length,
        ratingPromedio,
        ejemplos: coincidentes
          .slice(0, 3)
          .map((r) => ({ autor: r.autor, estrellas: r.estrellas, texto: r.texto, fecha: r.fecha })),
        quejasFrecuentes,
      };
    })
    .sort((a, b) => b.menciones - a.menciones || b.taps - a.taps);
}
