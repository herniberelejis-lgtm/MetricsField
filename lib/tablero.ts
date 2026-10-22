import {
  atribuirResenas,
  deCada10,
  DIAS_ANALISIS,
  fmt1,
  MIN_CASOS,
  PALABRAS_GENERICAS,
  RUBROS,
  tokens,
  VENTANA_MINUTOS,
  type TapAnalisis,
} from "./conclusiones";
import type { ComparativaMes } from "./comparativa-competencia";
import { detectarTemas, nombreDeTema, normalizarTexto } from "./temas";

// El tablero del Resumen del portal (estilo Google Analytics): métricas del
// período contra el anterior, tortas, mapa de calor del cartel, lo que dicen
// los clientes, el equipo, las búsquedas y la competencia. Todo sale de
// datos que ya guardamos (Google Business Profile, reseñas sincronizadas,
// toques al cartel, fotos mensuales de la competencia). Funciones puras: se
// testean sin base.
//
// Mismas reglas que lib/conclusiones.ts: si no hay datos, el bloque no se
// arma (null) y el portal dice qué falta; nunca un 0 inventado.

export const RANGOS = [7, 28, 90] as const;
export type Rango = (typeof RANGOS)[number];

/** `?rango=` del portal → días del período (28 por defecto). */
export function rangoDe(param: string | undefined): Rango {
  const n = Number(param);
  return (RANGOS as readonly number[]).includes(n) ? (n as Rango) : 28;
}

// Córdoba no tiene horario de verano: UTC-3 todo el año.
const OFFSET_CORDOBA_MS = -3 * 3600_000;
const DIA_MS = 86_400_000;
/** Mapa de calor del cartel: últimas 8 semanas. */
const SEMANAS_CALOR = 8;
/** Mínimos para que un bloque diga algo. */
const MIN_TOQUES_TORTA = 10;
const MIN_MENCIONES_TEMA = 3;
const MIN_ESTRELLAS = 10;

// ---------- entrada ----------

export interface DiaTablero {
  fecha: string; // 'YYYY-MM-DD'
  visitas: number;
  visitasMaps: number;
  visitasBusqueda: number;
  comoLlegar: number;
  llamadas: number;
  clicsWeb: number;
  conversaciones: number;
  reservas: number;
}

export interface ResenaTablero {
  id: number;
  creadoEn: string | null;
  fecha: string; // 'YYYY-MM-DD'
  estrellas: number;
  texto: string;
  /** Vino del sync de Google (no cargada a mano). */
  deGoogle: boolean;
  /** Ya tiene respuesta publicada. */
  respondida: boolean;
}

export interface MesTablero {
  mes: string; // 'YYYY-MM'
  resenasNuevas: number;
  nuevasSinDato?: boolean;
  ratingPromedio: number;
}

export interface EntradaTablero {
  hoy: Date;
  dias: Rango;
  diarias: DiaTablero[];
  taps: TapAnalisis[];
  resenas: ResenaTablero[];
  historico: MesTablero[];
  primerToque: string | null;
  rating: number | null;
  totalResenas: number | null;
  busquedas: { palabra: string; impresiones: number | null }[];
  nombreComercio: string;
  /** Nombres de las tarjetas personales (links.nombreEmpleado). */
  empleados: string[];
  comparativas: ComparativaMes[];
}

// ---------- salida ----------

export interface Delta {
  texto: string; // "9%", "0,1", "igual"
  tono: "sube" | "baja" | "igual";
}

export interface Serie {
  fechas: string[];
  actual: number[];
  anterior: number[] | null;
}

export type IdKpi = "vistas" | "llegar" | "llamadas" | "toques" | "resenas" | "calificacion";

export interface Kpi {
  id: IdKpi;
  label: string;
  /** null = no hay dato (ver `falta`). */
  valor: string | null;
  delta: Delta | null;
  serie: Serie | null;
  /** Qué falta para tener el dato. */
  falta?: string;
  /** Aclaración del período ("Google informa hasta el 17/10"). */
  nota?: string;
}

export type ColorSegmento = "fuerte" | "medio" | "suave" | "negro" | "gris" | "verde" | "naranja";

export interface Segmento {
  label: string;
  valor: number;
  pct: number;
  color: ColorSegmento;
}

export interface Torta {
  id: string;
  titulo: string;
  sub: string;
  total: string;
  totalLabel: string;
  segmentos: Segmento[];
  nota: string;
}

export interface Accion {
  label: string;
  valor: number;
  delta: Delta | null;
  /** 0 a 1, contra la acción más grande. */
  proporcion: number;
}

export interface CalorFila {
  dia: string; // "Lun"
  celdas: { hora: number; toques: number; nivel: 0 | 1 | 2 | 3 | 4 }[];
}

export interface Calor {
  horas: number[];
  filas: CalorFila[];
  total: number;
  lectura: string | null;
}

export interface TemaCliente {
  id: string;
  tema: string;
  n: number;
  promedio: string; // "4,8"
  proporcion: number;
  cita: string | null;
}

export interface LoQueDicen {
  conTexto: number;
  destacan: TemaCliente[];
  quejas: TemaCliente[];
}

