import { describe, expect, it } from "vitest";
import {
  cruceAnual,
  cruceCadena,
  cruceCartel,
  cruceFrescas,
  cruceGlobal,
  cruceSemanas,
  esBusquedaDeMarca,
  estadistica,
  fmtCambio,
  fmtPuntos,
  laboratorioComercio,
  lunes,
  pearson,
  sumarDias,
  veredicto,
  type DiaLab,
  type ResenaLab,
  type EntradaLab,
} from "@/lib/laboratorio";

const HOY = "2026-10-22";

/** Días desde `desde` hasta ayer de HOY, con las vistas que diga `vistas`. */
function dias(desde: string, vistas: (f: string, i: number) => number, llegar = 0.05): DiaLab[] {
  const out: DiaLab[] = [];
  for (let f = desde, i = 0; f < HOY; f = sumarDias(f, 1), i++) {
    const v = vistas(f, i);
    out.push({ fecha: f, visitas: v, comoLlegar: Math.round(v * llegar), llamadas: 0 });
  }
  return out;
}

function entrada(p: Partial<EntradaLab>): EntradaLab {
  return { id: "x", nombre: "Parrilla Don Tito", diarias: [], resenas: [], toques: [], busquedas: [], hoy: HOY, ...p };
}

// Reseñas al azar (más desde el cartel) y vistas con ruido diario del ±15%
// y temporada; cada reseña suma `efecto` a las vistas de los 14 días siguientes.
function azar(semilla: number, efecto: number): EntradaLab {
  let x = semilla * 7919;
  const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  const resenas: ResenaLab[] = [];
  const extra = new Map<string, number>();
  for (let f = "2025-04-21"; f < HOY; f = sumarDias(f, 1)) {
    if (r() < (f >= "2026-03-01" ? 0.8 : 0.25)) {
      resenas.push({ id: resenas.length + 1, fecha: f, creadoEn: null });
      for (let k = 1; k < 15; k++) extra.set(sumarDias(f, k), (extra.get(sumarDias(f, k)) ?? 0) + 1);
    }
  }
  const diarias = dias("2025-04-21", (f, i) =>
    Math.round(150 * (1 + 0.15 * Math.sin((2 * Math.PI * i) / 365)) * (1 + efecto * (extra.get(f) ?? 0)) * (0.85 + 0.3 * r())),
  );
  return entrada({ diarias, resenas });
}

describe("estadística", () => {
  it("pearson: relación perfecta, inversa y sin variación", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
    expect(pearson([1, 2, 3, 4], [5, 5, 5, 5])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });

  it("veredicto: pocos casos, sin señal, en contra, débil y fuerte", () => {
    expect(veredicto({ r: 0.9, n: 5, nEfectivo: 5, t: 4 }, 5, 20)).toBe("pocos_datos");
    expect(veredicto(null, 30, 20)).toBe("sin_senal");
    expect(veredicto({ r: 0.1, n: 30, nEfectivo: 30, t: 0.5 }, 30, 20)).toBe("sin_senal");
    expect(veredicto({ r: -0.5, n: 30, nEfectivo: 30, t: -3 }, 30, 20)).toBe("en_contra");
    expect(veredicto({ r: 0.25, n: 100, nEfectivo: 100, t: 2.5 }, 100, 20)).toBe("debil");
    expect(veredicto({ r: 0.5, n: 30, nEfectivo: 30, t: 3 }, 30, 20)).toBe("fuerte");
  });

  it("semanas seguidas parecidas cuentan como menos casos", () => {
    // Dos series que suben despacio: muy correlacionadas consigo mismas.
    const xs = Array.from({ length: 60 }, (_, i) => Math.sin(i / 8));
    const ys = Array.from({ length: 60 }, (_, i) => Math.sin(i / 8 + 0.5) + (i % 2) * 0.1);
    const e = estadistica(xs, ys)!;
    expect(e.nEfectivo).toBeLessThan(20);
  });

  it("con pocos casos hace falta un t mucho más alto", () => {
    expect(veredicto({ r: 0.95, n: 5, nEfectivo: 3, t: 3.1 }, 5, 4)).toBe("sin_senal");
    expect(veredicto({ r: 0.5, n: 100, nEfectivo: 100, t: 2.1 }, 100, 20)).toBe("fuerte");
  });

  it("t crece con los casos", () => {
    const xs = Array.from({ length: 40 }, (_, i) => i);
    const ys = xs.map((x) => x + (x % 5) * 3);
    const e = estadistica(xs, ys)!;
    expect(e.n).toBe(40);
    expect(e.t).toBeGreaterThan(2);
  });

  it("fechas y formato", () => {
    expect(lunes("2026-10-22")).toBe("2026-10-19");
    expect(lunes("2026-10-19")).toBe("2026-10-19");
    expect(lunes("2026-10-25")).toBe("2026-10-19");
    expect(fmtCambio(0.183)).toBe("+18%");
    expect(fmtCambio(-0.05)).toBe("−5%");
    expect(fmtCambio(null)).toBe("—");
    expect(fmtPuntos(0.44)).toBe("+0,4");
    expect(fmtPuntos(-2)).toBe("−2");
  });
});

