import { describe, expect, it } from "vitest";
import { armarInformeSemanal, lineasWhatsAppInforme, type EntradaInforme, type ResenaInforme } from "@/lib/informe-semanal";
import { armarTablero, type DiaTablero, type EntradaTablero } from "@/lib/tablero";
import type { Seguimiento } from "@/lib/seguimiento-competencia";

// Lunes 26/10/2026, 9 de la mañana en Córdoba.
const HOY = new Date("2026-10-26T12:00:00Z");

function fechas(hasta: string, n: number): string[] {
  const fin = new Date(`${hasta}T12:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) => new Date(fin - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

function dia(fecha: string, visitas: number): DiaTablero {
  return { fecha, visitas, visitasMaps: visitas, visitasBusqueda: 0, comoLlegar: 2, llamadas: 1, clicsWeb: 0, conversaciones: 0, reservas: 0 };
}

function tablero(extra: Partial<EntradaTablero> = {}) {
  return armarTablero({
    hoy: HOY,
    dias: 7,
    diarias: [],
    taps: [],
    resenas: [],
    historico: [],
    primerToque: null,
    rating: null,
    totalResenas: null,
    busquedas: [],
    nombreComercio: "Café Ejemplo",
    empleados: [],
    comparativas: [],
    ...extra,
  });
}

function resena(fecha: string, estrellas: number, respondida = false, automatica = false): ResenaInforme {
  return { fecha, estrellas, deGoogle: true, respondida, automatica };
}

function entrada(extra: Partial<EntradaInforme> = {}): EntradaInforme {
  return {
    tablero: tablero(),
    resenas: [],
    competencia: null,
    competidoresCargados: 0,
    mostrarRendimientoGoogle: true,
    meta: null,
    hoy: HOY,
    ...extra,
  };
}

describe("armarInformeSemanal", () => {
  it("rendimiento en Google contra la semana anterior", () => {
    const diarias = fechas("2026-10-24", 14).map((f, i) => dia(f, i < 7 ? 10 : 12));
    const i = armarInformeSemanal(entrada({ tablero: tablero({ diarias }) }))!;
    const vistas = i.rendimiento.find((r) => r.label === "Te vieron en Google")!;
    expect(vistas.valor).toBe("84");
    expect(vistas.cambio).toBe("20% más que la semana anterior");
    expect(vistas.tono).toBe("sube");
  });

  it("sin habilitación de Google no muestra visitas ni llamadas", () => {
    const diarias = fechas("2026-10-24", 14).map((f) => dia(f, 10));
    const i = armarInformeSemanal(entrada({ tablero: tablero({ diarias }), mostrarRendimientoGoogle: false, resenas: [resena("2026-10-25", 5)] }))!;
    expect(i.rendimiento).toEqual([]);
  });

  it("cuenta reseñas de la semana, respondidas solas y a mano, y las malas pendientes de cualquier fecha", () => {
    const i = armarInformeSemanal(
      entrada({
        resenas: [
          resena("2026-10-25", 5, true, true),
          resena("2026-10-24", 5, true, true),
          resena("2026-10-22", 4, true, false),
          resena("2026-10-21", 4, false),
          resena("2026-10-19", 1, false), // semana anterior: no cuenta como nueva
          resena("2026-09-01", 2, false), // vieja y sin responder: urgente igual
        ],
        meta: "Tu calificación es 4,6★: te faltan 21 de 5★ para el 4,7.",
      }),
    )!;
    expect(i.resenas).toEqual({
      nuevas: 4,
      promedio: "4,5",
      respondidas: 3,
      automaticas: 2,
      aMano: 1,
      pendientes: 1,
      pendientesMalas: 2,
      meta: "Tu calificación es 4,6★: te faltan 21 de 5★ para el 4,7.",
    });
  });

  it("compara contra la competencia y dice el puesto", () => {
    const competencia: Seguimiento = {
      desde: "2026-10-19",
      dias: 7,
      filas: [
        { id: 1, nombre: "Café Rival", esPropio: false, nuevas: 5, rating: 4.4, deltaRating: 0, desde: "2026-10-19" },
        { id: "propio", nombre: "Vos", esPropio: true, nuevas: 3, rating: 4.6, deltaRating: 0, desde: "2026-10-19" },
        { id: 2, nombre: "Bar Lejano", esPropio: false, nuevas: 1, rating: null, deltaRating: null, desde: "2026-10-19" },
      ],
      puesto: { puesto: 2, total: 3 },
      promedioCompetencia: 3,
      ratingCompetencia: 4.4,
    };
    const i = armarInformeSemanal(entrada({ competencia, competidoresCargados: 2 }))!;
    expect(i.competencia).toEqual({
      tipo: "tabla",
      dias: 7,
      filas: [
        { nombre: "Café Rival", esPropio: false, nuevas: 5, rating: "4,4" },
        { nombre: "Vos", esPropio: true, nuevas: 3, rating: "4,6" },
        { nombre: "Bar Lejano", esPropio: false, nuevas: 1, rating: null },
      ],
      lectura: "Esta semana sumaste 3 reseñas; tu competencia, 3,0 en promedio. Quedaste 2.º de 3 en reseñas nuevas.",
    });
  });

  it("la primera semana avisa desde cuándo mide a la competencia", () => {
    const i = armarInformeSemanal(entrada({ competidoresCargados: 3, resenas: [resena("2026-10-25", 5)] }))!;
    expect(i.competencia).toEqual({
      tipo: "aviso",
      texto: "Desde hoy medimos a 3 competidores: el lunes que viene te mostramos cuántas reseñas sumó cada uno contra vos.",
    });
  });

  it("MetricsField en el local: toques, reseñas que llegaron después y cuánto rinde", () => {
    const taps = ["2026-10-25T21:00:00Z", "2026-10-25T21:30:00Z", "2026-10-24T20:00:00Z", "2026-10-23T20:00:00Z"].map((creadoEn) => ({
      creadoEn,
      linkId: "caja",
      pieza: "Standee de la caja",
      empleado: "",
    }));
    const resenasT = [
      { id: 1, creadoEn: "2026-10-25T21:05:00Z", fecha: "2026-10-25", estrellas: 5, texto: "", deGoogle: true, respondida: true },
      { id: 2, creadoEn: "2026-10-24T20:04:00Z", fecha: "2026-10-24", estrellas: 5, texto: "", deGoogle: true, respondida: true },
    ];
    const i = armarInformeSemanal(entrada({ tablero: tablero({ taps, resenas: resenasT }) }))!;
    expect(i.enTuLocal?.toques.valor).toBe("4");
    expect(i.enTuLocal?.resenasDelCartel).toBe(2);
    expect(i.enTuLocal?.lectura).toBe("1 de cada 2 toques terminó en una reseña.");
  });

  it("sin nada que contar no arma informe", () => {
    expect(armarInformeSemanal(entrada({ mostrarRendimientoGoogle: false }))).toBeNull();
  });

  it("el texto de WhatsApp lleva cada parte", () => {
    const i = armarInformeSemanal(
      entrada({ resenas: [resena("2026-10-25", 5, true, true), resena("2026-09-01", 1)], competidoresCargados: 0 }),
    )!;
    const texto = lineasWhatsAppInforme(i).join("\n");
    expect(texto).toContain("*Reseñas*");
    expect(texto).toContain("• *1* nuevas, 5,0★ de promedio");
    expect(texto).toContain("(1 solas, 0 a mano)");
    expect(texto).toContain("1 reseña de 3★ o menos espera tu respuesta");
  });
});
