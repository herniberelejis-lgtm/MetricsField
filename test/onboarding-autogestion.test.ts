import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizarEmail, normalizarWhatsapp, validarContacto } from "@/lib/activacion";
import { bajaValida, firmarBaja } from "@/lib/baja";
import { agruparAvisos, consejoAviso } from "@/lib/aviso-piezas";
import { placeIdValido } from "@/lib/places";

// Activación de piezas compradas por Mercado Libre: el contacto solo se
// guarda con permiso, la baja no se puede falsificar y el place_id que
// manda el navegador no puede inyectar nada en la URL de Google.

describe("validarContacto", () => {
  it("sin la casilla no guarda nada, aunque haya escrito datos", () => {
    expect(validarContacto({ email: "dueño@bar.com", whatsapp: "3515551234", acepta: false })).toEqual({
      ok: true,
      email: "",
      whatsapp: "",
      acepta: false,
    });
  });

  it("con la casilla normaliza mail y WhatsApp", () => {
    expect(validarContacto({ email: "  Dueno@Bar.COM ", whatsapp: "+54 9 351 555-1234", acepta: true })).toEqual({
      ok: true,
      email: "dueno@bar.com",
      whatsapp: "5493515551234",
      acepta: true,
    });
  });

  it("con la casilla pide al menos un dato y que sean válidos", () => {
    expect(validarContacto({ acepta: true }).ok).toBe(false);
    expect(validarContacto({ email: "no-es-un-mail", acepta: true }).ok).toBe(false);
    expect(validarContacto({ whatsapp: "123", acepta: true }).ok).toBe(false);
    expect(validarContacto({ whatsapp: "3515551234", acepta: true }).ok).toBe(true);
  });

  it("normalizadores", () => {
    expect(normalizarEmail("")).toBe("");
    expect(normalizarEmail("a@b")).toBeNull();
    expect(normalizarWhatsapp("(351) 555.1234")).toBe("3515551234");
    expect(normalizarWhatsapp("351-abc")).toBeNull();
  });
});

describe("link de baja", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("firma por mail, sin importar mayúsculas, y no sirve para otro mail", () => {
    vi.stubEnv("BAJA_SECRET", "secreto-de-prueba");
    const firma = firmarBaja("Dueno@Bar.com")!;
    expect(bajaValida("dueno@bar.com", firma)).toBe(true);
    expect(bajaValida("otro@bar.com", firma)).toBe(false);
    expect(bajaValida("dueno@bar.com", "")).toBe(false);
    expect(bajaValida("dueno@bar.com", firma.slice(0, -1) + "x")).toBe(false);
  });

  it("sin ningún secreto no hay firma (el mail pide responder BAJA)", () => {
    vi.stubEnv("BAJA_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
    expect(firmarBaja("dueno@bar.com")).toBeNull();
    expect(bajaValida("dueno@bar.com", "cualquiera")).toBe(false);
  });
});

describe("aviso semanal de piezas", () => {
  const pieza = (id: string, email: string, semana: number, anterior: number, negocio = "Café Ejemplo") => ({
    id,
    nombreNegocio: negocio,
    email,
    toquesSemana: semana,
    toquesSemanaAnterior: anterior,
    toquesTotal: semana + anterior,
  });

  it("un mail por persona, con todas sus piezas sumadas", () => {
    const avisos = agruparAvisos([
      pieza("p-1", "dueno@bar.com", 12, 10),
      pieza("p-2", "DUENO@bar.com", 3, 0),
      pieza("p-3", "otra@cafe.com", 0, 0, "Otro Café"),
    ]);
    expect(avisos).toHaveLength(2);
    const d = avisos.find((a) => a.email === "dueno@bar.com")!;
    expect(d.toquesSemana).toBe(15);
    expect(d.cambio).toBe("50% más que la semana anterior");
    expect(d.piezas.map((p) => p.id)).toEqual(["p-1", "p-2"]);
  });

  it("sin toques da un consejo en vez de solo un cero", () => {
    const [a] = agruparAvisos([pieza("p-3", "otra@cafe.com", 0, 0)]);
    expect(a.cambio).toBeNull();
    expect(consejoAviso(a)).toContain("Ponela bien a la vista");
  });
});

describe("placeIdValido", () => {
  it("acepta un place_id de Google y rechaza lo que podría cambiar la URL", () => {
    expect(placeIdValido("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(true);
    expect(placeIdValido("ChIJN1t_tDeuEmsRUsoyG83frY4/../otro")).toBe(false);
    expect(placeIdValido("abc?key=1")).toBe(false);
    expect(placeIdValido("corto")).toBe(false);
  });
});

// Las fotos y videos de la activación viven en public/ y se comparten con
// la landing: si alguien regenera o borra una variante (pasó con las fotos
// de 480 px), la pantalla de "¡Listo!" mostraba imágenes rotas sin aviso.
describe("archivos de la activación", () => {
  it("cada foto y video que usa existe en public/", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const onboarding = await import("@/lib/onboarding");
    const rutas = [
      ...onboarding.USOS_PIEZAS.map((u) => u.foto),
      ...[onboarding.VIDEO_QR, onboarding.VIDEO_QR_MANUAL, onboarding.VIDEO_NFC].flatMap((v) =>
        v ? Object.values(v).filter((x): x is string => typeof x === "string" && x.startsWith("/")) : [],
      ),
    ];
    expect(rutas.length).toBeGreaterThan(0);
    for (const ruta of rutas) expect(existsSync(join(process.cwd(), "public", ruta)), ruta).toBe(true);
  });
});
