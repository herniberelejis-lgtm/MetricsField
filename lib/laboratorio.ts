// Laboratorio de cruces (solo para el equipo, /admin/laboratorio).
//
// Cruza las reseñas y los toques al cartel con lo que Google informa de la
// ficha (vistas, "cómo llegar", llamadas, búsquedas), para ver con datos
// reales si la señal existe y qué tan fuerte es ANTES de mostrarle algo a un
// cliente. Todo es asociación, nunca causa: influyen la temporada, los
// feriados y la competencia. Cada cruce dice cuántos casos tiene y, si no
// alcanza, lo dice en vez de inventar.
//
// Puro: sin base ni red. La carga está en lib/db/laboratorio.ts.

import { atribuirResenas, PALABRAS_GENERICAS, RUBROS, tokens, type ResenaAnalisis, type TapAnalisis } from "./conclusiones";

// ---------- entrada ----------

export interface DiaLab {
  fecha: string; // 'YYYY-MM-DD'
  visitas: number; // Maps + Búsqueda
  comoLlegar: number;
  llamadas: number;
}

export interface ResenaLab {
  id: number;
  fecha: string; // 'YYYY-MM-DD', hora de Córdoba
  creadoEn: string | null; // ISO, si se conoce
}

export interface ToqueLab {
  fecha: string; // 'YYYY-MM-DD', hora de Córdoba
  creadoEn: string; // ISO
}

export interface BusquedaLab {
  mes: string; // 'YYYY-MM'
  palabra: string;
  impresiones: number | null;
}

export interface EntradaLab {
  id: string;
  nombre: string;
  diarias: DiaLab[];
  /** Solo las reseñas que vinieron de Google (con fecha real). */
  resenas: ResenaLab[];
  toques: ToqueLab[];
  busquedas: BusquedaLab[];
  hoy: string; // 'YYYY-MM-DD'
}

// ---------- salida ----------

/** fuerte/débil: relación positiva clara; sin_senal: no se distingue del
 * azar; en_contra: relación al revés; pocos_datos: no alcanza para decir. */
export type Veredicto = "fuerte" | "debil" | "sin_senal" | "en_contra" | "pocos_datos";

export interface Estadistica {
  /** Correlación de Pearson, de -1 a 1. */
  r: number;
  /** Casos (semanas, meses…). */
  n: number;
  /** Casos que cuentan como independientes: semanas seguidas se parecen
   * entre sí, y contarlas como sueltas inventa señales donde no hay. */
  nEfectivo: number;
  /** t de la correlación con los casos efectivos: |t| ≥ 2 es, a grandes
   * rasgos, "no es casualidad". */
  t: number;
}

export interface BarraLab {
  etiqueta: string;
  valor: number | null;
  /** Casos detrás del valor (semanas, meses…); null si no aplica. */
  n: number | null;
}

/** Cómo leer el valor de las barras: cambio en % (con signo), cambio en
 * puntos cada 100 (con signo), tasa cada 100, o cantidad. */
export type Unidad = "cambio" | "puntos" | "cada100" | "cantidad";

export type IdCruce = "semanas" | "anual" | "cartel" | "cadena" | "frescas" | "global";

export interface Cruce {
  id: IdCruce;
  titulo: string;
  veredicto: Veredicto;
  /** La frase para el cliente si la señal está, o qué falta / qué se vio. */
  lectura: string;
  estadistica: Estadistica | null;
  barras: BarraLab[];
  unidad: Unidad;
  tabla?: { columnas: string[]; filas: string[][] };
  comoLoCalculamos: string;
}

export interface LabComercio {
  id: string;
  nombre: string;
  semanasCompletas: number;
  diasConDatos: number;
  resenasGoogle: number;
  toques: number;
  cruces: Cruce[];
}

// ---------- estadística ----------

