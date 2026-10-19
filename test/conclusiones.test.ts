import { describe, expect, it } from "vitest";
import {
  armarConclusiones,
  atribuirResenas,
  conclusionAlerta,
  conclusionBusquedas,
  conclusionCartel,
  conclusionDiasSemana,
  conclusionEquipo,
  conclusionPiezas,
  conclusionTemas,
  conclusionZona,
  deCada10,
  metaCalificacion,
  type DiaGoogle,
  type ResenaAnalisis,
  type TapAnalisis,
} from "@/lib/conclusiones";
import type { ComparativaMes } from "@/lib/comparativa-competencia";

const HOY = new Date("2026-10-20T15:00:00Z");
const min = 60_000;
const dia = 86_400_000;

function tap(ms: number, pieza = "Mostrador", empleado = ""): TapAnalisis {
  return { creadoEn: new Date(ms).toISOString(), linkId: pieza, pieza, empleado };
}

let sig = 1;
function resena(ms: number | null, estrellas: number, texto = "", fechaMs?: number): ResenaAnalisis {
  const f = new Date(fechaMs ?? ms ?? HOY.getTime());
  return {
    id: sig++,
    creadoEn: ms === null ? null : new Date(ms).toISOString(),
    fecha: f.toISOString().slice(0, 10),
    estrellas,
    texto,
    deGoogle: true,
  };
}

describe("deCada10", () => {
  it("redondea a una fracción legible", () => {
    expect(deCada10(0.41)).toBe("4 de cada 10");
    expect(deCada10(0.02)).toBe("menos de 1 de cada 10");
    expect(deCada10(0.98)).toBe("casi todas las");
  });
});

describe("atribuirResenas", () => {
  it("une la reseña al toque anterior dentro de la ventana, y cada toque una sola vez", () => {
    const base = HOY.getTime() - dia;
    const taps = [tap(base), tap(base + 5 * min, "Mesa")];
    const r1 = resena(base + 10 * min, 5); // toma el toque más cercano (Mesa)
    const r2 = resena(base + 12 * min, 5); // el de Mesa ya se usó → Mostrador
    const r3 = resena(base + 13 * min, 5); // no quedan toques
    const r4 = resena(base - 1 * min, 5); // anterior a todo toque
    const a = atribuirResenas(taps, [r1, r2, r3, r4]);
    expect(a.get(r1.id)?.pieza).toBe("Mesa");
    expect(a.get(r2.id)?.pieza).toBe("Mostrador");
    expect(a.has(r3.id)).toBe(false);
    expect(a.has(r4.id)).toBe(false);
  });

  it("ignora toques fuera de la ventana y reseñas sin hora", () => {
    const base = HOY.getTime() - dia;
    const r1 = resena(base + 31 * min, 5);
    const r2 = resena(null, 5, "", base);
    const a = atribuirResenas([tap(base)], [r1, r2]);
    expect(a.size).toBe(0);
  });
});

/** n reseñas del cartel (con toque 5 min antes) y m solas, en los últimos días. */
function escenario(nCartel: number, estCartel: number, nSolas: number, estSolas: number, pieza = "Mostrador") {
  const taps: TapAnalisis[] = [];
  const resenas: ResenaAnalisis[] = [];
  for (let i = 0; i < nCartel; i++) {
    const t = HOY.getTime() - (i + 1) * dia;
    taps.push(tap(t, pieza));
    resenas.push(resena(t + 5 * min, estCartel));
  }
  for (let i = 0; i < nSolas; i++) {
    resenas.push(resena(HOY.getTime() - (i + 1) * dia + 6 * 3600_000, estSolas));
  }
  return { taps, resenas };
}

describe("conclusionCartel", () => {
  it("dice que las del cartel son mejores cuando lo son", () => {
    const { taps, resenas } = escenario(6, 5, 9, 4);
    const c = conclusionCartel(resenas, atribuirResenas(taps, resenas));
    expect(c?.titulo).toBe("El cartel trae 4 de cada 10 reseñas, y son las mejores.");
    expect(c?.barras).toHaveLength(2);
  });

  it("también lo dice cuando no hay diferencia", () => {
    const { taps, resenas } = escenario(6, 5, 6, 5);
    const c = conclusionCartel(resenas, atribuirResenas(taps, resenas));
    expect(c?.titulo).toContain("con la misma calificación");
  });

  it("no concluye con pocos casos", () => {
    const { taps, resenas } = escenario(3, 5, 9, 4);
    expect(conclusionCartel(resenas, atribuirResenas(taps, resenas))).toBeNull();
  });
});

