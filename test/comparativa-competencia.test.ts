import { describe, expect, it } from "vitest";
import { comparativaMensual, mesSiguiente, primerMesComparable } from "@/lib/comparativa-competencia";
import type { BenchmarkMes, MetricaMensual } from "@/lib/types";

function propio(mes: string, resenasNuevas: number, ratingPromedio: number, extra: Partial<MetricaMensual> = {}): MetricaMensual {
  return { mes, resenasNuevas, resenasTotal: 0, ratingPromedio, visitasPerfil: 0, llamadas: 0, clicsComoLlegar: 0, ...extra };
}

const benchmark: BenchmarkMes[] = [
  {
    mes: "2026-11",
    propioResenas: null,
    propioRating: null,
    competidores: [
      { id: 1, nombre: "Aero Yoga", rating: 4.9, totalResenas: 30 },
      { id: 2, nombre: "SB Yoga Shala", rating: 5.0, totalResenas: 45 },
      { id: 3, nombre: "Sin datos", rating: null, totalResenas: null },
    ],
  },
  {
    mes: "2026-10",
    propioResenas: null,
    propioRating: null,
    competidores: [
      { id: 1, nombre: "Aero Yoga Studio", rating: 5.0, totalResenas: 22 },
      { id: 2, nombre: "SB Yoga Shala", rating: 5.0, totalResenas: 41 },
      { id: 3, nombre: "Sin datos", rating: null, totalResenas: null },
    ],
  },
];

describe("comparativaMensual", () => {
  it("cuenta reseñas captadas en el mes y ordena de más a menos", () => {
    const [nov] = comparativaMensual(benchmark, [propio("2026-10", 3, 4.6), propio("2026-11", 6, 4.7)], "2026-11");
    expect(nov.mes).toBe("2026-11");
    expect(nov.enCurso).toBe(true);
    expect(nov.filas.map((f) => [f.nombre, f.nuevas])).toEqual([
      ["Aero Yoga", 8], // empareja por id aunque haya cambiado el nombre
      ["Vos", 6],
      ["SB Yoga Shala", 4],
    ]);
    expect(nov.puesto).toEqual({ puesto: 2, total: 3 });
    expect(nov.promedioCompetencia).toBe(6);
    expect(nov.ratingCompetencia).toBeCloseTo(4.95);
    const vos = nov.filas.find((f) => f.esPropio)!;
    expect(vos.deltaRating).toBeCloseTo(0.1);
    const aero = nov.filas.find((f) => f.id === 1)!;
    expect(aero.deltaRating).toBeCloseTo(-0.1);
  });

  it("saca las filas sin ningún dato", () => {
    const [nov] = comparativaMensual(benchmark, [], "2026-11");
    expect(nov.filas.some((f) => f.nombre === "Sin datos")).toBe(false);
    expect(nov.filas.some((f) => f.esPropio)).toBe(false);
    expect(nov.puesto).toBeNull();
  });

  it("un mes propio sin dato no cuenta como 0", () => {
    const [nov] = comparativaMensual(benchmark, [propio("2026-11", 0, 4.7, { nuevasSinDato: true })], "2026-12");
    const vos = nov.filas.find((f) => f.esPropio)!;
    expect(vos.nuevas).toBeNull();
    expect(nov.enCurso).toBe(false);
    expect(nov.puesto).toBeNull();
  });

  it("no compara meses salteados ni el primer mes", () => {
    const salteado: BenchmarkMes[] = [benchmark[0], { ...benchmark[1], mes: "2026-08" }];
    expect(comparativaMensual(salteado, [], "2026-11")).toEqual([]);
    expect(comparativaMensual([benchmark[1]], [], "2026-10")).toEqual([]);
  });
});

describe("primerMesComparable y mesSiguiente", () => {
  it("la primera comparativa es el mes siguiente a la primera foto", () => {
    expect(primerMesComparable([benchmark[1]])).toBe("2026-11");
    expect(primerMesComparable([])).toBeNull();
    expect(mesSiguiente("2026-12")).toBe("2027-01");
  });
});