function promedio(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = promedio(xs);
  const my = promedio(ys);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Pendiente de la recta de mínimos cuadrados de ys sobre xs. */
export function pendiente(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = promedio(xs);
  const my = promedio(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  return sxx === 0 ? null : sxy / sxx;
}

/** Correlación de cada valor con el siguiente (lag 1). */
function autocorrelacion(xs: number[]): number {
  return pearson(xs.slice(0, -1), xs.slice(1)) ?? 0;
}

/** Los casos tienen que venir en orden de tiempo. La autocorrelación de las
 * dos series achica los casos efectivos (Bretherton et al., 1999). */
export function estadistica(xs: number[], ys: number[]): Estadistica | null {
  const r = pearson(xs, ys);
  if (r === null) return null;
  const n = xs.length;
  const rho = Math.max(0, autocorrelacion(xs) * autocorrelacion(ys));
  const nEfectivo = Math.max(3, Math.min(n, (n * (1 - rho)) / (1 + rho)));
  const t = r * Math.sqrt((nEfectivo - 2) / Math.max(1e-9, 1 - r * r));
  return { r, n, nEfectivo, t };
}

/** Umbral de |t| para el 95% (dos colas) con `gl` grados de libertad: cerca
 * de 2 con muchos casos, mucho más con pocos (con 3 casos, 12,7). */
export function tCritico(gl: number): number {
  if (gl < 1.5) return 12.71;
  if (gl < 2.5) return 4.3;
  return 1.96 + 2.4 / gl + 3 / (gl * gl);
}

/** `casos` aparte de la estadística: con casos de sobra pero sin variación
 * (siempre lo mismo) no hay correlación que calcular, y eso es "sin señal". */
export function veredicto(e: Estadistica | null, casos: number, minCasos: number): Veredicto {
  if (casos < minCasos) return "pocos_datos";
  if (!e || Math.abs(e.t) < tCritico(e.nEfectivo - 2)) return "sin_senal";
  if (e.r < 0) return "en_contra";
  return e.r >= 0.3 ? "fuerte" : "debil";
}

// ---------- fechas ----------

const DIA = 86_400_000;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function ms(f: string): number {
  return Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
}
function aFecha(m: number): string {
  return new Date(m).toISOString().slice(0, 10);
}
export function sumarDias(f: string, n: number): string {
  return aFecha(ms(f) + n * DIA);
}
/** Lunes de la semana de `f`. */
export function lunes(f: string): string {
  const d = new Date(ms(f)).getUTCDay();
  return sumarDias(f, -((d + 6) % 7));
}
function sumarMeses(mes: string, n: number): string {
  const total = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1 + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}
function nombreMes(mes: string): string {
  return `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
}

// ---------- formato ----------

export function fmtCambio(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  const p = Math.round(x * 100);
  return `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p)}%`;
}
function fmtNum(x: number, dec = 0): string {
  return x.toLocaleString("es-AR", { maximumFractionDigits: dec });
}

// ---------- series ----------

/** Días con datos de Google, sin los últimos en cero: Google publica con
 * unos días de atraso y el sync puede dejar esos días en 0. */
function diasValidos(diarias: DiaLab[]): DiaLab[] {
  const orden = [...diarias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let fin = orden.length;
  while (fin > 0 && orden[fin - 1].visitas === 0) fin--;
  return orden.slice(0, fin);
}

interface Semana {
  inicio: string; // lunes
  vistas: number;
  comoLlegar: number;
  llamadas: number;
  dias: number;
}

/** Semanas (lunes a domingo) con los 7 días de datos, por su lunes. */
function semanasCompletas(dias: DiaLab[]): Map<string, Semana> {
  const todas = new Map<string, Semana>();
  for (const d of dias) {
    const k = lunes(d.fecha);
    const s = todas.get(k) ?? { inicio: k, vistas: 0, comoLlegar: 0, llamadas: 0, dias: 0 };
    s.vistas += d.visitas;
    s.comoLlegar += d.comoLlegar;
    s.llamadas += d.llamadas;
    s.dias += 1;
    todas.set(k, s);
  }
  return new Map([...todas].filter(([, s]) => s.dias === 7));
}

function contarPorSemana(fechas: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of fechas) m.set(lunes(f), (m.get(lunes(f)) ?? 0) + 1);
  return m;
}

interface Mes {
  vistas: number;
  comoLlegar: number;
  dias: number;
}

/** Meses con al menos 25 días de datos, anteriores al mes de `hoy`. */
function mesesCompletos(dias: DiaLab[], hoy: string): Map<string, Mes> {
  const mesHoy = hoy.slice(0, 7);
  const m = new Map<string, Mes>();
  for (const d of dias) {
    const k = d.fecha.slice(0, 7);
    if (k >= mesHoy) continue;
    const x = m.get(k) ?? { vistas: 0, comoLlegar: 0, dias: 0 };
    x.vistas += d.visitas;
    x.comoLlegar += d.comoLlegar;
    x.dias += 1;
    m.set(k, x);
  }
  return new Map([...m].filter(([, x]) => x.dias >= 25));
}

function contarPorMes(fechas: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of fechas) m.set(f.slice(0, 7), (m.get(f.slice(0, 7)) ?? 0) + 1);
  return m;
}

function grupoDe(x: number, grupos: { etiqueta: string; desde: number; hasta: number }[]): string {
  return grupos.find((g) => x >= g.desde && x <= g.hasta)!.etiqueta;
}

function barrasPorGrupo(
  casos: { x: number; y: number }[],
  grupos: { etiqueta: string; desde: number; hasta: number }[],
  escala = 1,
): BarraLab[] {
  return grupos.map((g) => {
    const ys = casos.filter((c) => grupoDe(c.x, grupos) === g.etiqueta).map((c) => c.y);
    return { etiqueta: g.etiqueta, valor: ys.length ? promedio(ys) * escala : null, n: ys.length };
  });
}

// ---------- 1. semanas con más reseñas → vistas de las siguientes ----------
//
// Se miran CAMBIOS, no niveles: el cambio de vistas de una semana contra la
// anterior, frente al cambio de reseñas de la semana pasada contra 3 semanas
// atrás (una reseña se asocia a las 2 semanas siguientes, así que entra en
// una y sale dos después). Con cambios se descuentan solos el tamaño del
// comercio, su tendencia y la temporada lenta. Probado con datos simulados:
// sin efecto real casi nunca da señal, y un efecto chico ya se ve.

const MIN_SEMANAS = 20;
const VENTANA_TENDENCIA = 6;
const GRUPOS_CAMBIO_SEMANA = [
  { etiqueta: "Reseñas: bajaron 3+", desde: -Infinity, hasta: -3 },
  { etiqueta: "Reseñas: parecidas (±2)", desde: -2, hasta: 2 },
  { etiqueta: "Reseñas: subieron 3+", desde: 3, hasta: Infinity },
];

export interface ResultadoSemanas {
  cruce: Cruce;
  /** Vistas extra por semana, durante las 2 semanas siguientes, por cada reseña (pendiente). */
  vistasPorResena: number | null;
}

/** Un caso por semana: x = cambio de reseñas (semana pasada contra 3 atrás),
 * y = log del cambio de vistas contra la semana anterior, dif = ese cambio en
 * personas. En orden de tiempo. */
function casosSemanales(e: EntradaLab): { x: number; y: number; dif: number }[] {
  const semanas = semanasCompletas(diasValidos(e.diarias));
  const resenas = contarPorSemana(e.resenas.map((r) => r.fecha));
  const rs = (inicio: string, atras: number) => resenas.get(sumarDias(inicio, -7 * atras)) ?? 0;
  const casos: { inicio: string; x: number; y: number; dif: number }[] = [];
  for (const s of semanas.values()) {
    const anterior = semanas.get(sumarDias(s.inicio, -7));
    // Las semanas de las reseñas comparadas también tienen que tener datos.
    if (!anterior || anterior.vistas <= 0 || s.vistas <= 0) continue;
    if (!semanas.has(sumarDias(s.inicio, -14)) || !semanas.has(sumarDias(s.inicio, -21))) continue;
    casos.push({ inicio: s.inicio, x: rs(s.inicio, 1) - rs(s.inicio, 3), y: Math.log(s.vistas / anterior.vistas), dif: s.vistas - anterior.vistas });
  }
  // Sin la tendencia local: a cada semana se le resta el cambio promedio de
  // las semanas de alrededor (±6). Si no, una temporada en subida que coincide
  // con más reseñas (un cartel nuevo en primavera) parece efecto de ellas.
  return casos.map((c) => {
    const desde = sumarDias(c.inicio, -7 * VENTANA_TENDENCIA);
    const hasta = sumarDias(c.inicio, 7 * VENTANA_TENDENCIA);
    const cerca = casos.filter((o) => o.inicio >= desde && o.inicio <= hasta);
    const y = promedio(cerca.map((o) => o.y));
    const dif = promedio(cerca.map((o) => o.dif));
    return { x: c.x, y: c.y - y, dif: c.dif - dif };
  });
}

export function cruceSemanas(e: EntradaLab): ResultadoSemanas {
  const casos = casosSemanales(e);
  const est = estadistica(
    casos.map((c) => c.x),
    casos.map((c) => c.y),
  );
  let ver = veredicto(est, casos.length, MIN_SEMANAS);
  const barras = barrasPorGrupo(
    casos.map((c) => ({ x: c.x, y: Math.exp(c.y) - 1 })),
    GRUPOS_CAMBIO_SEMANA,
  );
  const pend = pendiente(
    casos.map((c) => c.x),
    casos.map((c) => c.dif),
  );

  let lectura: string;
  if (e.resenas.length === 0) {
    ver = "pocos_datos";
    lectura = "No hay reseñas de Google con fecha: hace falta que el comercio tenga Google conectado y la API de reseñas.";
  } else if (ver === "pocos_datos") {
    lectura = `Hacen falta ${MIN_SEMANAS} semanas completas seguidas; hay ${casos.length}.`;
  } else if (ver === "sin_senal") {
    lectura = "Todavía no hay una relación clara entre las reseñas de una semana y las vistas de las siguientes.";
  } else if (ver === "en_contra") {
    lectura = "Cuando subieron las reseñas, las vistas siguientes bajaron: no usar con el cliente, revisar qué pasó.";
  } else {
    const [baja, , sube] = barras;
    lectura =
      pend !== null && pend > 0
        ? `Cada reseña nueva se asocia a unas ${fmtNum(pend)} personas más que te ven por semana, durante las 2 semanas siguientes.`
        : "Las vistas acompañan a las reseñas.";
    if (sube.valor !== null && baja.valor !== null && (sube.n ?? 0) >= 4 && (baja.n ?? 0) >= 4) {
      lectura += ` Después de una suba de reseñas, las vistas cambiaron ${fmtCambio(sube.valor)} contra la semana anterior (descontada la tendencia); después de una baja, ${fmtCambio(baja.valor)}.`;
    }
  }

  return {
    vistasPorResena: ver === "fuerte" || ver === "debil" ? pend : null,
    cruce: {
      id: "semanas",
      titulo: "Reseñas de una semana → vistas de las siguientes",
      veredicto: ver,
      lectura,
      estadistica: est,
      barras,
      unidad: "cambio",
      comoLoCalculamos:
        "Semana a semana (lunes a domingo, solo semanas completas): el cambio de vistas contra la semana anterior, frente al cambio de reseñas de Google de la semana pasada contra 3 semanas atrás (una reseña se asocia a las 2 semanas siguientes). Mirar cambios y no niveles descuenta el tamaño del comercio, su tendencia y la temporada lenta. Correlación de Pearson; cuenta como señal si |t| supera el umbral del 95% (cerca de 2 con muchos casos, más con pocos), contando los casos efectivos (las semanas seguidas se parecen entre sí). \"Personas más por reseña\" es la pendiente de la recta. A cada semana se le descuenta el cambio promedio de las 6 semanas de cada lado, para que una temporada en subida no parezca efecto de las reseñas. Las barras: cambio promedio de vistas (ya descontada la tendencia) según cómo cambiaron las reseñas.",
    },
  };
}

// ---------- 2. año contra año ----------

export function cruceAnual(e: EntradaLab): Cruce {
  const meses = mesesCompletos(diasValidos(e.diarias), e.hoy);
  const resenas = contarPorMes(e.resenas.map((r) => r.fecha));
  const filas: { mes: string; cambioVistas: number; cambioLlegar: number | null; rAhora: number; rAntes: number }[] = [];
  for (let k = 6; k >= 1; k--) {
    const mes = sumarMeses(e.hoy.slice(0, 7), -k);
    const ahora = meses.get(mes);
    const antes = meses.get(sumarMeses(mes, -12));
    if (!ahora || !antes || antes.vistas <= 0) continue;
    const vAhora = ahora.vistas / ahora.dias;
    const vAntes = antes.vistas / antes.dias;
    const lAntes = antes.comoLlegar / antes.dias;
    filas.push({
      mes,
      cambioVistas: vAhora / vAntes - 1,
      cambioLlegar: lAntes > 0 ? ahora.comoLlegar / ahora.dias / lAntes - 1 : null,
      rAhora: resenas.get(mes) ?? 0,
      rAntes: resenas.get(sumarMeses(mes, -12)) ?? 0,
    });
  }
  const est = estadistica(
    filas.map((f) => f.rAhora - f.rAntes),
    filas.map((f) => f.cambioVistas),
  );
  const ver = filas.length === 0 ? "pocos_datos" : veredicto(est, filas.length, 4);
  const ultima = filas[filas.length - 1];
  let lectura: string;
  if (!ultima) {
    lectura = "Hace falta el mismo mes del año pasado con datos de Google (13 meses de historia).";
  } else {
    lectura = `${nombreMes(ultima.mes)} contra ${nombreMes(sumarMeses(ultima.mes, -12))}: ${fmtCambio(ultima.cambioVistas)} de vistas y ${fmtCambio(ultima.cambioLlegar)} de "cómo llegar", con ${ultima.rAhora} reseñas nuevas contra ${ultima.rAntes}.`;
    if (ver === "fuerte" || ver === "debil") lectura += " Los meses con más reseñas que el año anterior son los que más crecieron.";
  }
  return {
    id: "anual",
    titulo: "Año contra año",
    veredicto: ver,
    lectura,
    estadistica: est,
    barras: filas.map((f) => ({ etiqueta: nombreMes(f.mes), valor: f.cambioVistas, n: null })),
    unidad: "cambio",
    tabla: {
      columnas: ["Mes", "Vistas", "Cómo llegar", "Reseñas (antes → ahora)"],
      filas: filas.map((f) => [nombreMes(f.mes), fmtCambio(f.cambioVistas), fmtCambio(f.cambioLlegar), `${f.rAntes} → ${f.rAhora}`]),
    },
    comoLoCalculamos:
      "Cada uno de los últimos 6 meses completos contra el mismo mes del año anterior, en promedio por día (meses con al menos 25 días de datos). Comparar con el mismo mes descuenta la temporada. La correlación es entre la diferencia de reseñas y el cambio de vistas; con 6 meses como máximo (y parecidos entre sí), casi nunca alcanza para hablar de señal: este cruce vale más por la comparación que por el veredicto.",
  };
}

// ---------- 3. antes y después del cartel ----------

/** Las búsquedas que no incluyen el nombre del comercio: gente que lo
 * encontró sin conocerlo. */
export function esBusquedaDeMarca(nombreComercio: string): (palabra: string) => boolean {
  const marca = new Set(
    tokens(nombreComercio).filter((t) => t.length >= 4 && !PALABRAS_GENERICAS.has(t) && !RUBROS.has(t)),
  );
  return (palabra) => tokens(palabra).some((t) => marca.has(t));
}

function promedioDiario(dias: Map<string, DiaLab>, desde: string, largo: number, campo: "visitas" | "comoLlegar"): number | null {
  let suma = 0;
  let n = 0;
  for (let i = 0; i < largo; i++) {
    const d = dias.get(sumarDias(desde, i));
    if (d) {
      suma += d[campo];
      n++;
    }
  }
  // Con menos del 80% de los días, la ventana no es comparable.
  return n >= largo * 0.8 ? suma / n : null;
}

function cambio(antes: number | null, despues: number | null): number | null {
  return antes !== null && despues !== null && antes > 0 ? despues / antes - 1 : null;
}

export function cruceCartel(e: EntradaLab): Cruce {
  const validos = diasValidos(e.diarias);
  const dias = new Map(validos.map((d) => [d.fecha, d]));
  const primerToque = e.toques.map((t) => t.fecha).sort()[0] ?? null;
  const ultimoDia = validos[validos.length - 1]?.fecha ?? null;
  const base: Omit<Cruce, "veredicto" | "lectura" | "barras" | "estadistica"> = {
    id: "cartel",
    titulo: "Antes y después del cartel",
    unidad: "cambio",
    comoLoCalculamos:
      "Promedio por día de vistas y de \"cómo llegar\" en los hasta 90 días desde el primer toque, contra los mismos días justo antes. Para descontar la temporada se hace la misma cuenta un año antes (52 semanas, mismos días de la semana): el efecto es la diferencia entre los dos cambios. \"Te descubren\" son las búsquedas de Google que no incluyen el nombre del comercio, por mes, en los 3 meses antes y después del mes del primer toque.",
  };
  if (!primerToque || !ultimoDia) {
    return { ...base, veredicto: "pocos_datos", lectura: "Todavía no hay toques al cartel o datos de Google.", barras: [], estadistica: null };
  }
  const largo = Math.min(90, Math.round((ms(ultimoDia) - ms(primerToque)) / DIA) + 1);
  if (largo < 28) {
    return {
      ...base,
      veredicto: "pocos_datos",
      lectura: `El cartel tiene ${Math.max(0, largo)} días con datos de Google; hacen falta 28.`,
      barras: [],
      estadistica: null,
    };
  }
  const antesDesde = sumarDias(primerToque, -largo);
  const vistas = cambio(promedioDiario(dias, antesDesde, largo, "visitas"), promedioDiario(dias, primerToque, largo, "visitas"));
  const llegar = cambio(promedioDiario(dias, antesDesde, largo, "comoLlegar"), promedioDiario(dias, primerToque, largo, "comoLlegar"));
  const vistasCtl = cambio(
    promedioDiario(dias, sumarDias(antesDesde, -364), largo, "visitas"),
    promedioDiario(dias, sumarDias(primerToque, -364), largo, "visitas"),
  );
  const llegarCtl = cambio(
    promedioDiario(dias, sumarDias(antesDesde, -364), largo, "comoLlegar"),
    promedioDiario(dias, sumarDias(primerToque, -364), largo, "comoLlegar"),
  );

  // Te descubren: búsquedas sin el nombre, por mes.
  const deMarca = esBusquedaDeMarca(e.nombre);
  const porMes = new Map<string, number>();
  for (const b of e.busquedas) {
    if (b.impresiones === null || deMarca(b.palabra)) continue;
    porMes.set(b.mes, (porMes.get(b.mes) ?? 0) + b.impresiones);
  }
  const mesToque = primerToque.slice(0, 7);
  const mesesAntes = [1, 2, 3].map((k) => porMes.get(sumarMeses(mesToque, -k))).filter((x): x is number => x !== undefined);
  const mesesDespues = [1, 2, 3].map((k) => porMes.get(sumarMeses(mesToque, k))).filter((x): x is number => x !== undefined);
  const descubren =
    mesesAntes.length && mesesDespues.length ? cambio(promedio(mesesAntes), promedio(mesesDespues)) : null;

  const barras: BarraLab[] = [
    { etiqueta: "Vistas", valor: vistas, n: largo },
    { etiqueta: "Vistas, un año antes", valor: vistasCtl, n: vistasCtl === null ? null : largo },
    { etiqueta: "Cómo llegar", valor: llegar, n: largo },
    { etiqueta: "Cómo llegar, un año antes", valor: llegarCtl, n: llegarCtl === null ? null : largo },
    { etiqueta: "Te descubren", valor: descubren, n: mesesAntes.length + mesesDespues.length || null },
  ];

  if (vistas === null) {
    return { ...base, veredicto: "pocos_datos", lectura: "Faltan días de Google antes del primer toque para comparar.", barras, estadistica: null };
  }
  const efecto = vistasCtl === null ? null : vistas - vistasCtl;
  // Sin año anterior no se puede separar el cartel de la temporada: como
  // mucho, señal débil.
  const ver: Veredicto =
    efecto === null
      ? vistas > 0.05
        ? "debil"
        : vistas < -0.05
          ? "en_contra"
          : "sin_senal"
      : efecto >= 0.1
        ? "fuerte"
        : efecto > 0.03
          ? "debil"
          : efecto < -0.05
            ? "en_contra"
            : "sin_senal";
  const desde = `Desde que está el cartel (${largo} días): ${fmtCambio(vistas)} de vistas y ${fmtCambio(llegar)} de "cómo llegar"`;
  const lectura =
    efecto === null
      ? `${desde}. Sin datos del año anterior no se puede descontar la temporada.`
      : `${desde}; el año anterior, en los mismos días, ${fmtCambio(vistasCtl)}. Descontando la temporada: ${fmtCambio(efecto)} de vistas.${
          descubren !== null ? ` Te descubren sin conocerte: ${fmtCambio(descubren)}.` : ""
        }`;
  return { ...base, veredicto: ver, lectura, barras, estadistica: null };
}

// ---------- 4. la cadena: toque → reseña → vista → cómo llegar ----------

const MIN_TOQUES_CADENA = 30;

export function cruceCadena(e: EntradaLab, vistasPorResena: number | null): Cruce {
  const desde = sumarDias(e.hoy, -180);
  const toques = e.toques.filter((t) => t.fecha >= desde);
  const resenas = e.resenas.filter((r) => r.fecha >= desde);
  const atribucion = atribuirResenas(
    toques.map((t): TapAnalisis => ({ creadoEn: t.creadoEn, linkId: "", pieza: "", empleado: "" })),
    resenas.map((r): ResenaAnalisis => ({ id: r.id, creadoEn: r.creadoEn, fecha: r.fecha, estrellas: 5, texto: "", deGoogle: true })),
  );
  const ultimos90 = diasValidos(e.diarias).filter((d) => d.fecha >= sumarDias(e.hoy, -90));
  const vistas90 = ultimos90.reduce((a, d) => a + d.visitas, 0);
  const conversion = vistas90 > 0 ? ultimos90.reduce((a, d) => a + d.comoLlegar, 0) / vistas90 : null;

  const resenasPorToque = toques.length ? atribucion.size / toques.length : 0;
  const r10 = 10 * resenasPorToque;
  // La pendiente es por semana, durante las 2 semanas siguientes.
  const v10 = vistasPorResena !== null ? r10 * vistasPorResena * 2 : null;
  const c10 = v10 !== null && conversion !== null ? v10 * conversion : null;

  const base = {
    id: "cadena" as const,
    titulo: "La cadena: toque → reseña → vista → cómo llegar",
    estadistica: null,
    unidad: "cantidad" as const,
    barras: [
      { etiqueta: "Toques", valor: 10, n: null },
      { etiqueta: "Reseñas", valor: r10, n: atribucion.size },
      { etiqueta: "Personas que te ven", valor: v10, n: null },
      { etiqueta: "Piden cómo llegar", valor: c10, n: null },
    ],
    comoLoCalculamos:
      "Últimos 180 días. Reseñas por toque: reseñas de Google que llegaron hasta 30 minutos después de un toque (un toque, una reseña). Vistas por reseña: la pendiente del cruce de semanas (vistas extra en cada una de las 2 semanas siguientes por cada reseña). Cómo llegar: vistas × el porcentaje de los últimos 90 días que, después de ver la ficha, pidieron cómo llegar. Es una estimación encadenada: cada eslabón suma incertidumbre.",
  };
  if (toques.length < MIN_TOQUES_CADENA) {
    return { ...base, veredicto: "pocos_datos", lectura: `Hacen falta ${MIN_TOQUES_CADENA} toques en los últimos 180 días; hay ${toques.length}.` };
  }
  if (atribucion.size === 0) {
    return { ...base, veredicto: "sin_senal", lectura: `${toques.length} toques y ninguna reseña de Google dentro de los 30 minutos siguientes.` };
  }
  if (v10 === null) {
    return {
      ...base,
      veredicto: "pocos_datos",
      lectura: `Cada 10 toques ≈ ${fmtNum(r10, 1)} reseñas. El resto de la cadena espera a que el cruce de semanas muestre una relación clara.`,
    };
  }
  return {
    ...base,
    veredicto: "debil",
    lectura: `Cada 10 toques ≈ ${fmtNum(r10, 1)} reseñas ≈ +${fmtNum(v10)} personas que te ven${
      c10 !== null ? ` ≈ +${fmtNum(c10, 1)} que piden cómo llegar` : ""
    }.`,
  };
}

// ---------- 5. reseñas y conversión ----------
//
// ¿De los que ven la ficha, piden cómo llegar o llaman más cuando entran
// reseñas? Mismo método que el cruce de semanas: cambios contra la semana
// anterior, para no confundir la tendencia con el efecto.

const MIN_VISTAS_SEMANA = 50;

export function fmtPuntos(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  const r = Math.round(x * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${fmtNum(Math.abs(r), 1)}`;
}

