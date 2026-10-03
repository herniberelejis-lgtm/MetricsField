import { describe, expect, it } from "vitest";
import { ritmoMensual, sanearHistorico } from "@/lib/historico";
import type { MetricaMensual } from "@/lib/types";

function mes(mes: string, resenasNuevas: number, resenasTotal: number, ratingPromedio = 4.8): MetricaMensual {
  return { mes, resenasNuevas, resenasTotal, ratingPromedio, visitasPerfil: 0, llamadas: 0, clicsComoLlegar: 0 };
}

describe("sanearHistorico", () => {
  it("caso La Gran Feria: saca el mes que leyó otra ficha y recalcula el siguiente", () => {
    const h = sanearHistorico([
      mes("2026-07", 0, 1399),
      mes("2026-08", 0, 13, 4.2),
      mes("2026-09", 0, 1423),
      mes("2026-10", 27, 1450),
    ]);
    expect(h.map((x) => x.mes)).toEqual(["2026-07", "2026-09", "2026-10"]);
    expect(h[0].nuevasSinDato).toBe(true);
    expect(h[1].resenasNuevas).toBe(24);
    expect(h[1].nuevasSinDato).toBeUndefined();
    expect(h[2].resenasNuevas).toBe(27);
    expect(ritmoMensual(h, "2026-10")).toEqual({ promedio: 24, meses: 1 });
  });

  it("no toca un histórico sano", () => {
    const entrada = [mes("2026-07", 5, 100), mes("2026-08", 12, 112), mes("2026-09", 8, 120)];
    const h = sanearHistorico(entrada);
    expect(h.map((x) => x.resenasNuevas)).toEqual([5, 12, 8]);
    expect(h.some((x) => x.nuevasSinDato)).toBe(false);
  });

  it("una caída que no se recupera es la ficha correcta nueva: se acepta", () => {
    const h = sanearHistorico([mes("2026-07", 0, 900), mes("2026-08", 0, 40), mes("2026-09", 6, 46)]);
    expect(h.map((x) => x.mes)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(h[1].nuevasSinDato).toBe(true);
    expect(h[2].resenasNuevas).toBe(6);
  });

  it("tolera que Google borre alguna reseña", () => {
    const h = sanearHistorico([mes("2026-07", 3, 500), mes("2026-08", 0, 495), mes("2026-09", 7, 502)]);
    expect(h).toHaveLength(3);
    expect(h[1].resenasNuevas).toBe(0);
    expect(h[1].nuevasSinDato).toBeUndefined();
  });

  it("un salto de corrección de base guardado en 0 queda sin dato", () => {
    const h = sanearHistorico([mes("2026-07", 0, 13), mes("2026-08", 0, 1400), mes("2026-09", 20, 1420)]);
    expect(h[1].nuevasSinDato).toBe(true);
    expect(ritmoMensual(h, "2026-10")).toEqual({ promedio: 20, meses: 1 });
  });

  it("respeta cargas manuales sin total", () => {
    const h = sanearHistorico([mes("2026-05", 9, 0), mes("2026-06", 11, 0)]);
    expect(h.map((x) => x.resenasNuevas)).toEqual([9, 11]);
    expect(ritmoMensual(h, "2026-10")).toEqual({ promedio: 10, meses: 2 });
  });
});

describe("ritmoMensual", () => {
  it("sin meses completos con dato da null", () => {
    expect(ritmoMensual([mes("2026-10", 0, 100)], "2026-10")).toBeNull();
    expect(ritmoMensual([], "2026-10")).toBeNull();
  });
});
