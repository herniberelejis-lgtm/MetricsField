import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  getLink: vi.fn(), verificarPin: vi.fn(), detalle: vi.fn(), buscar: vi.fn(), sugerir: vi.fn(), permitirPago: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getLink: m.getLink, verificarPinAutogestion: m.verificarPin, activarAutogestion: vi.fn(), editarAutogestion: vi.fn(), guardarDatosActivacion: vi.fn(), guardarLugarAutogestion: vi.fn() }));
vi.mock("@/lib/places-seguridad", () => ({ permitirConsultaPaga: m.permitirPago }));
vi.mock("@/lib/ratelimit", () => ({ permitir: async () => true, limpiarVencidos: vi.fn(), ipDelRequest: () => "ip-prueba" }));
vi.mock("@/lib/places", () => ({ searchGooglePlace: m.buscar, autocompletarLugar: m.sugerir, linkResenaDeLugar: m.detalle, placeIdValido: () => true, tokenSesionValido: () => true, SESGO_CORDOBA: {} }));
import { activarCartel, editarCartel, buscarNegocio, sugerirNegocio } from "@/app/t/actions";
beforeEach(() => { vi.clearAllMocks(); m.permitirPago.mockResolvedValue(true); m.verificarPin.mockResolvedValue(false); });

it("una pieza inexistente no puede facturar una activación", async () => {
  m.getLink.mockResolvedValue(undefined);
  expect((await activarCartel("no-existe", { pin: "1234", placeId: "place-id" })).ok).toBe(false);
  expect(m.detalle).not.toHaveBeenCalled();
});
it("un PIN incorrecto no puede facturar detalles ni búsquedas", async () => {
  m.getLink.mockResolvedValue({ id: "p-1", activo: true, autogestionado: true, comercioId: null });
  expect((await editarCartel("p-1", "1234", { nombre: "Ejemplo", placeId: "place-id" })).ok).toBe(false);
  expect((await buscarNegocio("p-1", "Café Córdoba", "1234")).ok).toBe(false);
  expect((await sugerirNegocio("p-1", "Café Córdoba", "sesion-token", "1234")).ok).toBe(false);
  expect(m.detalle).not.toHaveBeenCalled(); expect(m.buscar).not.toHaveBeenCalled(); expect(m.sugerir).not.toHaveBeenCalled();
});
it("una pieza devuelta con destino previo no admite búsquedas anónimas", async () => {
  m.getLink.mockResolvedValue({ id: "p-1", activo: true, autogestionado: false, comercioId: null, etiqueta: "Anterior", urlDestino: "https://g.page/r/ejemplo/review" });
  expect((await buscarNegocio("p-1", "Café Córdoba")).ok).toBe(false);
  expect(m.buscar).not.toHaveBeenCalled();
});
it("la caída del control distribuido bloquea búsquedas aunque el límite viejo permita", async () => {
  m.permitirPago.mockResolvedValue(false);
  expect((await buscarNegocio("p-1", "Café Córdoba")).ok).toBe(false);
  expect(m.buscar).not.toHaveBeenCalled();
});
it("el dueño con PIN válido puede buscar", async () => {
  m.getLink.mockResolvedValue({ id: "p-1", activo: true, autogestionado: true, comercioId: null });
  m.verificarPin.mockResolvedValue(true); m.buscar.mockResolvedValue({ ok: true, resultados: [] });
  expect((await buscarNegocio("p-1", "Café Córdoba", "1234")).ok).toBe(true);
  expect(m.buscar).toHaveBeenCalledTimes(1);
});
