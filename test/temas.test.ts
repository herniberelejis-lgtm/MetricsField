import { describe, expect, it } from "vitest";
import { detectarTemas, nombreDeTema } from "@/lib/temas";

describe("detectarTemas", () => {
  it("encuentra los temas sin importar acentos ni mayúsculas", () => {
    expect(detectarTemas("Excelente ATENCIÓN, la moza re amable")).toEqual(["atencion"]);
    expect(detectarTemas("El baño estaba sucio")).toEqual(["limpieza"]);
  });

  it("junta formas distintas de decir lo mismo", () => {
    for (const texto of [
      "Tardaron una banda en traer el café",
      "Esperamos 40 minutos",
      "Mucha demora",
      "Muy lento todo",
    ]) {
      expect(detectarTemas(texto)).toContain("demora");
    }
  });

  it("una reseña puede tener varios temas", () => {
    const temas = detectarTemas("Rico pero caro, y para pagar en la caja hay que hacer fila");
    expect(temas).toEqual(expect.arrayContaining(["sabor", "precio", "pago"]));
  });

  it("no confunde palabras parecidas", () => {
    // "a la tarde" no es demora; "espero volver" no es una espera.
    expect(detectarTemas("Fuimos a la tarde, espero volver pronto")).toEqual([]);
    expect(detectarTemas("")).toEqual([]);
  });

  it("tiene nombre para mostrar", () => {
    expect(nombreDeTema("pago")).toBe("Caja y cobro");
  });
});
