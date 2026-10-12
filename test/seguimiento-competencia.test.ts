import { describe, expect, it } from "vitest";
import { completarBase, seguimientoDesdeBase, type EstadoActual } from "@/lib/seguimiento-competencia";

const dia1: EstadoActual = {
  propio: { total: 5, rating: 5.0 },
  competidores: [
    { id: 1, nombre: "SB Yoga Shala", total: 41, rating: 5.0 },
    { id: 2, nombre: "Viarava Yoga", total: 52, rating: 5.0 },
    { id: 3, nombre: "Sin Place ID", total: null, rating: null },
  ],
};

describe("completarBase", () => {
  it("la primera vez guarda el punto de partida de todos los que tienen datos", () => {
    const { base, cambio } = completarBase(null, dia1, "2026-10-12");
    expect(cambio).toBe(true);
    expect(base.propio).toEqual({ total: 5, rating: 5.0, desde: "2026-10-12" });
    expect(Object.keys(base.competidores)).toEqual(["1", "2"]);
  });

  it("nunca mueve un punto ya guardado y suma a los nuevos con su propio día", () => {
    const { base } = completarBase(null, dia1, "2026-10-12");
    const despues: EstadoActual = {
      propio: { total: 9, rating: 4.9 },
      competidores: [...dia1.competidores, { id: 4, nombre: "Horayoá", total: 20, rating: 4.8 }],
    };
    const r = completarBase(base, despues, "2026-10-15");
    expect(r.cambio).toBe(true);
    expect(r.base.propio?.total).toBe(5);
    expect(r.base.competidores["1"].total).toBe(41);
    expect(r.base.competidores["4"]).toEqual({ total: 20, rating: 4.8, desde: "2026-10-15" });
    expect(completarBase(r.base, despues, "2026-10-16").cambio).toBe(false);
  });
});

describe("seguimientoDesdeBase", () => {
  it("cuenta reseñas captadas desde el punto de partida y arma el puesto", () => {
    const { base } = completarBase(null, dia1, "2026-10-12");
    const hoy: EstadoActual = {
      propio: { total: 11, rating: 5.0 },
      competidores: [
        { id: 1, nombre: "SB Yoga Shala", total: 49, rating: 4.9 },
        { id: 2, nombre: "Viarava Yoga", total: 54, rating: 5.0 },
      ],
    };
    const s = seguimientoDesdeBase(base, hoy, "2026-10-20")!;
    expect(s.dias).toBe(8);
    expect(s.filas.map((f) => [f.nombre, f.nuevas])).toEqual([
      ["SB Yoga Shala", 8],
      ["Vos", 6],
      ["Viarava Yoga", 2],
    ]);
    expect(s.puesto).toEqual({ puesto: 2, total: 3 });
    expect(s.promedioCompetencia).toBe(5);
    expect(s.filas.find((f) => f.id === 1)!.deltaRating).toBeCloseTo(-0.1);
  });

  it("un competidor que arrancó después no entra en el puesto ni en el promedio", () => {
    const { base: b1 } = completarBase(null, dia1, "2026-10-12");
    const conNuevo: EstadoActual = { ...dia1, competidores: [...dia1.competidores, { id: 4, nombre: "Horayoá", total: 20, rating: 4.8 }] };
    const { base } = completarBase(b1, conNuevo, "2026-10-15");
    const hoy: EstadoActual = {
      propio: { total: 6, rating: 5.0 },
      competidores: [
        { id: 1, nombre: "SB Yoga Shala", total: 41, rating: 5.0 },
        { id: 4, nombre: "Horayoá", total: 30, rating: 4.8 },
      ],
    };
    const s = seguimientoDesdeBase(base, hoy, "2026-10-20")!;
    expect(s.filas[0]).toMatchObject({ nombre: "Horayoá", nuevas: 10, desde: "2026-10-15" });
    expect(s.puesto).toEqual({ puesto: 1, total: 2 });
    expect(s.promedioCompetencia).toBe(0);
  });

  it("sin punto de partida propio no hay seguimiento", () => {
    expect(seguimientoDesdeBase({ propio: null, competidores: {} }, dia1, "2026-10-12")).toBeNull();
  });
});