describe("cruce de semanas", () => {
  // Semanas con 6 reseñas cada 3; las 2 semanas siguientes a cada una, +30% de vistas.
  const inicio = lunes("2025-06-02");
  const semanaDe = (f: string) => Math.round((Date.parse(lunes(f)) - Date.parse(inicio)) / (7 * 86_400_000));
  const diarias = dias(inicio, (f) => (semanaDe(f) % 3 === 0 ? 100 : 130));
  const resenas: ResenaLab[] = [];
  for (let w = 0, id = 1; w < 70; w += 3) {
    for (let k = 0; k < 6; k++) resenas.push({ id: id++, fecha: sumarDias(inicio, w * 7 + k), creadoEn: null });
  }

  it("encuentra la señal y la cuenta por grupo", () => {
    const { cruce, vistasPorResena } = cruceSemanas(entrada({ diarias, resenas }));
    expect(cruce.veredicto).toBe("fuerte");
    expect(cruce.estadistica!.n).toBeGreaterThanOrEqual(20);
    const [bajo, , alto] = cruce.barras;
    expect(alto.valor!).toBeGreaterThan(bajo.valor!);
    expect(vistasPorResena).toBeGreaterThan(0);
    expect(cruce.lectura).toContain("personas más que te ven por semana");
    expect(cruce.lectura).toMatch(/Después de una suba de reseñas, las vistas cambiaron \+\d+%/);
  });

  it("sin reseñas de Google lo dice", () => {
    const { cruce, vistasPorResena } = cruceSemanas(entrada({ diarias }));
    expect(cruce.veredicto).toBe("pocos_datos");
    expect(cruce.lectura).toContain("No hay reseñas de Google");
    expect(vistasPorResena).toBeNull();
  });

  it("vistas planas: sin señal, no una relación inventada", () => {
    const planas = dias(inicio, () => 100);
    const { cruce } = cruceSemanas(entrada({ diarias: planas, resenas }));
    expect(cruce.veredicto).toBe("sin_senal");
  });

  it("pocas semanas: pocos datos", () => {
    const cortas = dias("2026-08-03", () => 100);
    expect(cruceSemanas(entrada({ diarias: cortas, resenas })).cruce.veredicto).toBe("pocos_datos");
  });

  it("los últimos días en cero (atraso de Google) no cuentan como caída", () => {
    const conCola = [...diarias.slice(0, -5), ...diarias.slice(-5).map((d) => ({ ...d, visitas: 0 }))];
    expect(cruceSemanas(entrada({ diarias: conCola, resenas })).cruce.veredicto).toBe("fuerte");
  });
});

describe("cruce de semanas con datos simulados al azar", () => {
  const conSenal = (efecto: number) =>
    Array.from({ length: 40 }, (_, i) => cruceSemanas(azar(i + 1, efecto)).cruce.veredicto).filter(
      (v) => v === "fuerte" || v === "debil",
    ).length;

  it("sin efecto real, casi nunca ve una señal", () => {
    // El umbral es del 95%: alguna señal falsa cada tanto es lo esperable.
    expect(conSenal(0)).toBeLessThanOrEqual(4);
  });

  it("la conversión no depende de las reseñas en estos datos: casi nunca ve una señal", () => {
    const n = Array.from({ length: 40 }, (_, i) => cruceFrescas(azar(i + 1, 0.03)).veredicto).filter(
      (v) => v === "fuerte" || v === "debil" || v === "en_contra",
    ).length;
    expect(n).toBeLessThanOrEqual(3);
  });

  it("con un efecto chico (3% por reseña), la ve casi siempre", () => {
    expect(conSenal(0.03)).toBeGreaterThanOrEqual(34);
  });
});

