import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { evaluar } = vi.hoisted(() => ({ evaluar: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: class { eval = evaluar; } }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
import { fetchPlacesSeguro, permitirConsultaPaga, reservarConsultaPlaces, RESERVAR_CUPO } from "@/lib/places-seguridad";
import { searchGooglePlace, linkResenaDeLugar, fetchGooglePlaceStats, fetchResenasGooglePublicas, autocompletarLugar } from "@/lib/places";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_PLACES_HABILITADO", "true");
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "clave-simulada");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://ejemplo.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-simulado");
  vi.stubEnv("GOOGLE_PLACES_MAX_DIA", "100");
  vi.stubEnv("GOOGLE_PLACES_MAX_MES", "1000");
  evaluar.mockResolvedValue(1);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("control económico de Places", () => {
  it.each(["", "false", "TRUE"])("no hace ninguna consulta con interruptor %s", async valor => {
    vi.stubEnv("GOOGLE_PLACES_HABILITADO", valor);
    expect((await fetchPlacesSeguro("https://places.googleapis.com/v1/places:searchText", {})).status).toBe(429);
    expect(evaluar).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["", "http://redis.local"])("sin Redis HTTPS no sale a Google (%s)", async url => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
    expect(await reservarConsultaPlaces()).toBe(false); expect(fetch).not.toHaveBeenCalled();
  });
  it("si Redis falla o devuelve un resultado inesperado, no permite gastar", async () => {
    evaluar.mockRejectedValueOnce(new Error("caída"));
    expect(await reservarConsultaPlaces()).toBe(false);
    evaluar.mockResolvedValueOnce("1");
    expect(await reservarConsultaPlaces()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["-1", "NaN", "1000000", "1.5"])("una cuota inválida bloquea: %s", async n => {
    vi.stubEnv("GOOGLE_PLACES_MAX_DIA", n);
    expect(await reservarConsultaPlaces()).toBe(false); expect(evaluar).not.toHaveBeenCalled();
  });
  it("con el presupuesto cero predeterminado no consulta aunque se encienda el interruptor", async () => {
    delete process.env.GOOGLE_PLACES_MAX_DIA;
    delete process.env.GOOGLE_PLACES_MAX_MES;
    expect(await reservarConsultaPlaces()).toBe(false);
    expect(evaluar).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("envía ambos topes en una única reserva atómica compartida", async () => {
    expect(await reservarConsultaPlaces()).toBe(true);
    expect(evaluar).toHaveBeenCalledTimes(1);
    const [script, keys, args] = evaluar.mock.calls[0];
    expect(script).toBe(RESERVAR_CUPO); expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^places-seguridad:v1:dia:/);
    expect(keys[1]).toMatch(/^places-seguridad:v1:mes:/);
    expect(args).toEqual([100, 172800000, 1000, 2764800000]);
  });
  it("un cupo agotado impide todas las salidas de Places", async () => {
    evaluar.mockResolvedValue(0);
    const id = "ChIJN1t_tDeuEmsRUsoyG83frY4";
    expect((await searchGooglePlace("Café Córdoba")).ok).toBe(false);
    expect((await autocompletarLugar("Café Córdoba")).ok).toBe(false);
    expect(await linkResenaDeLugar(id)).toBeNull();
    expect(await fetchGooglePlaceStats(id)).toBeNull();
    expect(await fetchResenasGooglePublicas(id)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("no sigue redirecciones ni reintenta un timeout del proveedor", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    expect((await fetchPlacesSeguro("https://places.googleapis.com/v1/places:searchText", {})).status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }));
    expect(evaluar).toHaveBeenCalledTimes(1);
  });
  it("rechaza destinos externos antes de reservar y de enviar credenciales", async () => {
    expect((await fetchPlacesSeguro("https://atacante.example/v1/places", {})).status).toBe(503);
    expect(evaluar).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("los identificadores y consultas inválidos no llegan al proveedor", async () => {
    expect(await linkResenaDeLugar("../otra-url")).toBeNull();
    expect(await fetchGooglePlaceStats("../otra-url")).toBeNull();
    expect((await searchGooglePlace("x".repeat(121))).ok).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("el límite de actor también falla cerrado", async () => {
    evaluar.mockRejectedValue(new Error("Redis caído"));
    expect(await permitirConsultaPaga("pieza:p-1", 5, 1000)).toBe(false);
  });
});
