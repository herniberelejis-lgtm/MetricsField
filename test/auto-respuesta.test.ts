import { describe, expect, it } from "vitest";
import { elegirSinRepetir, evaluarAutoRespuesta, huellaRespuesta } from "@/lib/auto-respuesta";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { respuestaFueRechazada } from "@/lib/google-reviews";

// La respuesta automática sale publicada sola, con la identidad del
// comercio: si se equivoca, el que queda mal es el cliente, y si repite
// textos o responde cualquier cosa, Google la rechaza.

describe("evaluarAutoRespuesta", () => {
  it("responde sola una positiva sin quejas, o solo estrellas", () => {
    expect(evaluarAutoRespuesta({ estrellas: 5, texto: "Excelente atención, volveremos!" }, 4)).toEqual({ auto: true });
    expect(evaluarAutoRespuesta({ estrellas: 4, texto: "" }, 4)).toEqual({ auto: true });
    expect(evaluarAutoRespuesta({ estrellas: 5, texto: "Todo riquísimo y muy lindo el lugar" }, 5)).toEqual({ auto: true });
  });

  it("debajo del umbral, siempre a mano", () => {
    expect(evaluarAutoRespuesta({ estrellas: 4, texto: "Muy bueno" }, 5)).toEqual({ auto: false, motivo: "estrellas" });
    expect(evaluarAutoRespuesta({ estrellas: 3, texto: "Muy bueno" }, 4)).toEqual({ auto: false, motivo: "estrellas" });
  });

  it("una de 4-5★ con una queja adentro va a mano", () => {
    for (const texto of [
      "La comida rica pero la atención fue mala y tardaron una hora",
      "Muy lindo aunque un poco caro",
      "Excelente, lástima la demora",
      "Todo bien, el baño estaba sucio",
      "Buenísimo! No me trajeron el postre",
      "Rico, el café llegó FRÍO",
    ]) {
      expect(evaluarAutoRespuesta({ estrellas: 5, texto }, 4)).toEqual({ auto: false, motivo: "queja" });
    }
  });

  it("links, mails o teléfonos: a mano", () => {
    for (const texto of ["Genial! Mirá www.ofertas.example", "Escribime a juan@correo.com", "Llamame al 351 555 1234", "Excelente https://x.example"]) {
      expect(evaluarAutoRespuesta({ estrellas: 5, texto }, 4)).toEqual({ auto: false, motivo: "contacto" });
    }
  });

  it("en otro idioma o muy larga: a mano", () => {
    expect(evaluarAutoRespuesta({ estrellas: 5, texto: "Amazing food and friendly staff, highly recommended" }, 4)).toEqual({ auto: false, motivo: "idioma" });
    expect(evaluarAutoRespuesta({ estrellas: 5, texto: "Excelente. ".repeat(50) }, 4)).toEqual({ auto: false, motivo: "larga" });
  });
});

describe("elegirSinRepetir", () => {
  it("no repite una respuesta reciente aunque cambien mayúsculas o signos", () => {
    const recientes = ["¡Hola! Gracias por tu reseña."];
    const r = elegirSinRepetir((i) => (i === 0 ? "hola, gracias por tu reseña" : "Otra respuesta"), recientes);
    expect(r).toBe("Otra respuesta");
  });

  it("si todas están usadas devuelve null (mejor a mano que repetida)", () => {
    expect(elegirSinRepetir(() => "Siempre igual", ["siempre igual"], 5)).toBeNull();
  });

  it("con las plantillas, 40 reseñas 5★ genéricas seguidas salen todas distintas", () => {
    const publicadas: string[] = [];
    for (let i = 0; i < 40; i++) {
      const r = elegirSinRepetir((intento) => generarRespuestaSugerida("", 5, i % 2 ? "Excelente" : "", "cercano", intento), publicadas);
      expect(r).not.toBeNull();
      publicadas.unshift(r!);
    }
    expect(new Set(publicadas.map(huellaRespuesta)).size).toBe(40);
  });

  it("la plantilla ya no felicita la atención en una reseña que se queja de ella", () => {
    // Antes respondía "Nos alegra que la atención te haya gustado" a esto;
    // ahora ni siquiera llega a la plantilla automática.
    expect(evaluarAutoRespuesta({ estrellas: 4, texto: "La atención fue mala" }, 4).auto).toBe(false);
  });
});

describe("respuestaFueRechazada", () => {
  it("lee el rechazo de Google a la defensiva", () => {
    expect(respuestaFueRechazada(undefined)).toBe(false);
    expect(respuestaFueRechazada({ comment: "Gracias" })).toBe(false);
    expect(respuestaFueRechazada({ comment: "Gracias", reviewReplyState: "PENDING_MODERATION" })).toBe(false);
    expect(respuestaFueRechazada({ comment: "Gracias", reviewReplyState: "REJECTED" })).toBe(true);
    expect(respuestaFueRechazada({ comment: "Gracias", policyViolation: { policy: "SPAM" } })).toBe(true);
  });
});