describe("conclusionPiezas", () => {
  it("compara la mejor contra la peor", () => {
    const { taps, resenas } = escenario(6, 5, 0, 5, "Mostrador");
    // 6 toques más del mostrador sin reseña (12 toques, 6 reseñas) y 12 de mesa con 1 reseña
    for (let i = 0; i < 6; i++) taps.push(tap(HOY.getTime() - (i + 1) * dia + 3 * 3600_000));
    for (let i = 0; i < 12; i++) taps.push(tap(HOY.getTime() - (i + 1) * dia + 8 * 3600_000, "Mesa"));
    resenas.push(resena(HOY.getTime() - 1 * dia + 8 * 3600_000 + 2 * min, 4));
    const c = conclusionPiezas(taps, atribuirResenas(taps, resenas));
    expect(c?.titulo).toBe("Mostrador rinde 6 veces más que Mesa.");
    expect(c?.tarea).toContain("Mesa");
  });

  it("avisa cuando una pieza no trae ninguna reseña", () => {
    const { taps, resenas } = escenario(10, 5, 0, 5, "Mostrador");
    for (let i = 0; i < 15; i++) taps.push(tap(HOY.getTime() - (i + 1) * dia + 8 * 3600_000, "QR vidriera"));
    const c = conclusionPiezas(taps, atribuirResenas(taps, resenas));
    expect(c?.titulo).toBe("QR vidriera tuvo 15 toques y ninguna reseña. En Mostrador, casi cada toque termina en reseña.");
  });
});

describe("conclusionEquipo", () => {
  it("suma tarjeta y menciones sin contar dos veces", () => {
    const resenas: ResenaAnalisis[] = [];
    const taps: TapAnalisis[] = [];
    for (let i = 0; i < 3; i++) {
      const t = HOY.getTime() - (i + 1) * dia;
      taps.push(tap(t, "Tarjeta de Juli", "Juli"));
      resenas.push(resena(t + 2 * min, 5, i === 0 ? "Juli un sol" : "Muy bien"));
    }
    for (let i = 0; i < 3; i++) resenas.push(resena(HOY.getTime() - (i + 5) * dia, 5, "Nos atendió Juli, genial"));
    for (let i = 0; i < 6; i++) resenas.push(resena(HOY.getTime() - (i + 10) * dia, 4, "Rico"));
    const c = conclusionEquipo(resenas, atribuirResenas(taps, resenas), ["Juli", "Tomi"]);
    expect(c?.titulo).toBe("Juli está detrás de 5 de cada 10 reseñas.");
    expect(c?.barras[0].detalle).toBe("6 reseñas: 3 por su tarjeta, 3 que mencionan su nombre");
  });
});

describe("conclusionTemas", () => {
  it("simula la calificación sin el peor tema", () => {
    const resenas = [
      ...Array.from({ length: 30 }, () => resena(null, 5, "Riquísimo todo", HOY.getTime() - 10 * dia)),
      ...Array.from({ length: 6 }, () => resena(null, 2, "Tardaron mucho en la caja", HOY.getTime() - 10 * dia)),
    ];
    const c = conclusionTemas(resenas);
    expect(c?.titulo).toMatch(/^Sin las quejas por (espera y demora|caja y cobro) tendrías 5,0 en vez de 4,5\.$/);
    expect(c?.barras.find((b) => b.etiqueta === "Calidad y sabor")?.tono).toBe("bien");
  });

  it("nada que concluir si ningún tema está por debajo", () => {
    const resenas = Array.from({ length: 12 }, () => resena(null, 5, "Excelente atención", HOY.getTime()));
    expect(conclusionTemas(resenas)).toBeNull();
  });
});

