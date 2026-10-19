import { describe, expect, it } from "vitest";
import type { Conclusiones } from "@/lib/conclusiones";
import { armarResumenSemanal, textoWhatsAppResumen } from "@/lib/resumen-semanal";

const HOY = new Date("2026-10-26T12:00:00Z"); // lunes
const dia = 86_400_000;

const vacias: Conclusiones = { funciona: [], cuesta: [], meta: null, tareas: [], pendientes: [], faltaGoogle: false };

function conclusiones(extra: Partial<Conclusiones>): Conclusiones {
  return { ...vacias, ...extra };
}

describe("armarResumenSemanal", () => {
  it("arma los números de la semana, lo mejor y una tarea", () => {
    const r = armarResumenSemanal({
      nombre: "Café Ejemplo",
      conclusiones: conclusiones({
        funciona: [{ id: "cartel", cruce: "", titulo: "El cartel trae 4 de cada 10 reseñas.", barras: [], comoLoCalculamos: "" }],
        tareas: ["Que el turno del domingo ofrezca el cartel al cobrar"],
        meta: { actual: "4,6", siguiente: "4,7", faltan: 21, semanas: 5, compensaUnaMala: 10, progreso: 0.3, comoLoCalculamos: "" },
      }),
      resenas: [
        { fecha: "2026-10-25", estrellas: 5, deGoogle: true },
        { fecha: "2026-10-22", estrellas: 4, deGoogle: true },
        { fecha: "2026-09-01", estrellas: 1, deGoogle: true }, // fuera de la semana
      ],
      taps: [{ creadoEn: new Date(HOY.getTime() - dia).toISOString() }, { creadoEn: new Date(HOY.getTime() - 20 * dia).toISOString() }],
      hoy: HOY,
    });
    expect(r?.numeros).toEqual([
      { valor: "2", label: "reseñas nuevas en Google, 4,5★ de promedio" },
      { valor: "1", label: "toque al cartel" },
      { valor: "4,6", label: "tu calificación: te faltan 21 de 5★ para el 4,7" },
    ]);
    expect(r?.destacado).toBe("El cartel trae 4 de cada 10 reseñas.");
    expect(r?.tarea).toBe("Que el turno del domingo ofrezca el cartel al cobrar");

    const texto = textoWhatsAppResumen(r!, "https://app.metricsfield.com/portal/abc");
    expect(texto).toContain("*Tu semana en Google — Café Ejemplo*");
    expect(texto).toContain("• *2* reseñas nuevas en Google, 4,5★ de promedio");
    expect(texto).toContain("*Para hacer:* Que el turno del domingo");
    expect(texto.endsWith("https://app.metricsfield.com/portal/abc")).toBe(true);
  });

  it("sin nada que contar no arma resumen", () => {
    expect(armarResumenSemanal({ nombre: "X", conclusiones: vacias, resenas: [], taps: [], hoy: HOY })).toBeNull();
  });

  it("sin Google conectado no inventa reseñas en 0", () => {
    const r = armarResumenSemanal({
      nombre: "X",
      conclusiones: vacias,
      resenas: [{ fecha: "2026-10-25", estrellas: 5, deGoogle: false }],
      taps: [{ creadoEn: new Date(HOY.getTime() - dia).toISOString() }],
      hoy: HOY,
    });
    expect(r?.numeros).toEqual([{ valor: "1", label: "toque al cartel" }]);
  });
});
