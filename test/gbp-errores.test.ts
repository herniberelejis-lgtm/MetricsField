import { describe, expect, it } from "vitest";
import { describirErrorGoogle, detalleErrorGoogle } from "@/lib/gbp";

// Un 403 de Google puede ser "API apagada" o "sin permiso sobre la ficha":
// el admin tiene que ver cuál de las dos, con el link para arreglarlo.
describe("errores de Google", () => {
  const apagada = {
    error: {
      code: 403,
      message: "Google My Business API has not been used in project 230989216365 before or it is disabled.",
      status: "PERMISSION_DENIED",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.ErrorInfo",
          reason: "SERVICE_DISABLED",
          metadata: {
            activationUrl: "https://console.developers.google.com/apis/api/mybusiness.googleapis.com/overview?project=230989216365",
          },
        },
      ],
    },
  };

  it("API apagada: lo dice y pasa el link de Google para habilitarla", () => {
    const texto = describirErrorGoogle("Reviews API (My Business v4)", 403, detalleErrorGoogle(apagada));
    expect(texto).toContain("(SERVICE_DISABLED)");
    expect(texto).toContain("no está habilitada");
    expect(texto).toContain("https://console.developers.google.com/apis/api/mybusiness.googleapis.com/overview?project=230989216365");
  });

  it("otro 403: muestra el mensaje original de Google", () => {
    const d = detalleErrorGoogle({ error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } });
    const texto = describirErrorGoogle("Reviews API (My Business v4)", 403, d);
    expect(texto).toContain("(PERMISSION_DENIED)");
    expect(texto).toContain('Google dice: "The caller does not have permission"');
  });

  it("no acepta links que no sean de la consola de Google", () => {
    const d = detalleErrorGoogle({
      error: { details: [{ reason: "SERVICE_DISABLED", metadata: { activationUrl: "https://malo.example/x" } }] },
    });
    expect(d.activarEn).toBeNull();
  });

  it("cuerpo raro o vacío: no tira y cae en la explicación por status", () => {
    for (const cuerpo of [null, "texto", 42, { error: "x" }, { error: { details: "x" } }]) {
      expect(detalleErrorGoogle(cuerpo)).toEqual({ razon: null, mensaje: null, activarEn: null });
    }
    expect(describirErrorGoogle("Performance API", 401)).toBe(
      "Performance API respondió 401: el permiso venció o fue revocado: el cliente tiene que volver a conectar su Google.",
    );
  });
});