export interface PersonaEquipo {
  nombre: string;
  nombrado: number;
  promedio: string | null;
  toques: number;
  porTarjeta: number;
  etiqueta: string | null;
  tono: "bien" | "mal" | "neutro";
  temas: { label: string; bien: boolean }[];
  destacado: boolean;
}

export interface MesResenas {
  mes: string; // 'YYYY-MM'
  etiqueta: string; // "Jul"
  n: number | null;
  conCartel: boolean;
  enCurso: boolean;
}

export interface Estrellas {
  total: number;
  filas: { estrellas: number; n: number; pct: number }[];
}

export interface FilaBusqueda {
  palabra: string;
  veces: number;
  /** null si no hay reseñas con texto para comparar, o la búsqueda es solo el rubro. */
  menciones: number | null;
}

export interface FilaPieza {
  pieza: string;
  toques: number;
  /** null sin reseñas de Google sincronizadas: no se puede saber. */
  resenas: number | null;
  rinde: string;
  tono: "bien" | "mal" | "neutro";
}

export interface Competencia {
  mes: string;
  enCurso: boolean;
  filas: { id: "propio" | number; nombre: string; esPropio: boolean; rating: number | null; nuevas: number; parte: number }[];
  lectura: string | null;
}

export interface Tablero {
  dias: Rango;
  periodo: string; // "23 sep – 20 oct"
  kpis: Kpi[];
  tortas: Torta[];
  acciones: Accion[];
  /** "De cada 100 personas que te ven, 7 hacen algo". */
  conversion: string | null;
  calor: Calor | null;
  loQueDicen: LoQueDicen | null;
  equipo: PersonaEquipo[];
  meses: MesResenas[];
  estrellas: Estrellas | null;
  respondidas: { pct: number; sinResponderNegativas: number } | null;
  busquedas: FilaBusqueda[];
  piezas: FilaPieza[];
  competencia: Competencia | null;
}

// ---------- utilidades ----------

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
const DIAS_SINGULAR = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Nombre del tema para mostrar. "Espera y demora" incluye "rápido": en las
 * reseñas buenas lo que se elogia es la rapidez. */
function nombreTema(id: string, bien: boolean): string {
  return bien && id === "demora" ? "Rapidez" : nombreDeTema(id);
}

function fechaCordoba(ms: number): string {
  return new Date(ms + OFFSET_CORDOBA_MS).toISOString().slice(0, 10);
}

