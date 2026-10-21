import { describe, expect, it } from "vitest";
import type { ComparativaMes } from "@/lib/comparativa-competencia";
import type { TapAnalisis } from "@/lib/conclusiones";
import { armarTablero, combinarEntradas, marcadoresZona, rangoDe, type DiaTablero, type EntradaTablero, type ResenaTablero } from "@/lib/tablero";

// Mediodía en Córdoba del martes 20/10/2026.
const HOY = new Date("2026-10-20T15:00:00Z");

function dia(fecha: string, extra: Partial<DiaTablero> = {}): DiaTablero {
  return { fecha, visitas: 10, visitasMaps: 6, visitasBusqueda: 4, comoLlegar: 2, llamadas: 1, clicsWeb: 1, conversaciones: 0, reservas: 0, ...extra };
}

function fechas(hasta: string, n: number): string[] {
  const fin = new Date(`${hasta}T12:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) => new Date(fin - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

let idResena = 0;
function resena(fecha: string, estrellas: number, texto = "", extra: Partial<ResenaTablero> = {}): ResenaTablero {
  idResena += 1;
  return { id: idResena, creadoEn: `${fecha}T18:00:00Z`, fecha, estrellas, texto, deGoogle: true, respondida: true, ...extra };
}

function toque(creadoEn: string, pieza = "Caja", empleado = ""): TapAnalisis {
  return { creadoEn, linkId: pieza, pieza, empleado };
}

function entrada(extra: Partial<EntradaTablero> = {}): EntradaTablero {
  return {
    hoy: HOY,
    dias: 28,
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
  };
}

describe("rangoDe", () => {
  it("acepta 7, 28 y 90; cualquier otra cosa es 28", () => {
    expect(rangoDe("7")).toBe(7);
    expect(rangoDe("90")).toBe(90);
    expect(rangoDe("30")).toBe(28);
    expect(rangoDe(undefined)).toBe(28);
  });
});

describe("métricas del período", () => {
  it("Google termina en el último día informado y compara contra los 28 anteriores", () => {
    const diarias = fechas("2026-10-17", 56).map((f, i) => dia(f, { visitas: i < 28 ? 10 : 12 }));
    const t = armarTablero(entrada({ diarias }));
    const vistas = t.kpis.find((k) => k.id === "vistas")!;
    expect(vistas.valor).toBe("336"); // 28 × 12
    expect(vistas.delta).toEqual({ texto: "20%", tono: "sube" });
    expect(vistas.nota).toBe("Google informa hasta el 17 oct");
    expect(vistas.serie!.fechas.at(-1)).toBe("2026-10-17");
    expect(vistas.serie!.anterior).toHaveLength(28);
  });

  it("sin Google conectado no inventa ceros: dice qué falta", () => {
    const t = armarTablero(entrada());
    const vistas = t.kpis.find((k) => k.id === "vistas")!;
    expect(vistas.valor).toBeNull();
    expect(vistas.falta).toMatch(/conectes tu Google/);
    expect(t.kpis.find((k) => k.id === "resenas")!.valor).toBeNull();
    expect(t.kpis.find((k) => k.id === "calificacion")!.valor).toBeNull();
  });

  it("toques por día en hora de Córdoba, contra el período anterior", () => {
    const taps = [
      toque("2026-10-20T02:30:00Z"), // 19/10 23:30 en Córdoba
      toque("2026-10-19T15:00:00Z"),
      toque("2026-09-10T15:00:00Z"), // período anterior
    ];
    const t = armarTablero(entrada({ taps }));
    const k = t.kpis.find((x) => x.id === "toques")!;
    expect(k.valor).toBe("2");
    expect(k.delta).toEqual({ texto: "100%", tono: "sube" });
    expect(k.serie!.actual.at(-2)).toBe(2); // los dos cayeron el 19/10
  });

  it("calificación contra el cierre del mes pasado", () => {
    const t = armarTablero(
      entrada({
        rating: 4.6,
        historico: [
          { mes: "2026-09", resenasNuevas: 10, ratingPromedio: 4.5 },
          { mes: "2026-10", resenasNuevas: 5, ratingPromedio: 4.6 },
        ],
      }),
    );
    const k = t.kpis.find((x) => x.id === "calificacion")!;
    expect(k.valor).toBe("4,6 ★");
    expect(k.delta).toEqual({ texto: "0,1", tono: "sube" });
  });
});

describe("tortas", () => {
  it("Maps contra búsqueda, con porcentajes que suman 100", () => {
    const diarias = fechas("2026-10-17", 28).map((f) => dia(f, { visitasMaps: 2, visitasBusqueda: 1 }));
    const t = armarTablero(entrada({ diarias }));
    const torta = t.tortas.find((x) => x.id === "encuentran")!;
    expect(torta.segmentos.map((s) => s.pct)).toEqual([67, 33]);
    expect(torta.total).toBe("84");
  });

  it("quién trae las reseñas: las que llegan hasta 30 minutos después de un toque", () => {
    const resenas = [
      resena("2026-10-15", 5),
      resena("2026-10-14", 5),
      resena("2026-10-13", 4),
      resena("2026-10-12", 5),
      resena("2026-10-11", 5),
    ];
    const taps = [toque("2026-10-15T17:50:00Z"), toque("2026-10-14T17:40:00Z"), toque("2026-10-13T10:00:00Z")];
    const t = armarTablero(entrada({ resenas, taps }));
    const torta = t.tortas.find((x) => x.id === "quien-trae")!;
    expect(torta.segmentos.map((s) => s.valor)).toEqual([2, 3]);
  });

  it("respondidas: avisa cuántas negativas quedan sin respuesta", () => {
    const resenas = [
      resena("2026-10-01", 5),
      resena("2026-10-02", 5),
      resena("2026-10-03", 2, "", { respondida: false }),
      resena("2026-10-04", 4),
      resena("2026-10-05", 5, "", { respondida: false }),
    ];
    const t = armarTablero(entrada({ resenas }));
    const torta = t.tortas.find((x) => x.id === "respondidas")!;
    expect(torta.segmentos[0].pct).toBe(60);
    expect(torta.nota).toMatch(/Queda 1 negativa sin responder/);
    expect(t.respondidas).toEqual({ pct: 60, sinResponderNegativas: 1 });
  });
});

describe("mapa de calor del cartel", () => {
  it("ubica cada toque en el día y la hora de Córdoba", () => {
    // 23:30 UTC del sábado 17/10 = 20:30 del sábado en Córdoba.
    const taps = Array.from({ length: 12 }, () => toque("2026-10-17T23:30:00Z"));
    const t = armarTablero(entrada({ taps }));
    const sabado = t.calor!.filas.find((f) => f.dia === "Sáb")!;
    expect(sabado.celdas.find((c) => c.hora === 20)!.toques).toBe(12);
    expect(sabado.celdas.find((c) => c.hora === 20)!.nivel).toBe(4);
    expect(t.calor!.filas[0].dia).toBe("Lun");
  });

  it("con menos de 10 toques no se dibuja", () => {
    expect(armarTablero(entrada({ taps: [toque("2026-10-17T23:30:00Z")] })).calor).toBeNull();
  });
});

describe("lo que dicen los clientes", () => {
  it("separa lo que destacan de las quejas, con una cita", () => {
    const resenas = [
      resena("2026-10-01", 5, "Excelente atención. Todo riquísimo."),
      resena("2026-10-02", 5, "La atención de primera, muy amables."),
      resena("2026-10-03", 4, "Buena atención y lindo lugar."),
      resena("2026-10-04", 2, "Tardaron una hora con el pedido. Una pena."),
      resena("2026-10-05", 1, "Mucha demora, nos fuimos."),
      resena("2026-10-06", 3, "Lindo pero lento el servicio, esperamos mucho."),
    ];
    const t = armarTablero(entrada({ resenas }));
    expect(t.loQueDicen!.destacan[0]).toMatchObject({ id: "atencion", n: 3, promedio: "4,7" });
    expect(t.loQueDicen!.quejas[0]).toMatchObject({ id: "demora", n: 3, promedio: "2,0" });
    expect(t.loQueDicen!.quejas[0].cita).toBe("Lindo pero lento el servicio, esperamos mucho.");
  });

  it("en las reseñas buenas, \"espera y demora\" es la rapidez", () => {
    const resenas = Array.from({ length: 5 }, (_, i) => resena(`2026-10-0${i + 1}`, 5, "Súper rápido y rico"));
    expect(armarTablero(entrada({ resenas })).loQueDicen!.destacan.find((d) => d.id === "demora")!.tema).toBe("Rapidez");
  });
});

describe("equipo", () => {
  it("cuenta las reseñas que lo nombran, su promedio y las que llegaron por su tarjeta", () => {
    const resenas = [
      ...Array.from({ length: 5 }, (_, i) => resena(`2026-10-0${i + 1}`, 5, "Juan nos atendió genial, muy amable")),
      resena("2026-10-08", 5, "Sofía un sol"),
    ];
    const taps = [toque("2026-10-01T17:50:00Z", "Tarjeta de Juan", "Juan")];
    const t = armarTablero(entrada({ resenas, taps, empleados: ["Juan", "Sofía", "Juan"] }));
    expect(t.equipo).toHaveLength(2);
    expect(t.equipo[0]).toMatchObject({ nombre: "Juan", nombrado: 5, promedio: "5,0", porTarjeta: 1, etiqueta: "El más nombrado", destacado: true });
    expect(t.equipo[0].temas[0]).toEqual({ label: "atención", bien: true });
    expect(t.equipo[1]).toMatchObject({ nombre: "Sofía", nombrado: 1, etiqueta: "Pocas menciones todavía", temas: [] });
  });
});

describe("piezas del cartel", () => {
  it("sin reseñas de Google sincronizadas no dice \"sin reseñas\": no se sabe", () => {
    const taps = Array.from({ length: 12 }, () => toque("2026-10-15T15:00:00Z"));
    const t = armarTablero(entrada({ taps }));
    expect(t.piezas[0]).toMatchObject({ pieza: "Caja", toques: 12, resenas: null, rinde: "—" });
  });
});

describe("búsquedas y competencia", () => {
  it("saca las búsquedas por tu nombre y cuenta cuántas reseñas nombran cada una", () => {
    const resenas = Array.from({ length: 5 }, (_, i) => resena(`2026-10-0${i + 1}`, 5, i < 2 ? "El mejor brunch" : "Rico café"));
    const t = armarTablero(
      entrada({
        resenas,
        busquedas: [
          { palabra: "cafe ejemplo", impresiones: 900 },
          { palabra: "brunch", impresiones: 400 },
          { palabra: "cafe", impresiones: 300 },
          { palabra: "medialunas", impresiones: null },
        ],
      }),
    );
    expect(t.busquedas).toEqual([
      { palabra: "brunch", veces: 400, menciones: 2 },
      { palabra: "cafe", veces: 300, menciones: null },
    ]);
  });

  it("el rubro en plural o en inglés no es algo que \"te buscan\" para cruzar con reseñas", () => {
    const resenas = Array.from({ length: 5 }, (_, i) => resena(`2026-10-0${i + 1}`, 5, "Muy rico todo"));
    const t = armarTablero(entrada({ resenas, busquedas: [{ palabra: "restaurants", impresiones: 2228 }] }));
    expect(t.busquedas).toEqual([{ palabra: "restaurants", veces: 2228, menciones: null }]);
  });

  it("el nombre entero del local es marca aunque sus palabras sean genéricas", () => {
    const t = armarTablero(
      entrada({
        nombreComercio: "La Parrilla de Nueva Córdoba",
        busquedas: [
          { palabra: "la parrilla de nueva cordoba", impresiones: 900 },
          { palabra: "asado", impresiones: 300 },
        ],
      }),
    );
    expect(t.busquedas.map((b) => b.palabra)).toEqual(["asado"]);
  });

  it("la parte de cada uno sobre las reseñas nuevas de la zona", () => {
    const comparativas: ComparativaMes[] = [
      {
        mes: "2026-09",
        enCurso: false,
        filas: [
          { id: "propio", nombre: "Café Ejemplo", esPropio: true, nuevas: 30, rating: 4.6, deltaRating: 0 },
          { id: 1, nombre: "Panadería Norte", esPropio: false, nuevas: 10, rating: 4.7, deltaRating: 0 },
          { id: 2, nombre: "Bar", esPropio: false, nuevas: null, rating: 4.1, deltaRating: null },
        ],
        puesto: { puesto: 1, total: 2 },
        promedioCompetencia: 10,
        ratingCompetencia: 4.7,
      },
    ];
    const c = armarTablero(entrada({ comparativas })).competencia!;
    expect(c.filas.map((f) => f.parte)).toEqual([75, 25]);
    expect(c.lectura).toBe("Sos el que más reseñas nuevas suma en tu zona: el 75% del mes. Panadería Norte tiene mejor calificación (4,7).");
  });
});

describe("mapa de la zona", () => {
  it("numera a los competidores en el orden de la tabla; sin tu ubicación no hay mapa", () => {
    const competencia = {
      mes: "2026-09",
      enCurso: false,
      lectura: null,
      filas: [
        { id: 2, nombre: "B", esPropio: false, rating: 4.5, nuevas: 20, parte: 50 },
        { id: "propio" as const, nombre: "Vos", esPropio: true, rating: 4.6, nuevas: 12, parte: 30 },
        { id: 1, nombre: "A", esPropio: false, rating: 4.1, nuevas: 8, parte: 20 },
      ],
    };
    const comps = [
      { id: 1, nombre: "A", lat: 1, lng: 1 },
      { id: 3, nombre: "C", lat: 3, lng: 3 },
      { id: 2, nombre: "B", lat: 2, lng: 2 },
    ];
    expect(marcadoresZona({ lat: 0, lng: 0 }, comps, competencia).map((m) => [m.etiqueta, m.nombre])).toEqual([
      [null, "Vos"],
      ["1", "B"],
      ["2", "A"],
      ["3", "C"],
    ]);
    expect(marcadoresZona(null, comps, competencia)).toEqual([]);
  });
});

describe("varios locales", () => {
  it("suma Google día por día, junta toques y reseñas y pesa la calificación por reseñas", () => {
    const a = entrada({
      diarias: [dia("2026-10-17", { visitas: 10 })],
      taps: [toque("2026-10-19T15:00:00Z")],
      resenas: [resena("2026-10-15", 5)],
      rating: 4.8,
      totalResenas: 300,
      historico: [{ mes: "2026-09", resenasNuevas: 10, ratingPromedio: 4.8 }],
      busquedas: [{ palabra: "asado", impresiones: 100 }],
    });
    const b = entrada({
      diarias: [dia("2026-10-17", { visitas: 5 }), dia("2026-10-16", { visitas: 7 })],
      taps: [toque("2026-10-19T16:00:00Z")],
      resenas: [resena("2026-10-14", 3)],
      rating: 4.2,
      totalResenas: 100,
      historico: [{ mes: "2026-09", resenasNuevas: 4, ratingPromedio: 4.2, nuevasSinDato: true }],
      busquedas: [{ palabra: "asado", impresiones: 50 }, { palabra: "vacio", impresiones: null }],
    });
    const c = combinarEntradas([
      { nombre: "Centro", entrada: a },
      { nombre: "Norte", entrada: b },
    ]);
    expect(c.diarias).toEqual([dia("2026-10-16", { visitas: 7 }), dia("2026-10-17", { visitas: 15, visitasMaps: 12, visitasBusqueda: 8, comoLlegar: 4, llamadas: 2, clicsWeb: 2 })]);
    expect(c.taps.map((t) => t.pieza)).toEqual(["Centro · Caja", "Norte · Caja"]);
    expect(c.resenas).toHaveLength(2);
    expect(c.rating).toBeCloseTo(4.65);
    expect(c.totalResenas).toBe(400);
    expect(c.historico).toEqual([{ mes: "2026-09", resenasNuevas: 14, nuevasSinDato: true, ratingPromedio: 4.5 }]);
    expect(c.busquedas).toEqual([{ palabra: "asado", impresiones: 150 }, { palabra: "vacio", impresiones: null }]);
    expect(c.comparativas).toEqual([]);
    expect(armarTablero(c).kpis.find((k) => k.id === "toques")!.valor).toBe("2");
  });
});
