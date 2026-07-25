import type { ResenaCRM } from "./types";

// Google no expone qué reseña vino de qué tap — no hay forma de atribuir
// una reseña puntual a la tarjeta NFC personal de un empleado. Lo que sí
// se puede hacer, honesto: buscar el nombre del empleado en el TEXTO de
// las reseñas ("Juan me atendió genial") y armar una señal de menciones.
// No es el 100% de las reseñas — solo las que lo nombran — pero es señal
// real, no inventada.

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface MencionEmpleado {
  nombre: string;
  menciones: number;
  ratingPromedio: number;
  ejemplos: { autor: string; estrellas: number; texto: string; fecha: string }[];
}

/** Para cada nombre de empleado (de sus tarjetas NFC), busca menciones de
 * su primer nombre en el texto de las reseñas — palabra completa, sin
 * distinguir mayúsculas ni acentos. Devuelve solo empleados con al menos
 * una mención, ordenados de más a menos mencionados. */
export function mencionesPorEmpleado(
  resenas: ResenaCRM[],
  nombresEmpleados: string[],
): MencionEmpleado[] {
  const nombresUnicos = [...new Set(nombresEmpleados.map((n) => n.trim()).filter(Boolean))];

  return nombresUnicos
    .map((nombre): MencionEmpleado => {
      const primerNombre = nombre.split(/\s+/)[0];
      const patron = new RegExp(`\\b${escaparRegex(normalizar(primerNombre))}\\b`, "i");
      const coincidentes = resenas.filter((r) => r.texto.trim() && patron.test(normalizar(r.texto)));
      const ratingPromedio =
        coincidentes.length > 0
          ? coincidentes.reduce((acc, r) => acc + r.estrellas, 0) / coincidentes.length
          : 0;
      return {
        nombre,
        menciones: coincidentes.length,
        ratingPromedio,
        ejemplos: coincidentes
          .slice(0, 3)
          .map((r) => ({ autor: r.autor, estrellas: r.estrellas, texto: r.texto, fecha: r.fecha })),
      };
    })
    .filter((m) => m.menciones > 0)
    .sort((a, b) => b.menciones - a.menciones);
}