export function cruceFrescas(e: EntradaLab): Cruce {
  const semanas = semanasCompletas(diasValidos(e.diarias));
  const resenas = contarPorSemana(e.resenas.map((r) => r.fecha));
  const rs = (inicio: string, atras: number) => resenas.get(sumarDias(inicio, -7 * atras)) ?? 0;
  const conversion = (s: Semana) => ((s.comoLlegar + s.llamadas) / s.vistas) * 100;
  const casos: { x: number; y: number }[] = [];
  for (const s of semanas.values()) {
    const anterior = semanas.get(sumarDias(s.inicio, -7));
    if (!anterior || s.vistas < MIN_VISTAS_SEMANA || anterior.vistas < MIN_VISTAS_SEMANA) continue;
    if (!semanas.has(sumarDias(s.inicio, -14)) || !semanas.has(sumarDias(s.inicio, -21))) continue;
    casos.push({ x: rs(s.inicio, 1) - rs(s.inicio, 3), y: conversion(s) - conversion(anterior) });
  }
  const est = estadistica(
    casos.map((c) => c.x),
    casos.map((c) => c.y),
  );
  let ver = veredicto(est, casos.length, MIN_SEMANAS);
  const barras = barrasPorGrupo(casos, GRUPOS_CAMBIO_SEMANA);
  let lectura: string;
  if (e.resenas.length === 0) {
    ver = "pocos_datos";
    lectura = "No hay reseñas de Google con fecha.";
  } else if (ver === "pocos_datos") {
    lectura = `Hacen falta ${MIN_SEMANAS} semanas completas seguidas con ${MIN_VISTAS_SEMANA}+ vistas; hay ${casos.length}.`;
  } else if (ver === "sin_senal") {
    lectura = "Las reseñas no cambian de forma clara cuántos, de los que te ven, piden cómo llegar o llaman.";
  } else if (ver === "en_contra") {
    lectura = "Cuando subieron las reseñas, convirtió MENOS: no usar con el cliente, revisar.";
  } else {
    const [baja, , sube] = barras;
    lectura =
      sube.valor !== null && (sube.n ?? 0) >= 4
        ? `Después de una suba de reseñas, de cada 100 que te ven, ${fmtPuntos(sube.valor)} piden cómo llegar o llaman respecto de la semana anterior${
            baja.valor !== null && (baja.n ?? 0) >= 4 ? `; después de una baja, ${fmtPuntos(baja.valor)}` : ""
          }.`
        : "Hay relación, pero todavía hay pocas semanas con subas de reseñas para contarla.";
  }
  return {
    id: "frescas",
    titulo: "Reseñas y conversión",
    veredicto: ver,
    lectura,
    estadistica: est,
    barras,
    unidad: "puntos",
    comoLoCalculamos: `Conversión: de cada 100 que vieron la ficha, cuántos pidieron cómo llegar o llamaron. Semana a semana (solo semanas completas con ${MIN_VISTAS_SEMANA}+ vistas): el cambio de conversión contra la semana anterior, frente al cambio de reseñas de Google de la semana pasada contra 3 semanas atrás, igual que en el cruce de semanas. Las barras: cambio promedio de la conversión, en puntos cada 100.`,
  };
}