describe("conclusionAlerta", () => {
  it("avisa de un tema de queja que aparece de golpe", () => {
    const viejas = Array.from({ length: 5 }, (_, i) => resena(null, 5, "Rico", HOY.getTime() - (150 + i) * dia));
    const nuevas = Array.from({ length: 3 }, (_, i) => resena(null, 2, "El café estaba frío", HOY.getTime() - (i + 2) * dia));
    const c = conclusionAlerta([...viejas, ...nuevas], HOY);
    expect(c?.titulo).toContain("comida fría o tibia apareció en 3 quejas");
  });

  it("no avisa sin historia suficiente", () => {
    const nuevas = Array.from({ length: 3 }, (_, i) => resena(null, 2, "Frío", HOY.getTime() - (i + 2) * dia));
    expect(conclusionAlerta(nuevas, HOY)).toBeNull();
  });
});

function mesComp(mes: string, propio: number, otros: number[], enCurso = false): ComparativaMes {
  return {
    mes,
    enCurso,
    filas: [
      { id: "propio", nombre: "Vos", esPropio: true, nuevas: propio, rating: 4.6, deltaRating: 0 },
      ...otros.map((n, i) => ({ id: i + 1, nombre: `C${i}`, esPropio: false, nuevas: n, rating: 4.5, deltaRating: 0 })),
    ],
    puesto: null,
    promedioCompetencia: null,
    ratingCompetencia: null,
  };
}

describe("conclusionZona", () => {
  it("compara la parte de reseñas nuevas contra meses anteriores", () => {
    const comp = [
      mesComp("2026-10", 20, [20, 20], true),
      mesComp("2026-09", 38, [30, 30, 22]),
      mesComp("2026-08", 20, [40, 30, 10]),
      mesComp("2026-07", 10, [40, 30, 20]),
    ];
    const c = conclusionZona(comp);
    expect(c?.titulo).toBe(
      "En septiembre te quedaste con 3 de cada 10 reseñas nuevas entre vos y tus 3 competidores. En julio eran 1 de cada 10.",
    );
    expect(c?.barras).toHaveLength(4);
  });
});

describe("metaCalificacion", () => {
  it("cuenta las reseñas de 5★ que faltan para la décima siguiente", () => {
    // 100 reseñas: 63 de 5★ y 37 de 4★ → 4,63 (Google muestra 4,6)
    const resenas = [
      ...Array.from({ length: 63 }, () => resena(null, 5, "", HOY.getTime() - 200 * dia)),
      ...Array.from({ length: 37 }, () => resena(null, 4, "", HOY.getTime() - 200 * dia)),
    ];
    const m = metaCalificacion(resenas, 100, HOY);
    expect(m).toMatchObject({ actual: "4,6", siguiente: "4,7", faltan: 6, semanas: null, compensaUnaMala: 10 });
  });

  it("no calcula sin el promedio exacto", () => {
    const resenas = Array.from({ length: 30 }, () => resena(null, 5));
    expect(metaCalificacion(resenas, 100, HOY)).toBeNull();
  });
});

describe("armarConclusiones", () => {
  it("con pocos datos no inventa nada", () => {
    const r = armarConclusiones({ taps: [], resenas: [], totalGoogle: null, comparativas: [], empleados: [], hoy: HOY });
    expect(r).toEqual({ funciona: [], cuesta: [], meta: null, tareas: [] });
  });
});

/** 8 semanas de días hasta el 2026-10-18 (domingo). */
function semanas(comoLlegarPorDia: (w: number) => number): DiaGoogle[] {
  const dias: DiaGoogle[] = [];
  const fin = Date.UTC(2026, 9, 18, 12);
  for (let i = 0; i < 56; i++) {
    const d = new Date(fin - i * dia);
    dias.push({ fecha: d.toISOString().slice(0, 10), comoLlegar: comoLlegarPorDia(d.getUTCDay()) });
  }
  return dias;
}

/** Toques a las 13 h de Córdoba (16 UTC), `porDia(w)` por cada día. */
function toquesSemanas(porDia: (w: number) => number): TapAnalisis[] {
  const out: TapAnalisis[] = [];
  const fin = Date.UTC(2026, 9, 18, 16);
  for (let i = 0; i < 56; i++) {
    const t = fin - i * dia;
    const w = new Date(t).getUTCDay();
    for (let k = 0; k < porDia(w); k++) out.push(tap(t + k * min));
  }
  return out;
}

