import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { crearMensaje, enviarCorreo, crearTransporte } = vi.hoisted(() => ({ crearMensaje: vi.fn(), enviarCorreo: vi.fn(), crearTransporte: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { beta = { messages: { create: crearMensaje } }; } }));
vi.mock("nodemailer", () => ({ default: { createTransport: crearTransporte } }));
import { modoSinGasto, servicioExternoPermitido } from "@/lib/politica-gasto";
import { redactarRespuestaIA, respuestasIAHabilitadas } from "@/lib/respuestas-ia";
import { urlMapaEstatico } from "@/lib/mapa";
import { enviarEmail, probarEnvioEmail } from "@/lib/email";
import { fetchPlacesSeguro, permitirConsultaPaga } from "@/lib/places-seguridad";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.APIS_MODO_SIN_GASTO;
  vi.stubEnv("RESPUESTAS_IA_HABILITADAS", "true"); vi.stubEnv("ANTHROPIC_API_KEY", "simulada");
  vi.stubEnv("GOOGLE_PLACES_HABILITADO", "true");
  vi.stubEnv("GOOGLE_PLACES_MAX_DIA", "100"); vi.stubEnv("GOOGLE_PLACES_MAX_MES", "1000");
  vi.stubEnv("SMTP_GRATUITO_VERIFICADO", "false"); vi.stubEnv("MONITOR_GRATUITO_VERIFICADO", "false");
  vi.stubEnv("SMTP_HOST", "smtp.example.com"); vi.stubEnv("SMTP_USER", "prueba"); vi.stubEnv("SMTP_PASS", "simulada");
  crearTransporte.mockReturnValue({ sendMail: enviarCorreo, verify: vi.fn() });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("perfil sin gasto y techo solicitado US$2", () => {
  it.each([undefined, "true", "FALSE", "", "0", "error"])("bloquea ante configuración omitida o ambigua: %s", valor => {
    if (valor !== undefined) vi.stubEnv("APIS_MODO_SIN_GASTO", valor);
    expect(modoSinGasto()).toBe(true);
  });
  it("Places no llama ni al proveedor ni al contador Redis aunque sus flags estén encendidos", async () => {
    expect(await permitirConsultaPaga("actor", 10, 1000)).toBe(false);
    expect((await fetchPlacesSeguro("https://places.googleapis.com/v1/places:searchText", {})).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("Anthropic no se usa aunque haya clave y flag previo", async () => {
    expect(respuestasIAHabilitadas()).toBe(false);
    expect(await redactarRespuestaIA({ comercio: "Ejemplo", estrellas: 5, texto: "Bien", tono: "cercano", recientes: [] })).toBeNull();
    expect(crearMensaje).not.toHaveBeenCalled();
  });
  it("no entrega al navegador una URL facturable de Maps Static", () => {
    expect(urlMapaEstatico([{ lat: -31, lng: -64 }], { key: "CLAVE" })).toBe("");
  });
  it("correo normal y de prueba quedan bloqueados sin plan gratuito verificado", async () => {
    const mensaje = { to: "prueba@example.com", asunto: "Prueba", html: "Prueba" };
    expect(await enviarEmail(mensaje)).toBe(false);
    expect((await probarEnvioEmail(mensaje)).ok).toBe(false);
    expect(crearTransporte).not.toHaveBeenCalled(); expect(enviarCorreo).not.toHaveBeenCalled();
  });
  it("no presume que un webhook o SMTP sea gratuito", () => {
    expect(servicioExternoPermitido("webhook")).toBe(false);
    expect(servicioExternoPermitido("smtp")).toBe(false);
    vi.stubEnv("SMTP_GRATUITO_VERIFICADO", "true");
    expect(servicioExternoPermitido("smtp")).toBe(true);
    expect(servicioExternoPermitido("webhook")).toBe(false);
  });
});