// ---------- 6. todos los comercios juntos ----------
//
// El cruce de semanas, juntando las semanas de todos los comercios: cada uno
// aporta sus propios cambios, así un local grande no pesa más que uno chico.
// Con muchos comercios el dato es mucho más firme que con uno solo.

const MIN_SEMANAS_GLOBAL = 60;
const MIN_COMERCIOS_GLOBAL = 3;

export function cruceGlobal(entradas: EntradaLab[]): Cruce {
  const casos: { x: number; y: number }[] = [];
  const comercios = new Set<string>();
  for (const e of entradas) {
    if (e.resenas.length === 0) continue;
    const propios = casosSemanales(e);
    if (propios.length) comercios.add(e.id);
    casos.push(...propios);
  }
  const est = estadistica(
    casos.map((c) => c.x),
    casos.map((c) => c.y),
  );
  const ver = comercios.size < MIN_COMERCIOS_GLOBAL ? "pocos_datos" : veredicto(est, casos.length, MIN_SEMANAS_GLOBAL);
  const pend = pendiente(
    casos.map((c) => c.x),
    casos.map((c) => c.y),
  );
  const barras = barrasPorGrupo(
    casos.map((c) => ({ x: c.x, y: Math.exp(c.y) - 1 })),
    GRUPOS_CAMBIO_SEMANA,
  );
  let lectura: string;
  if (ver === "pocos_datos") {
    lectura = `Hacen falta ${MIN_SEMANAS_GLOBAL} semanas de ${MIN_COMERCIOS_GLOBAL} comercios o más (con reseñas de Google y semanas completas seguidas); hay ${casos.length} semanas de ${comercios.size}.`;
  } else if (ver === "sin_senal") {
    lectura = `Con ${casos.length} semanas de ${comercios.size} comercios, todavía no hay una relación clara entre las reseñas de una semana y las vistas de las siguientes.`;
  } else if (ver === "en_contra") {
    lectura = "Cuando subieron las reseñas, las vistas siguientes bajaron: no usar, revisar.";
  } else {
    lectura = `En los comercios de MetricsField, cada 10 reseñas nuevas se asocian a ${fmtCambio(Math.exp(pend! * 10) - 1)} de vistas en las 2 semanas siguientes (${casos.length} semanas de ${comercios.size} comercios).`;
  }
  return {
    id: "global",
    titulo: "Reseñas → vistas, todos los comercios juntos",
    veredicto: ver,
    lectura,
    estadistica: est,
    barras,
    unidad: "cambio",
    comoLoCalculamos:
      "El mismo cálculo del cruce de semanas, con las semanas de todos los comercios que tienen reseñas de Google. Cada comercio aporta sus propios cambios de una semana a otra, así un local grande no pesa más que uno chico. La cifra \"cada 10 reseñas\" sale de la pendiente de la recta (cambio de vistas contra cambio de reseñas).",
  };
}

// ---------- todo junto ----------

export function laboratorioComercio(e: EntradaLab): LabComercio {
  const validos = diasValidos(e.diarias);
  const semanas = cruceSemanas(e);
  return {
    id: e.id,
    nombre: e.nombre,
    semanasCompletas: semanasCompletas(validos).size,
    diasConDatos: validos.length,
    resenasGoogle: e.resenas.length,
    toques: e.toques.length,
    cruces: [semanas.cruce, cruceAnual(e), cruceCartel(e), cruceCadena(e, semanas.vistasPorResena), cruceFrescas(e)],
  };
}
