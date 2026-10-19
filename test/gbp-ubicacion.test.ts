import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listarUbicaciones,
  rendimientoDelMes,
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
    await rendimientoDelMes("tok", "accounts/111/locations/222", 2026, 10);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/v1/locations/222:fetchMultiDailyMetricsTimeSeries");
    expect(url).not.toContain("accounts/");
  });
});