describe("año contra año", () => {
  it("compara cada mes con el mismo del año anterior", () => {
    const diarias = dias("2025-01-01", (f) => (f >= "2026-01-01" ? 150 : 100));
    const resenas = [
      { id: 1, fecha: "2026-09-10", creadoEn: null },
      { id: 2, fecha: "2026-09-11", creadoEn: null },
    ];
    const c = cruceAnual(entrada({ diarias, resenas }));
    expect(c.tabla!.filas).toHaveLength(6);
    expect(c.barras.every((b) => Math.abs(b.valor! - 0.5) < 1e-9)).toBe(true);
    expect(c.lectura).toContain("septiembre 2026 contra septiembre 2025: +50% de vistas");
    expect(c.lectura).toContain("2 reseñas nuevas contra 0");
  });

  it("sin año anterior: pocos datos", () => {
    const c = cruceAnual(entrada({ diarias: dias("2026-03-01", () => 100) }));
    expect(c.veredicto).toBe("pocos_datos");
    expect(c.tabla!.filas).toHaveLength(0);
  });
});

describe("antes y después del cartel", () => {
  const toque = "2026-06-15";
  const toques = [{ fecha: toque, creadoEn: `${toque}T15:00:00.000Z` }];

  it("salto con el cartel y año anterior plano: señal fuerte", () => {
    const diarias = dias("2025-01-01", (f) => (f >= toque ? 130 : 100));
    const c = cruceCartel(entrada({ diarias, toques }));
    expect(c.veredicto).toBe("fuerte");
    expect(c.barras[0].valor).toBeCloseTo(0.3);
    expect(c.barras[1].valor).toBeCloseTo(0);
    expect(c.lectura).toContain("Descontando la temporada: +30% de vistas");
  });

  it("el mismo salto el año anterior (temporada): sin señal", () => {
    const diarias = dias("2025-01-01", (f) => (f.slice(5) >= toque.slice(5) && f.slice(5) < "10-01" ? 130 : 100));
    const c = cruceCartel(entrada({ diarias, toques }));
    expect(c.veredicto).toBe("sin_senal");
  });

  it("sin año anterior: como mucho débil y lo aclara", () => {
    const diarias = dias("2026-02-01", (f) => (f >= toque ? 130 : 100));
    const c = cruceCartel(entrada({ diarias, toques }));
    expect(c.veredicto).toBe("debil");
    expect(c.lectura).toContain("no se puede descontar la temporada");
  });

  it("te descubren: búsquedas sin el nombre del comercio, antes y después", () => {
    const diarias = dias("2025-01-01", () => 100);
    const busquedas = [
      ...["2026-03", "2026-04", "2026-05"].map((mes) => ({ mes, palabra: "parrilla cerca", impresiones: 100 })),
      ...["2026-07", "2026-08", "2026-09"].map((mes) => ({ mes, palabra: "parrilla cerca", impresiones: 150 })),
      ...["2026-03", "2026-07"].map((mes) => ({ mes, palabra: "don tito", impresiones: 999 })),
    ];
    const c = cruceCartel(entrada({ diarias, toques, busquedas }));
    expect(c.barras[4].valor).toBeCloseTo(0.5);
  });

  it("sin toques o con cartel muy nuevo: pocos datos", () => {
    const diarias = dias("2025-01-01", () => 100);
    expect(cruceCartel(entrada({ diarias })).veredicto).toBe("pocos_datos");
    const nuevo = [{ fecha: "2026-10-10", creadoEn: "2026-10-10T15:00:00.000Z" }];
    expect(cruceCartel(entrada({ diarias, toques: nuevo })).lectura).toContain("hacen falta 28");
  });

  it("la marca: el nombre sin rubro ni barrio", () => {
    const deMarca = esBusquedaDeMarca("Parrilla Don Tito Nueva Córdoba");
    expect(deMarca("don tito")).toBe(true);
    expect(deMarca("parrilla nueva cordoba")).toBe(false);
    const otra = esBusquedaDeMarca("Café Silvestre");
    expect(otra("silvestre cafe")).toBe(true);
    expect(otra("cafe cerca")).toBe(false);
  });
});