function sumarDias(fecha: string, n: number): string {
  return new Date(new Date(`${fecha}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);
}

/** Las `n` fechas que terminan en `hasta` (inclusive), de la más vieja a la más nueva. */
function ventana(hasta: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => sumarDias(hasta, i - n + 1));
}

function fechaCorta(fecha: string): string {
  return `${Number(fecha.slice(8, 10))} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}`;
}

export function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function suma(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function delta(actual: number, anterior: number | null): Delta | null {
  if (anterior === null || anterior <= 0) return null;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct === 0) return { texto: "igual", tono: "igual" };
  return { texto: `${Math.abs(pct)}%`, tono: pct > 0 ? "sube" : "baja" };
}

function promedio(nums: number[]): number {
  return nums.length ? suma(nums) / nums.length : 0;
}

/** Porcentajes enteros que suman 100 (resto mayor). */
function porcentajes(valores: number[]): number[] {
  const total = suma(valores);
  if (total <= 0) return valores.map(() => 0);
  const crudos = valores.map((v) => (v / total) * 100);
  const base = crudos.map(Math.floor);
  let falta = 100 - suma(base);
  const orden = crudos.map((c, i) => [c - Math.floor(c), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) {
    if (falta <= 0) break;
    base[i] += 1;
    falta -= 1;
  }
  return base;
}

// ---------- métricas del período ----------

function porFecha<T>(items: T[], fechaDe: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of items) {
    const f = fechaDe(x);
    m.set(f, (m.get(f) ?? 0) + 1);
  }
  return m;
}

function serieDe(valores: Map<string, number>, actuales: string[], anteriores: string[] | null): Serie {
  return {
    fechas: actuales,
    actual: actuales.map((f) => valores.get(f) ?? 0),
    anterior: anteriores ? anteriores.map((f) => valores.get(f) ?? 0) : null,
  };
}

function kpis(e: EntradaTablero, hoyFecha: string): Kpi[] {
  const n = e.dias;
  const actuales = ventana(hoyFecha, n);
  const anteriores = ventana(sumarDias(hoyFecha, -n), n);
  const out: Kpi[] = [];

  // Google publica con 2 o 3 días de demora: su período termina en el
  // último día informado, no hoy (si no, los últimos días serían ceros).
  const google = [...e.diarias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hastaGoogle = google.length ? google[google.length - 1].fecha : null;
  const defsGoogle: [IdKpi, string, (d: DiaTablero) => number][] = [
    ["vistas", "Te vieron en Google", (d) => d.visitas],
    ["llegar", "Pidieron cómo llegar", (d) => d.comoLlegar],
    ["llamadas", "Llamadas", (d) => d.llamadas],
  ];
  for (const [id, label, valorDe] of defsGoogle) {
    if (!hastaGoogle) {
      out.push({ id, label, valor: null, delta: null, serie: null, falta: "Llega cuando conectes tu Google" });
      continue;
    }
    const act = ventana(hastaGoogle, n);
    const ant = ventana(sumarDias(hastaGoogle, -n), n);
    const valores = new Map(google.map((d) => [d.fecha, valorDe(d)]));
    const hayAnterior = google[0].fecha <= ant[0];
    const serie = serieDe(valores, act, hayAnterior ? ant : null);
    const total = suma(serie.actual);
    out.push({
      id,
      label,
      valor: miles(total),
      delta: delta(total, serie.anterior ? suma(serie.anterior) : null),
      serie,
      nota: hastaGoogle < hoyFecha ? `Google informa hasta el ${fechaCorta(hastaGoogle)}` : undefined,
    });
  }

  const toquesPorDia = porFecha(e.taps, (t) => fechaCordoba(new Date(t.creadoEn).getTime()));
  const serieToques = serieDe(toquesPorDia, actuales, anteriores);
  out.push({
    id: "toques",
    label: "Toques al cartel",
    valor: miles(suma(serieToques.actual)),
    delta: delta(suma(serieToques.actual), suma(serieToques.anterior!)),
    serie: serieToques,
  });

  const deGoogle = e.resenas.filter((r) => r.deGoogle);
  if (deGoogle.length === 0) {
    out.push({ id: "resenas", label: "Reseñas nuevas", valor: null, delta: null, serie: null, falta: "Llega cuando se sincronicen tus reseñas de Google" });
  } else {
    const serie = serieDe(porFecha(deGoogle, (r) => r.fecha), actuales, anteriores);
    out.push({
      id: "resenas",
      label: "Reseñas nuevas",
      valor: miles(suma(serie.actual)),
      delta: delta(suma(serie.actual), suma(serie.anterior!)),
      serie,
    });
  }

  if (e.rating === null) {
    out.push({ id: "calificacion", label: "Calificación", valor: null, delta: null, serie: null, falta: "Falta vincular tu ficha de Google" });
  } else {
    // Contra el cierre del mes anterior (la foto mensual del cron).
    const mesHoy = hoyFecha.slice(0, 7);
    const previo = [...e.historico].filter((h) => h.mes < mesHoy && h.ratingPromedio > 0).sort((a, b) => b.mes.localeCompare(a.mes))[0];
    const dif = previo ? Math.round((e.rating - previo.ratingPromedio) * 10) / 10 : null;
    out.push({
      id: "calificacion",
      label: "Calificación",
      valor: `${fmt1(e.rating)} ★`,
      delta: dif === null ? null : dif === 0 ? { texto: "igual", tono: "igual" } : { texto: fmt1(Math.abs(dif)), tono: dif > 0 ? "sube" : "baja" },
      serie: null,
      nota: previo ? "contra el cierre del mes pasado" : undefined,
    });
  }
  return out;
}

// ---------- tortas ----------

function torta(
  id: string,
  titulo: string,
  sub: string,
  totalLabel: string,
  partes: { label: string; valor: number; color: ColorSegmento }[],
  nota: string,
): Torta {
  const pcts = porcentajes(partes.map((p) => p.valor));
  const total = suma(partes.map((p) => p.valor));
  return {
    id,
    titulo,
    sub,
    total: miles(total),
    totalLabel,
    segmentos: partes.map((p, i) => ({ ...p, pct: pcts[i] })),
    nota,
  };
}

function tortas(e: EntradaTablero, hoyFecha: string, atribucion: Map<number, TapAnalisis>): Torta[] {
  const out: Torta[] = [];
  const n = e.dias;

  const google = [...e.diarias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (google.length) {
    const hasta = google[google.length - 1].fecha;
    const desde = sumarDias(hasta, -n + 1);
    const enVentana = google.filter((d) => d.fecha >= desde);
    const maps = suma(enVentana.map((d) => d.visitasMaps));
    const busqueda = suma(enVentana.map((d) => d.visitasBusqueda));
    if (maps + busqueda > 0) {
      out.push(
        torta("encuentran", "Cómo te encuentran", "Dónde te vieron en Google", "te vieron", [
          { label: "Google Maps", valor: maps, color: "fuerte" },
          { label: "Búsqueda de Google", valor: busqueda, color: "suave" },
        ], maps >= busqueda
          ? "La mayoría te encuentra en el mapa: tus fotos y tu horario en Maps pesan más que tu web."
          : "La mayoría te encuentra buscando en Google: que tu descripción diga lo que más te piden."),
      );
    }
  }

  const desdeFecha = sumarDias(hoyFecha, -n + 1);
  const recientes = e.resenas.filter((r) => r.deGoogle && r.creadoEn && r.fecha >= desdeFecha);
  if (recientes.length >= MIN_CASOS) {
    const delCartel = recientes.filter((r) => atribucion.has(r.id)).length;
    out.push(
      torta("quien-trae", "Quién trae tus reseñas", "Reseñas nuevas del período", "reseñas", [
        { label: "Después de tocar el cartel", valor: delCartel, color: "fuerte" },
        { label: "Por su cuenta", valor: recientes.length - delCartel, color: "gris" },
      ], delCartel === 0
        ? "Ninguna llegó en la media hora después de un toque: el cartel no se está ofreciendo."
        : `${deCada10(delCartel / recientes.length)} llegan dentro de los ${VENTANA_MINUTOS} minutos de tocar el cartel (aproximado).`),
    );
  }

  const tapsVentana = e.taps.filter((t) => fechaCordoba(new Date(t.creadoEn).getTime()) >= desdeFecha);
  if (tapsVentana.length >= MIN_TOQUES_TORTA) {
    const porPieza = new Map<string, number>();
    for (const t of tapsVentana) porPieza.set(t.pieza, (porPieza.get(t.pieza) ?? 0) + 1);
    const orden = [...porPieza.entries()].sort((a, b) => b[1] - a[1]);
    const partes: { label: string; valor: number; color: ColorSegmento }[] = orden.slice(0, 2).map(([label, valor], i) => ({
      label,
      valor,
      color: i === 0 ? "fuerte" : "medio",
    }));
    const otras = suma(orden.slice(2).map(([, v]) => v));
    if (otras > 0) partes.push({ label: orden.length === 3 ? orden[2][0] : `Otras ${orden.length - 2} piezas`, valor: otras, color: "suave" });
    const lider = porcentajes(partes.map((p) => p.valor))[0];
    out.push(
      torta("piezas", "Qué pieza tocan", "Toques del período", "toques", partes,
        partes.length === 1 ? `Todos los toques fueron en ${partes[0].label}.` : `${partes[0].label} se lleva el ${lider}% de los toques.`),
    );
  }

  const deGoogle = e.resenas.filter((r) => r.deGoogle);
  if (deGoogle.length >= MIN_CASOS) {
    const respondidas = deGoogle.filter((r) => r.respondida).length;
    const negativasSin = deGoogle.filter((r) => !r.respondida && r.estrellas <= 3).length;
    out.push(
      torta("respondidas", "Reseñas respondidas", "Todas tus reseñas de Google", "reseñas", [
        { label: "Respondidas", valor: respondidas, color: "verde" },
        { label: "Sin respuesta", valor: deGoogle.length - respondidas, color: "naranja" },
      ], negativasSin === 0
        ? "Todas las negativas tienen respuesta."
        : negativasSin === 1
          ? "Queda 1 negativa sin responder: son las que más mira la gente."
          : `Quedan ${negativasSin} negativas sin responder: son las que más mira la gente.`),
    );
  }
  return out;
}

// ---------- acciones en la ficha ----------

function acciones(e: EntradaTablero): { acciones: Accion[]; conversion: string | null } {
  const google = [...e.diarias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!google.length) return { acciones: [], conversion: null };
  const n = e.dias;
  const hasta = google[google.length - 1].fecha;
  const act = new Set(ventana(hasta, n));
  const ant = new Set(ventana(sumarDias(hasta, -n), n));
  const hayAnterior = google[0].fecha <= sumarDias(hasta, -2 * n + 1);
  const total = (set: Set<string>, f: (d: DiaTablero) => number) => suma(google.filter((d) => set.has(d.fecha)).map(f));
  const defs: [string, (d: DiaTablero) => number][] = [
    ["Pidieron cómo llegar", (d) => d.comoLlegar],
    ["Clics a tu web", (d) => d.clicsWeb],
    ["Llamadas", (d) => d.llamadas],
    ["Mensajes", (d) => d.conversaciones],
    ["Reservas", (d) => d.reservas],
  ];
  const filas = defs
    .map(([label, f]) => ({ label, valor: total(act, f), anterior: hayAnterior ? total(ant, f) : null }))
    .filter((a) => a.valor > 0 || (a.anterior ?? 0) > 0);
  const max = Math.max(1, ...filas.map((a) => a.valor));
  const vistas = total(act, (d) => d.visitas);
  const hicieron = suma(filas.map((a) => a.valor));
  return {
    acciones: filas.map((a) => ({ label: a.label, valor: a.valor, delta: delta(a.valor, a.anterior), proporcion: a.valor / max })),
    conversion: vistas >= 100 && hicieron > 0 ? `De cada 100 personas que te ven, ${Math.max(1, Math.round((hicieron / vistas) * 100))} hacen algo en tu ficha.` : null,
  };
}

// ---------- mapa de calor del cartel ----------

function calor(e: EntradaTablero, hoyFecha: string): Calor | null {
  const desde = sumarDias(hoyFecha, -SEMANAS_CALOR * 7 + 1);
  const celdas = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let total = 0;
  for (const t of e.taps) {
    const local = new Date(new Date(t.creadoEn).getTime() + OFFSET_CORDOBA_MS);
    if (local.toISOString().slice(0, 10) < desde) continue;
    celdas[local.getUTCDay()][local.getUTCHours()] += 1;
    total += 1;
  }
  if (total < MIN_TOQUES_TORTA) return null;

  // Columnas: de las 8 (o antes, si hubo toques) a las 23.
  let primera = 8;
  for (let h = 0; h < 8; h++) if (celdas.some((fila) => fila[h] > 0)) { primera = h; break; }
  const horas = Array.from({ length: 24 - primera }, (_, i) => primera + i);
  const max = Math.max(...celdas.flat());
  const orden = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
  const filas: CalorFila[] = orden.map((w) => ({
    dia: DIAS_CORTOS[w],
    celdas: horas.map((h) => {
      const v = celdas[w][h];
      const nivel = v === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((v / max) * 4))) as 1 | 2 | 3 | 4);
      return { hora: h, toques: v, nivel };
    }),
  }));

  let pico = { w: 1, h: 12, v: -1 };
  for (const w of orden) for (const h of horas) if (celdas[w][h] > pico.v) pico = { w, h, v: celdas[w][h] };
  const porDia = orden.map((w) => ({ w, n: suma(celdas[w]) }));
  const flojo = [...porDia].sort((a, b) => a.n - b.n)[0];
  const lectura =
    total >= 20
      ? `Tu pico: los ${DIAS_LARGOS[pico.w]} a las ${pico.h} h. El día con menos toques: ${DIAS_SINGULAR[flojo.w]}${flojo.n === 0 ? " (ninguno)" : ""}.`
      : null;
  return { horas, filas, total, lectura };
}

// ---------- lo que dicen los clientes ----------

/** La oración de la reseña que habla del tema, recortada. */
function citaDe(texto: string, temaId: string): string | null {
  const oraciones = texto.split(/(?<=[.!?¡¿\n])\s+/).map((o) => o.trim()).filter(Boolean);
  const con = oraciones.find((o) => detectarTemas(o).includes(temaId)) ?? null;
  if (!con) return null;
  return con.length > 140 ? `${con.slice(0, 137).trimEnd()}…` : con;
}

function loQueDicen(e: EntradaTablero): LoQueDicen | null {
  const conTexto = e.resenas.filter((r) => r.texto.trim());
  if (conTexto.length < MIN_CASOS) return null;
  const porTema = new Map<string, ResenaTablero[]>();
  for (const r of conTexto) {
    for (const id of detectarTemas(r.texto)) porTema.set(id, [...(porTema.get(id) ?? []), r]);
  }
  const armar = (bien: boolean): TemaCliente[] => {
    const filas = [...porTema.entries()]
      .map(([id, rs]) => ({ id, rs: rs.filter((r) => (bien ? r.estrellas >= 4 : r.estrellas <= 3)) }))
      .filter((t) => t.rs.length >= MIN_MENCIONES_TEMA)
      .sort((a, b) => b.rs.length - a.rs.length)
      .slice(0, 4);
    const max = Math.max(1, ...filas.map((t) => t.rs.length));
    return filas.map((t) => {
      // La cita que mejor habla del tema: primero las reseñas que tocan menos
      // temas (una queja por demora que dice "rica" no es sobre el sabor),
      // y entre esas la más reciente.
      const candidatas = [...t.rs].sort(
        (a, b) => detectarTemas(a.texto).length - detectarTemas(b.texto).length || b.fecha.localeCompare(a.fecha),
      );
      let cita: string | null = null;
      for (const r of candidatas) {
        const c = citaDe(r.texto, t.id);
        if (c && c.length >= 20) { cita = c; break; }
      }
      return {
        id: t.id,
        tema: nombreTema(t.id, bien),
        n: t.rs.length,
        promedio: fmt1(promedio(t.rs.map((r) => r.estrellas))),
        proporcion: t.rs.length / max,
        cita,
      };
    });
  };
  const destacan = armar(true);
  const quejas = armar(false);
  if (!destacan.length && !quejas.length) return null;
  return { conTexto: conTexto.length, destacan, quejas };
}

// ---------- equipo ----------

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function equipo(e: EntradaTablero, atribucion: Map<number, TapAnalisis>, hoyFecha: string): PersonaEquipo[] {
  const nombres = [...new Set(e.empleados.map((n) => n.trim()).filter(Boolean))];
  if (!nombres.length) return [];
  const desde = sumarDias(hoyFecha, -DIAS_ANALISIS + 1);
  const conTexto = e.resenas.filter((r) => r.texto.trim());
  const fechaResena = new Map(e.resenas.map((r) => [r.id, r.fecha]));
  const filas = nombres.map((nombre) => {
    const primer = normalizarTexto(nombre.split(/\s+/)[0]);
    const patron = new RegExp(`\\b${escaparRegex(primer)}\\b`);
    const lo = conTexto.filter((r) => patron.test(normalizarTexto(r.texto)));
    const toques = e.taps.filter((t) => t.empleado.trim() === nombre && fechaCordoba(new Date(t.creadoEn).getTime()) >= desde).length;
    const porTarjeta = [...atribucion.entries()].filter(
      ([id, t]) => t.empleado.trim() === nombre && (fechaResena.get(id) ?? "") >= desde,
    ).length;
    const porTema = new Map<string, number[]>();
    for (const r of lo) for (const id of detectarTemas(r.texto)) porTema.set(id, [...(porTema.get(id) ?? []), r.estrellas]);
    const temas = [...porTema.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([id, est]) => {
        const bien = promedio(est) >= 4;
        return { label: nombreTema(id, bien).toLowerCase(), bien };
      });
    const prom = lo.length ? promedio(lo.map((r) => r.estrellas)) : null;
    return { nombre, nombrado: lo.length, prom, toques, porTarjeta, temas };
  });
  filas.sort((a, b) => b.nombrado - a.nombrado || b.porTarjeta - a.porTarjeta || b.toques - a.toques);
  const maxNombrado = filas[0]?.nombrado ?? 0;
  return filas.map((f, i) => {
    const suficiente = f.nombrado >= MIN_CASOS;
    const destacado = i === 0 && suficiente && maxNombrado > (filas[1]?.nombrado ?? 0);
    const flojo = suficiente && f.prom !== null && f.prom < 4;
    return {
      nombre: f.nombre,
      nombrado: f.nombrado,
      promedio: f.prom === null ? null : fmt1(f.prom),
      toques: f.toques,
      porTarjeta: f.porTarjeta,
      etiqueta: destacado ? "El más nombrado" : flojo ? "Para mirar" : suficiente ? "Va bien" : f.nombrado > 0 ? "Pocas menciones todavía" : null,
      tono: flojo ? "mal" : suficiente ? "bien" : "neutro",
      temas: suficiente ? f.temas : [],
      destacado,
    };
  });
}

// ---------- reseñas ----------

function meses(e: EntradaTablero, hoyFecha: string): MesResenas[] {
  const mesHoy = hoyFecha.slice(0, 7);
  const mesCartel = e.primerToque ? fechaCordoba(new Date(e.primerToque).getTime()).slice(0, 7) : null;
  const ultimos = [...e.historico].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
  if (ultimos.length < 2) return [];
  return ultimos.map((h) => ({
    mes: h.mes,
    etiqueta: MESES_CORTOS[Number(h.mes.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase()),
    n: h.nuevasSinDato ? null : h.resenasNuevas,
    conCartel: mesCartel !== null && h.mes >= mesCartel,
    enCurso: h.mes === mesHoy,
  }));
}

function estrellas(e: EntradaTablero): Estrellas | null {
  if (e.resenas.length < MIN_ESTRELLAS) return null;
  const cuentas = [5, 4, 3, 2, 1].map((s) => e.resenas.filter((r) => r.estrellas === s).length);
  const pcts = porcentajes(cuentas);
  return { total: e.resenas.length, filas: [5, 4, 3, 2, 1].map((s, i) => ({ estrellas: s, n: cuentas[i], pct: pcts[i] })) };
}

// ---------- búsquedas ----------

function busquedas(e: EntradaTablero): FilaBusqueda[] {
  const marca = new Set(
    tokens(e.nombreComercio).filter((t) => t.length >= 4 && !PALABRAS_GENERICAS.has(t) && !RUBROS.has(t)),
  );
  // El nombre entero también es marca, aunque sus palabras sean genéricas
  // ("La Parrilla de Nueva Córdoba").
  const nombreEntero = tokens(e.nombreComercio).join(" ");
  const esMarca = (palabra: string) =>
    tokens(palabra).some((t) => marca.has(t)) || (nombreEntero.length >= 6 && tokens(palabra).join(" ").includes(nombreEntero));
  const textos = e.resenas.filter((r) => r.texto.trim()).map((r) => normalizarTexto(r.texto));
  return e.busquedas
    .filter((b): b is { palabra: string; impresiones: number } => b.impresiones !== null && b.impresiones > 0)
    .filter((b) => !esMarca(b.palabra))
    .sort((a, b) => b.impresiones - a.impresiones)
    .slice(0, 6)
    .map((b) => {
      const clave = tokens(b.palabra).filter((t) => t.length >= 3 && !PALABRAS_GENERICAS.has(t) && !RUBROS.has(t));
      const patrones = clave.map((t) => new RegExp(`\\b${t.slice(0, 5)}`));
      const menciones =
        textos.length < MIN_CASOS || clave.length === 0 ? null : textos.filter((txt) => patrones.every((p) => p.test(txt))).length;
      return { palabra: b.palabra, veces: b.impresiones, menciones };
    });
}

// ---------- piezas del cartel ----------

function piezas(e: EntradaTablero, atribucion: Map<number, TapAnalisis>, hoyFecha: string): FilaPieza[] {
  const desde = sumarDias(hoyFecha, -e.dias + 1);
  const porPieza = new Map<string, { toques: number; resenas: number }>();
  for (const t of e.taps) {
    if (fechaCordoba(new Date(t.creadoEn).getTime()) < desde) continue;
    const p = porPieza.get(t.pieza) ?? { toques: 0, resenas: 0 };
    p.toques += 1;
    porPieza.set(t.pieza, p);
  }
  const fechaResena = new Map(e.resenas.map((r) => [r.id, r.fecha]));
  for (const [id, t] of atribucion) {
    if ((fechaResena.get(id) ?? "") < desde) continue;
    const p = porPieza.get(t.pieza);
    if (p) p.resenas += 1;
  }
  // Sin reseñas de Google sincronizadas no hay con qué cruzar los toques:
  // "sin reseñas" sería falso.
  const sinDatos = !e.resenas.some((r) => r.deGoogle && r.creadoEn);
  const filas = [...porPieza.entries()].map(([pieza, v]) => ({ pieza, ...v, tasa: v.toques ? v.resenas / v.toques : 0 }));
  const conBase = filas.filter((f) => f.toques >= 10);
  const mejor = Math.max(0, ...conBase.map((f) => f.tasa));
  return filas
    .sort((a, b) => b.toques - a.toques)
    .slice(0, 8)
    .map((f) => ({
      pieza: f.pieza,
      toques: f.toques,
      resenas: sinDatos ? null : f.resenas,
      rinde: sinDatos ? "—" : f.resenas === 0 ? "sin reseñas" : Math.round(f.toques / f.resenas) <= 1 ? "casi todos" : `1 de cada ${Math.round(f.toques / f.resenas)}`,
      tono: sinDatos || f.toques < 10 || conBase.length < 2 ? "neutro" : f.tasa >= mejor * 0.75 && f.resenas > 0 ? "bien" : f.tasa <= mejor * 0.4 ? "mal" : "neutro",
    }));
}

// ---------- competencia ----------

function competencia(e: EntradaTablero): Competencia | null {
  const conDatos = e.comparativas.filter((c) => c.filas.filter((f) => f.nuevas !== null).length >= 2);
  const ultima = conDatos[conDatos.length - 1];
  if (!ultima) return null;
  const filas = ultima.filas.filter((f) => f.nuevas !== null).map((f) => ({ id: f.id, nombre: f.nombre, esPropio: f.esPropio, rating: f.rating, nuevas: f.nuevas! }));
  const total = suma(filas.map((f) => f.nuevas));
  if (total <= 0) return null;
  const pcts = porcentajes(filas.map((f) => f.nuevas));
  const conParte = filas.map((f, i) => ({ ...f, parte: pcts[i] })).sort((a, b) => b.nuevas - a.nuevas);
  const propio = conParte.find((f) => f.esPropio);
  let lectura: string | null = null;
  if (propio) {
    const puesto = conParte.indexOf(propio) + 1;
    const mejorRating = conParte.filter((f) => !f.esPropio && f.rating !== null && propio.rating !== null && f.rating > propio.rating).sort((a, b) => b.rating! - a.rating!)[0];
    lectura =
      puesto === 1
        ? `Sos el que más reseñas nuevas suma en tu zona: el ${propio.parte}% del mes.`
        : `Sumás el ${propio.parte}% de las reseñas nuevas de tu zona; ${conParte[0].nombre} se lleva el ${conParte[0].parte}%.`;
    if (mejorRating) lectura += ` ${mejorRating.nombre} tiene mejor calificación (${fmt1(mejorRating.rating!)}).`;
  }
  return { mes: ultima.mes, enCurso: ultima.enCurso, filas: conParte, lectura };
}

// ---------- todo junto ----------

export function armarTablero(e: EntradaTablero): Tablero {
  const hoyFecha = fechaCordoba(e.hoy.getTime());
  const desdeAtrib = sumarDias(hoyFecha, -Math.max(e.dias, DIAS_ANALISIS) * 2);
  const atribucion = atribuirResenas(
    e.taps,
    e.resenas.filter((r) => r.deGoogle && r.fecha >= desdeAtrib),
  );
  const { acciones: acc, conversion } = acciones(e);
  const deGoogle = e.resenas.filter((r) => r.deGoogle);
  return {
    dias: e.dias,
    periodo: `${fechaCorta(sumarDias(hoyFecha, -e.dias + 1))} – ${fechaCorta(hoyFecha)}`,
    kpis: kpis(e, hoyFecha),
    tortas: tortas(e, hoyFecha, atribucion),
    acciones: acc,
    conversion,
    calor: calor(e, hoyFecha),
    loQueDicen: loQueDicen(e),
    equipo: equipo(e, atribucion, hoyFecha),
    meses: meses(e, hoyFecha),
    estrellas: estrellas(e),
    respondidas:
      deGoogle.length >= MIN_CASOS
        ? {
            pct: Math.round((deGoogle.filter((r) => r.respondida).length / deGoogle.length) * 100),
            sinResponderNegativas: deGoogle.filter((r) => !r.respondida && r.estrellas <= 3).length,
          }
        : null,
    busquedas: busquedas(e),
    piezas: piezas(e, atribucion, hoyFecha),
    competencia: competencia(e),
  };
}

// ---------- mapa de la zona ----------

export interface MarcadorZona {
  etiqueta: string | null; // "1".."9"; null para el propio
  nombre: string;
  propio: boolean;
  lat: number;
  lng: number;
}

/** Marcadores del mapa: el comercio y cada competidor con ubicación, en el
 * orden de la tabla de competencia (los que no están en la tabla, después).
 * Google acepta una sola letra o número por marcador: hasta 9 numerados. */
export function marcadoresZona(
  propio: { lat: number; lng: number } | null,
  competidores: { id: number; nombre: string; lat: number; lng: number }[],
  competencia: Competencia | null,
): MarcadorZona[] {
  if (!propio || competidores.length === 0) return [];
  const orden = new Map((competencia?.filas ?? []).filter((f) => !f.esPropio).map((f, i) => [f.id, i]));
  const ordenados = [...competidores].sort(
    (a, b) => (orden.get(a.id) ?? 99) - (orden.get(b.id) ?? 99) || a.nombre.localeCompare(b.nombre),
  );
  return [
    { etiqueta: null, nombre: "Vos", propio: true, lat: propio.lat, lng: propio.lng },
    ...ordenados.map((c, i) => ({ etiqueta: i < 9 ? String(i + 1) : null, nombre: c.nombre, propio: false, lat: c.lat, lng: c.lng })),
  ];
}

// ---------- varios locales ----------

/** Junta los datos de varios locales en una sola entrada, para el tablero
 * del combinado ("Todos"): suma las métricas de Google día por día, junta
 * toques y reseñas, y suma el histórico y las búsquedas. La competencia es
 * de cada barrio: en el combinado no va. Las piezas llevan el nombre del
 * local adelante para no confundir dos "Caja". */
export function combinarEntradas(locales: { nombre: string; entrada: EntradaTablero }[]): EntradaTablero {
  if (locales.length === 0) throw new Error("combinarEntradas: sin locales");
  const base = locales[0].entrada;
  const varios = locales.length > 1;

  const porFecha = new Map<string, DiaTablero>();
  for (const { entrada } of locales) {
    for (const d of entrada.diarias) {
      const a = porFecha.get(d.fecha);
      porFecha.set(
        d.fecha,
        a
          ? {
              fecha: d.fecha,
              visitas: a.visitas + d.visitas,
              visitasMaps: a.visitasMaps + d.visitasMaps,
              visitasBusqueda: a.visitasBusqueda + d.visitasBusqueda,
              comoLlegar: a.comoLlegar + d.comoLlegar,
              llamadas: a.llamadas + d.llamadas,
              clicsWeb: a.clicsWeb + d.clicsWeb,
              conversaciones: a.conversaciones + d.conversaciones,
              reservas: a.reservas + d.reservas,
            }
          : { ...d },
      );
    }
  }

  const porMes = new Map<string, MesTablero & { conRating: number; sumaRating: number }>();
  for (const { entrada } of locales) {
    for (const h of entrada.historico) {
      const a = porMes.get(h.mes) ?? { mes: h.mes, resenasNuevas: 0, ratingPromedio: 0, conRating: 0, sumaRating: 0 };
      a.resenasNuevas += h.resenasNuevas;
      if (h.nuevasSinDato) a.nuevasSinDato = true;
      if (h.ratingPromedio > 0) {
        a.conRating += 1;
        a.sumaRating += h.ratingPromedio;
      }
      porMes.set(h.mes, a);
    }
  }

  const busquedas = new Map<string, number | null>();
  for (const { entrada } of locales) {
    for (const b of entrada.busquedas) {
      const previo = busquedas.get(b.palabra);
      busquedas.set(b.palabra, b.impresiones === null ? (previo ?? null) : (previo ?? 0) + b.impresiones);
    }
  }

  // Calificación de todos: promedio de cada local pesado por su cantidad de reseñas.
  const conRating = locales.filter((l) => l.entrada.rating !== null);
  const totalResenas = locales.reduce((a, l) => a + (l.entrada.totalResenas ?? 0), 0);
  const pesoTotal = conRating.reduce((a, l) => a + (l.entrada.totalResenas ?? 0), 0);
  const rating =
    conRating.length === 0
      ? null
      : pesoTotal > 0
        ? conRating.reduce((a, l) => a + l.entrada.rating! * (l.entrada.totalResenas ?? 0), 0) / pesoTotal
        : conRating.reduce((a, l) => a + l.entrada.rating!, 0) / conRating.length;

  const primeros = locales.map((l) => l.entrada.primerToque).filter((x): x is string => x !== null).sort();

  return {
    hoy: base.hoy,
    dias: base.dias,
    diarias: [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    taps: locales.flatMap(({ nombre, entrada }) =>
      varios ? entrada.taps.map((t) => ({ ...t, pieza: `${nombre} · ${t.pieza}` })) : entrada.taps,
    ),
    resenas: locales.flatMap((l) => l.entrada.resenas),
    historico: [...porMes.values()]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map(({ conRating: n, sumaRating, ...h }) => ({ ...h, ratingPromedio: n ? sumaRating / n : 0 })),
    primerToque: primeros[0] ?? null,
    rating,
    totalResenas: locales.some((l) => l.entrada.totalResenas !== null) ? totalResenas : null,
    busquedas: [...busquedas.entries()].map(([palabra, impresiones]) => ({ palabra, impresiones })),
    nombreComercio: locales.map((l) => l.nombre).join(" "),
    empleados: locales.flatMap((l) => l.entrada.empleados),
    comparativas: [],
  };
}

/** Nombre para mostrar de un competidor: algunos llegan de Google con la
 * dirección pegada ("X [Valle Escondido], Avenida …, Córdoba, Argentina") o
 * con letras "decorativas" (𝘍𝑟𝑖𝑐ℎ). Se pasa a letras comunes y se corta la
 * dirección; si no queda nada, se devuelve tal cual. */
export function nombreCorto(nombre: string): string {
  let n = nombre.normalize("NFKC").replace(/\s*\[[^\]]*\]/g, "");
  const partes = n.split(/,\s*/);
  if (partes.length > 1 && /c[oó]rdoba|argentina|avenida|\bav\.|\bcalle\b|\bpaseo\b|\bbv\.|boulevard/i.test(partes.slice(1).join(", "))) {
    n = partes[0];
  }
  n = n.replace(/\s+/g, " ").trim();
  return n || nombre;
}