describe("conclusionDiasSemana", () => {
  it("encuentra el día con mucha gente y pocos toques", () => {
    const diarias = semanas((w) => (w === 0 ? 12 : 6)); // domingo: el doble de cómo llegar
    const taps = toquesSemanas((w) => (w === 0 ? 1 : 3)); // pero 1 toque contra 3
    const c = conclusionDiasSemana(diarias, taps);
    expect(c?.titulo).toBe(
      "Los domingos te piden cómo llegar más que ningún otro día, pero el cartel se toca 6 veces menos que el resto de la semana.",
    );
    expect(c?.tarea).toBe("Que el turno del domingo ofrezca el cartel al cobrar");
    expect(c?.barras[0].etiqueta).toBe("Lunes");
  });

  it("no confunde un día cerrado con un día flojo", () => {
    const diarias = semanas((w) => (w === 0 ? 12 : 6));
    const taps = toquesSemanas((w) => (w === 0 ? 0 : 3)); // domingo cerrado: ningún toque
    expect(conclusionDiasSemana(diarias, taps)).toBeNull();
  });

  it("si todos los días rinden parecido, no dice nada", () => {
    expect(conclusionDiasSemana(semanas(() => 6), toquesSemanas(() => 3))).toBeNull();
  });

  it("sin datos de Google, nada", () => {
    expect(conclusionDiasSemana([], toquesSemanas(() => 3))).toBeNull();
  });
});

describe("conclusionBusquedas", () => {
  const resenasCon = (textos: [string, number][]) =>
    textos.flatMap(([texto, n]) => Array.from({ length: n }, () => resena(null, 5, texto, HOY.getTime())));

  it("marca lo que se busca y ninguna reseña menciona", () => {
    const resenas = resenasCon([["Excelente café de especialidad", 8], ["Muy buena atención", 4]]);
    const c = conclusionBusquedas(
      [
        { palabra: "café martínez", impresiones: 900 },
        { palabra: "café de especialidad córdoba", impresiones: 410 },
        { palabra: "brunch", impresiones: 280 },
        { palabra: "desayuno cerca", impresiones: 120 },
        { palabra: "medialunas", impresiones: null },
      ],
      resenas,
      "Café Martínez",
    );
    expect(c?.titulo).toBe('Te buscan por "brunch" (280 veces en 3 meses) y casi ninguna reseña lo menciona.');
    expect(c?.barras.map((b) => b.etiqueta)).toEqual([
      '"café de especialidad córdoba"',
      '"brunch"',
      '"desayuno cerca"',
    ]);
    expect(c?.barras[0].detalle).toBe("8 reseñas lo mencionan");
    expect(c?.nota).toBe("5 de cada 10 búsquedas no incluyen tu nombre: gente que te encontró sin conocerte.");
  });

  it("si lo más buscado también es lo más elogiado, lo dice", () => {
    const resenas = resenasCon([["Excelente café de especialidad", 8], ["Rico el brunch", 2], ["Desayuno top", 2]]);
    const c = conclusionBusquedas(
      [
        { palabra: "café de especialidad", impresiones: 410 },
        { palabra: "brunch", impresiones: 280 },
        { palabra: "desayuno", impresiones: 120 },
      ],
      resenas,
      "Lo de Pepe",
    );
    expect(c?.titulo).toBe('"café de especialidad" es de lo que más te buscan y de lo que más te elogian.');
  });

  it("no le pide a las reseñas que nombren el rubro del negocio", () => {
    const resenas = resenasCon([["Excelente atención", 12]]);
    const c = conclusionBusquedas(
      [
        { palabra: "parrilla nueva córdoba", impresiones: 500 },
        { palabra: "brunch", impresiones: 280 },
        { palabra: "asado cerca", impresiones: 120 },
        { palabra: "vacío", impresiones: 100 },
      ],
      resenas,
      "La Parrilla de Nueva Córdoba",
    );
    expect(c?.titulo).toContain('"brunch"');
    expect(c?.barras.map((b) => b.etiqueta)).not.toContain('"parrilla nueva córdoba"');
  });

  it("sin búsquedas suficientes, nada", () => {
    const resenas = resenasCon([["Rico", 12]]);
    expect(conclusionBusquedas([{ palabra: "brunch", impresiones: 40 }], resenas, "X")).toBeNull();
  });
});
