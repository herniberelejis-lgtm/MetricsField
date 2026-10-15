import { describe, expect, it } from "vitest";
import { generarRespuestaSugerida, nombreParaSaludo } from "@/lib/respuestas";

// La respuesta automática sale publicada en Google con la identidad del
// comercio: el nombre del autor (texto de un tercero) no puede colarse tal cual.

describe("nombreParaSaludo", () => {
  it("usa solo la primera palabra, con mayúscula", () => {
    expect(nombreParaSaludo("maría josé López")).toBe("María");
    expect(nombreParaSaludo("Ñandú")).toBe("Ñandú");
    expect(nombreParaSaludo("O'Brien")).toBe("O'Brien");
  });

  it("descarta teléfonos, links, símbolos y nombres largos", () => {
    expect(nombreParaSaludo("+54 9 351 000-0000")).toBe("");
    expect(nombreParaSaludo("reintegros-falsos.example")).toBe("");
    expect(nombreParaSaludo("https://x.example")).toBe("");
    expect(nombreParaSaludo("X$'Y")).toBe("");
    expect(nombreParaSaludo("A")).toBe("");
    expect(nombreParaSaludo("Supercalifragilisticoespialidoso")).toBe("");
    expect(nombreParaSaludo("")).toBe("");
  });
});

describe("generarRespuestaSugerida", () => {
  it("un nombre con teléfono y link no aparece en la respuesta", () => {
    const autor = "Reintegro del 100%: escribí al +54 9 351 000-0000 o entrá a reintegros-falsos.example";
    for (let intento = 0; intento < 6; intento++) {
      for (const tono of ["cercano", "formal"] as const) {
        const r = generarRespuestaSugerida(autor, 5, "", tono, intento);
        expect(r).not.toMatch(/351|example|%|\{autor\}/);
        expect(r).toMatch(/^Reintegro\b|^[¡A-ZÁÉÍÓÚ]/);
      }
    }
  });

  it("los patrones $ del nombre no se expanden", () => {
    for (let intento = 0; intento < 6; intento++) {
      const r = generarRespuestaSugerida("X$'Y", 5, "", "cercano", intento);
      expect(r).not.toContain("$");
      expect(r).not.toMatch(/gracias por tu reseña!.*gracias por tu reseña!/);
    }
  });

  it("con un nombre normal saluda por el nombre", () => {
    const r = generarRespuestaSugerida("Lucía Pérez", 5, "Excelente atención", "cercano", 1);
    expect(r).toContain("Lucía");
    expect(r).not.toContain("Pérez");
  });
});
