import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listarUbicaciones,
  palabrasDeBusqueda,
  rendimientoDiario,
  ubicacionConCuenta,
  ubicacionParaPerformance,
} from "@/lib/gbp";

// La Reviews API (v4) pide "accounts/{a}/locations/{l}" y Performance solo
// "locations/{l}": un mismo valor guardado tiene que servir para las dos.
afterEach(() => vi.unstubAllGlobals());

describe("ficha de Business Profile", () => {
  it("convierte al formato que pide Performance", () => {
    expect(ubicacionParaPerformance("accounts/111/locations/222")).toBe("locations/222");
    expect(ubicacionParaPerformance("locations/222")).toBe("locations/222");
  });

  it("distingue las fichas guardadas sin cuenta", () => {
    expect(ubicacionConCuenta("accounts/111/locations/222")).toBe(true);
    expect(ubicacionConCuenta("locations/222")).toBe(false);
  });

  it("listarUbicaciones devuelve el nombre con la cuenta", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const cuerpo = String(url).includes("mybusinessaccountmanagement")
        ? { accounts: [{ name: "accounts/111" }] }
        : { locations: [{ name: "locations/222", title: "Café", metadata: { placeId: "ChIJx" } }] };
      return new Response(JSON.stringify(cuerpo), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await listarUbicaciones("tok");
    expect(r).toEqual([{ location: "accounts/111/locations/222", placeId: "ChIJx", titulo: "Café" }]);
  });

  it("Performance se pide sin la cuenta", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await rendimientoDiario("tok", "accounts/111/locations/222", "2026-10-01", "2026-10-19");
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/v1/locations/222:fetchMultiDailyMetricsTimeSeries");
    expect(url).toContain("dailyRange.startDate.day=1");
    expect(url).not.toContain("accounts/");
  });
});

describe("rendimientoDiario", () => {
  it("junta las métricas por día y suma compu + celular", async () => {
    const serie = (dailyMetric: string, valores: [number, string][]) => ({
      dailyMetric,
      timeSeries: { datedValues: valores.map(([day, value]) => ({ date: { year: 2026, month: 10, day }, value })) },
    });
    const cuerpo = {
      multiDailyMetricTimeSeries: [
        {
          dailyMetricTimeSeries: [
            serie("BUSINESS_IMPRESSIONS_MOBILE_MAPS", [[1, "10"], [2, "4"]]),
            serie("BUSINESS_IMPRESSIONS_DESKTOP_MAPS", [[1, "3"]]),
            serie("BUSINESS_DIRECTION_REQUESTS", [[2, "7"]]),
            // Google omite el valor cuando es 0
            { dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 1 } }] } },
          ],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: 200 })));
    const dias = await rendimientoDiario("tok", "locations/222", "2026-10-01", "2026-10-02");
    expect(dias).toEqual([
      expect.objectContaining({ fecha: "2026-10-01", impresionesMaps: 13, comoLlegar: 0, llamadas: 0 }),
      expect.objectContaining({ fecha: "2026-10-02", impresionesMaps: 4, comoLlegar: 7 }),
    ]);
  });

  it("devuelve null si Google rechaza", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 400 })));
    expect(await rendimientoDiario("tok", "locations/222", "2025-01-01", "2026-10-02")).toBeNull();
  });
});

describe("palabrasDeBusqueda", () => {
  it("distingue número exacto de 'menos de N' y pagina", async () => {
    const paginas = [
      {
        searchKeywordsCounts: [
          { searchKeyword: "brunch cordoba", insightsValue: { value: "280" } },
          { searchKeyword: "medialunas", insightsValue: { threshold: "15" } },
        ],
        nextPageToken: "p2",
      },
      { searchKeywordsCounts: [{ searchKeyword: "cafe", insightsValue: { value: "90" } }] },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(paginas.shift()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await palabrasDeBusqueda("tok", "accounts/1/locations/222", "2026-09");
    expect(r).toEqual([
      { palabra: "brunch cordoba", impresiones: 280, umbral: null },
      { palabra: "medialunas", impresiones: null, umbral: 15 },
      { palabra: "cafe", impresiones: 90, umbral: null },
    ]);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/v1/locations/222/searchkeywords/impressions/monthly?");
    expect(url).toContain("monthlyRange.startMonth.month=9");
  });
});