describe("la cadena", () => {
  const diarias = dias("2026-04-01", () => 100, 0.1);
  const toques = Array.from({ length: 40 }, (_, i) => {
    const f = sumarDias("2026-08-01", i);
    return { fecha: f, creadoEn: `${f}T18:00:00.000Z` };
  });
  // 8 de cada 40 toques terminan en reseña a los 10 minutos.
  const resenas = toques.slice(0, 8).map((t, i) => ({ id: i + 1, fecha: t.fecha, creadoEn: `${t.fecha}T18:10:00.000Z` }));

  it("encadena reseñas por toque, vistas por reseña y conversión", () => {
    const c = cruceCadena(entrada({ diarias, toques, resenas }), 50);
    expect(c.barras[1].valor).toBeCloseTo(2); // 10 × 8/40
    expect(c.barras[2].valor).toBeCloseTo(200); // 2 × 50 × 2 semanas
    expect(c.barras[3].valor).toBeCloseTo(20); // 200 × 10%
    expect(c.lectura).toContain("Cada 10 toques ≈ 2 reseñas ≈ +200 personas");
  });

  it("sin relación de semanas, se queda en las reseñas", () => {
    const c = cruceCadena(entrada({ diarias, toques, resenas }), null);
    expect(c.veredicto).toBe("pocos_datos");
    expect(c.lectura).toContain("Cada 10 toques ≈ 2 reseñas");
  });

  it("pocos toques: pocos datos", () => {
    expect(cruceCadena(entrada({ diarias, toques: toques.slice(0, 10), resenas }), 50).veredicto).toBe("pocos_datos");
  });
});

describe("reseñas y conversión", () => {
  it("si después de las semanas con reseñas convierte más, lo ve", () => {
    const inicio = lunes("2025-06-02");
    const semanaDe = (f: string) => Math.round((Date.parse(lunes(f)) - Date.parse(inicio)) / (7 * 86_400_000));
    const resenas: ResenaLab[] = [];
    for (let w = 0, id = 1; w < 70; w += 3) {
      for (let k = 0; k < 6; k++) resenas.push({ id: id++, fecha: sumarDias(inicio, w * 7 + k), creadoEn: null });
    }
    const diarias = dias(inicio, () => 200).map((d) => ({ ...d, comoLlegar: (semanaDe(d.fecha) - 1) % 3 === 0 ? 16 : 10 }));
    const c = cruceFrescas(entrada({ diarias, resenas }));
    expect(["fuerte", "debil"]).toContain(c.veredicto);
    expect(c.barras[2].valor!).toBeGreaterThan(c.barras[0].valor!);
    expect(c.unidad).toBe("puntos");
    expect(c.lectura).toContain("Después de una suba de reseñas, de cada 100 que te ven, +3");
  });
});

describe("todos los comercios juntos", () => {
  it("junta las semanas de todos y da la cifra cada 10 reseñas", () => {
    const c = cruceGlobal([1, 2, 3].map((i) => ({ ...azar(i, 0.03), id: `c${i}` })));
    expect(c.veredicto).toBe("fuerte");
    expect(c.lectura).toContain("cada 10 reseñas nuevas se asocian a +");
    expect(c.lectura).toContain("de 3 comercios");
  });

  it("sin efecto real, casi nunca ve una señal (umbral del 95%)", () => {
    const veredictos = Array.from({ length: 20 }, (_, k) =>
      cruceGlobal([1, 2, 3].map((i) => ({ ...azar(100 + k * 3 + i, 0), id: `c${i}` }))).veredicto,
    );
    expect(veredictos.filter((v) => v !== "sin_senal").length).toBeLessThanOrEqual(3);
  });

  it("con menos de 3 comercios: pocos datos", () => {
    expect(cruceGlobal([1, 2].map((i) => ({ ...azar(i, 0.03), id: `c${i}` }))).veredicto).toBe("pocos_datos");
  });
});

describe("laboratorio de un comercio", () => {
  it("arma los 5 cruces aunque no haya nada", () => {
    const lab = laboratorioComercio(entrada({}));
    expect(lab.cruces.map((c) => c.id)).toEqual(["semanas", "anual", "cartel", "cadena", "frescas"]);
    expect(lab.cruces.every((c) => c.veredicto === "pocos_datos")).toBe(true);
    expect(lab.semanasCompletas).toBe(0);
  });
});
