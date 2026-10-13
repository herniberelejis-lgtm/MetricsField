import { describe, expect, it } from "vitest";
import { mapaSemanal, vistasMapaResenas } from "@/lib/semaforo";

// Mapa de calor día de la semana × hora (lib/semaforo.ts). Las fechas se
// guardan en UTC: lo que importa es que caigan en el día y la hora de Córdoba.

describe("mapaSemanal", () => {
  it("ubica cada reseña en su día de la semana y hora de Córdoba", () => {
    // Martes 2026-10-13 02:30 UTC = lunes 12/10 23:30 en Córdoba.
    const filas = mapaSemanal([{ estrellas: 5, fecha: "2026-10-13T02:30:00Z" }]);
    expect(filas.map((f) => f.etiqueta)).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
    expect(filas[0].horas[23]).toEqual({ rating: 5, cantidad: 1 });
    expect(filas[1].horas.every((c) => c.rating === null)).toBe(true);
  });

  it("promedia las reseñas de la misma franja y redondea", () => {
    const filas = mapaSemanal([
      { estrellas: 5, fecha: "2026-10-14T23:10:00Z" }, // mié 20:10
      { estrellas: 5, fecha: "2026-10-07T23:40:00Z" }, // mié 20:40 de otra semana
      { estrellas: 1, fecha: "2026-10-21T23:05:00Z" }, // mié 20:05
    ]);
    expect(filas[2].horas[20]).toEqual({ rating: 4, cantidad: 3 }); // 11/3 = 3,67 → 4
  });
});

describe("vistasMapaResenas", () => {
  const ahora = new Date("2026-10-20T15:00:00Z");

  it("'Este mes' usa el mes de Córdoba, no el de UTC", () => {
    const [mes] = vistasMapaResenas(
      [
        { estrellas: 5, fecha: "2026-10-01T02:00:00Z" }, // 30/09 23:00 en Córdoba: mes pasado
        { estrellas: 4, fecha: "2026-10-01T04:00:00Z" }, // 01/10 01:00 en Córdoba
      ],
      ahora,
    );
    expect(mes.clave).toBe("mes");
    expect(mes.total).toBe(1);
  });

  it("'Últimas 100' toma las 100 más nuevas aunque vengan desordenadas", () => {
    const resenas = Array.from({ length: 130 }, (_, i) => ({
      estrellas: i < 30 ? 1 : 5, // las 30 más viejas son de 1★
      fecha: new Date(Date.UTC(2026, 5, 1) + i * 86_400_000).toISOString(),
    })).reverse();
    const [, ultimas] = vistasMapaResenas(resenas, ahora);
    expect(ultimas.nombre).toBe("Últimas 100");
    expect(ultimas.total).toBe(100);
    const estrellas = ultimas.filas.flatMap((f) => f.horas).filter((c) => c.rating !== null);
    expect(estrellas.every((c) => c.rating === 5)).toBe(true);
  });

  it("con menos de 100 las muestra todas y lo dice", () => {
    const [, ultimas] = vistasMapaResenas([{ estrellas: 3, fecha: "2026-10-02T15:00:00Z" }], ahora);
    expect(ultimas.nombre).toBe("Todas (1)");
  });
});
