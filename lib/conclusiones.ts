import { detectarTemas, nombreDeTema, normalizarTexto } from "./temas";
import type { ComparativaMes } from "./comparativa-competencia";

// "Lo que Google no te muestra": conclusiones que salen de CRUZAR datos que
// Google nunca junta — los toques al cartel (hora y pieza exactas, solo los
// tenemos nosotros), el texto y la hora de cada reseña, y la competencia mes
// a mes. Funciones puras: se testean sin base.
//
// Reglas para que el cliente pueda confiar en lo que lee:
// - Ninguna conclusión con menos de MIN_CASOS casos: devuelve null y el
//   portal no la muestra (mejor nada que una conclusión inventada).
// - La frase sale de los números, también cuando el resultado no es lindo o
//   no dice nada ("rinden parecido", "misma calificación").
// - Lo atribuido al cartel es aproximado y se dice; nunca "gracias a".
// - Cada conclusión trae su "cómo lo calculamos".

export const MIN_CASOS = 5;
/** Minutos entre un toque y una reseña para contarla como "del cartel". */
export const VENTANA_MINUTOS = 30;
/** Período que miran las conclusiones del cartel y del equipo. */
export const DIAS_ANALISIS = 90;
/** Toques mínimos para comparar una pieza contra otra. */
const MIN_TOQUES_PIEZA = 10;

export interface TapAnalisis {
  creadoEn: string; // ISO
  linkId: string;
  /** Cómo la reconoce el dueño: "Mostrador", "Mesa 4", "Tarjeta de Juli"… */
  pieza: string;
  /** Nombre de la persona si es una tarjeta personal; "" si no. */
  empleado: string;
}

export interface ResenaAnalisis {
  id: number;
  /** Hora exacta (ISO) — null en reseñas cargadas a mano sin hora. */
  creadoEn: string | null;
  fecha: string; // 'YYYY-MM-DD'
  estrellas: number;
  texto: string;
  /** true si vino del sync de Google (no cargada a mano). */
  deGoogle: boolean;
}

export interface Barra {
  etiqueta: string;
  detalle?: string;
  valor: string;
  /** 0 a 1: largo de la barra. */
  proporcion: number;
  tono: "bien" | "mal" | "neutro";
  /** Segunda serie (gráfico "dobles"), 0 a 1. */
  proporcion2?: number;
  /** Marca sobre la columna ("Cartel"). */
  marca?: string;
  /** Lectura en una frase (gráfico "tarjetas"). */
  lectura?: string;
}

/** Cómo se dibuja cada conclusión: barras horizontales (por defecto),
 * columnas por mes o semana, columnas dobles (dos series), pastillas por
 * pieza, personas del equipo o tarjetitas por búsqueda. */
export type Grafico = "barras" | "columnas" | "dobles" | "pastillas" | "personas" | "tarjetas";

export interface Conclusion {
  id: string;
  /** Qué datos se cruzan ("Toques × reseñas"). */
  cruce: string;
  /** La conclusión, en una frase. */
  titulo: string;
  barras: Barra[];
  grafico?: Grafico;
  /** Nombres de las dos series del gráfico "dobles". */
  leyenda?: [string, string];
  nota?: string;
  /** Qué probar, en una o dos frases. */
  accion?: string;
  /** Versión corta de la acción para "Qué hacés esta semana". */
  tarea?: string;
  comoLoCalculamos: string;
}

export interface MetaCalificacion {
  actual: string; // "4,6"
  siguiente: string; // "4,7"
  faltan: number; // reseñas de 5★
  semanas: number | null; // a su ritmo de 5★; null si no hay ritmo
  compensaUnaMala: number; // reseñas de 5★ que compensan una de 1★
  /** 0 a 1: cuánto del camino entre la décima actual y la siguiente ya se hizo. */
  progreso: number;
  comoLoCalculamos: string;
}

/** Una conclusión que todavía no se puede mostrar ("en camino": faltan
 * datos, con cuánto falta) o que se revisó y no encontró nada que contar
 * ("sin novedad": también es información para el dueño). */
export interface Pendiente {
  id: string;
  /** Qué te va a decir cuando esté. */
  titulo: string;
  tipo: "en_camino" | "sin_novedad";
  detalle: string;
  /** 0 a 1, cuánto falta para tener datos; null si no se puede medir. */
  progreso: number | null;
}

export interface Conclusiones {
  funciona: Conclusion[];
  cuesta: Conclusion[];
  meta: MetaCalificacion | null;
  tareas: string[];
  pendientes: Pendiente[];
  /** Sin Google conectado faltan las conclusiones que usan reseñas y
   * métricas de Google: el portal lo pide una vez, arriba. */
  faltaGoogle: boolean;
}

// ---------- formato ----------

export function fmt1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function promedio(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/** "4 de cada 10", "menos de 1 de cada 10", "casi todas las". */
export function deCada10(p: number): string {
  const r = Math.round(p * 10);
  if (r <= 0) return "menos de 1 de cada 10";
  if (r >= 10) return "casi todas las";
  return `${r} de cada 10`;
}

/** "1 de cada 3" a partir de toques y reseñas. */
function unoDeCada(toques: number, resenas: number): string {
  if (resenas <= 0) return "sin reseñas";
  const n = Math.round(toques / resenas);
  return n <= 1 ? "casi todos" : `1 de cada ${n}`;
}

/** "1 de cada 3 toques termina en reseña" / "casi cada toque termina en reseña". */
function rinde(toques: number, resenas: number): string {
  const n = Math.round(toques / resenas);
  return n <= 1 ? "casi cada toque termina en reseña" : `1 de cada ${n} toques termina en reseña`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function nombreMes(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1] ?? mes;
}

function msDe(iso: string): number {
  return new Date(iso).getTime();
}

// ---------- atribución ----------

/** Une cada reseña con hora al toque más cercano ANTERIOR a ella, dentro de
 * VENTANA_MINUTOS. Un toque se usa para una sola reseña (una persona, una
 * reseña). Las reseñas sin hora quedan afuera. Devuelve id de reseña → toque. */
export function atribuirResenas(
  taps: TapAnalisis[],
  resenas: ResenaAnalisis[],
  ventanaMinutos = VENTANA_MINUTOS,
): Map<number, TapAnalisis> {
  const ventana = ventanaMinutos * 60_000;
  const ordenados = [...taps].sort((a, b) => msDe(a.creadoEn) - msDe(b.creadoEn));
  const usados = new Set<number>();
  const resultado = new Map<number, TapAnalisis>();

  const conHora = resenas
    .filter((r) => r.creadoEn)
    .sort((a, b) => msDe(a.creadoEn!) - msDe(b.creadoEn!));

  for (const r of conHora) {
    const t = msDe(r.creadoEn!);
    // Busca hacia atrás desde el último toque anterior a la reseña.
    let i = ordenados.length - 1;
    while (i >= 0 && msDe(ordenados[i].creadoEn) > t) i--;
    for (; i >= 0; i--) {
      const tt = msDe(ordenados[i].creadoEn);
      if (t - tt > ventana) break;
      if (usados.has(i)) continue;
      usados.add(i);
      resultado.set(r.id, ordenados[i]);
      break;
    }
  }
  return resultado;
}

// ---------- conclusiones ----------

/** ¿Cuántas reseñas trae el cartel, y cómo son comparadas con las que llegan solas? */
export function conclusionCartel(
  resenas: ResenaAnalisis[],
  atribucion: Map<number, TapAnalisis>,
): Conclusion | null {
  const conHora = resenas.filter((r) => r.creadoEn);
  const delCartel = conHora.filter((r) => atribucion.has(r.id));
  const solas = conHora.filter((r) => !atribucion.has(r.id));
  if (conHora.length < MIN_CASOS * 2 || delCartel.length < MIN_CASOS) return null;

  const fr = deCada10(delCartel.length / conHora.length);
  const pc = promedio(delCartel.map((r) => r.estrellas));
  const ps = promedio(solas.map((r) => r.estrellas));
  const comparable = solas.length >= MIN_CASOS;
  const diff = pc - ps;

  let titulo = `El cartel trae ${fr} reseñas.`;
  if (comparable && diff >= 0.2) titulo = `El cartel trae ${fr} reseñas, y son las mejores.`;
  else if (comparable && diff <= -0.2)
    titulo = `El cartel trae ${fr} reseñas, con ${fmt1(pc)}★ contra ${fmt1(ps)}★ de las que llegan solas.`;
  else if (comparable) titulo = `El cartel trae ${fr} reseñas, con la misma calificación que las que llegan solas.`;

  const barras: Barra[] = [
    {
      etiqueta: `Llegaron por el cartel · ${delCartel.length}`,
      valor: `${fmt1(pc)}★`,
      proporcion: pc / 5,
      tono: "bien",
    },
  ];
  if (comparable) {
    barras.push({
      etiqueta: `Llegaron solas · ${solas.length}`,
      valor: `${fmt1(ps)}★`,
      proporcion: ps / 5,
      tono: "neutro",
    });
  }

  return {
    id: "cartel",
    cruce: "Toques × reseñas",
    titulo,
    barras,
    nota:
      comparable && diff >= 0.2
        ? "Quien deja la reseña en el momento, en el local, suele estar más contento que quien se acuerda días después."
        : undefined,
    comoLoCalculamos: `Contamos como "del cartel" cada reseña publicada hasta ${VENTANA_MINUTOS} minutos después de un toque a una pieza de tu local, en los últimos ${DIAS_ANALISIS} días. Es aproximado: alguien puede tocar y dejar la reseña más tarde, o dejarla sin tocar justo después de otro toque.`,
  };
}

/** ¿Qué pieza termina en reseña y cuál no? */
export function conclusionPiezas(
  taps: TapAnalisis[],
  atribucion: Map<number, TapAnalisis>,
): Conclusion | null {
  const porPieza = new Map<string, { toques: number; resenas: number }>();
  for (const t of taps) {
    const p = porPieza.get(t.pieza) ?? { toques: 0, resenas: 0 };
    p.toques += 1;
    porPieza.set(t.pieza, p);
  }
  for (const t of atribucion.values()) {
    const p = porPieza.get(t.pieza);
    if (p) p.resenas += 1;
  }

  const piezas = [...porPieza.entries()]
    .map(([nombre, v]) => ({ nombre, ...v, tasa: v.resenas / v.toques }))
    .filter((p) => p.toques >= MIN_TOQUES_PIEZA)
    .sort((a, b) => b.tasa - a.tasa || b.toques - a.toques);
  const totalResenas = piezas.reduce((a, p) => a + p.resenas, 0);
  if (piezas.length < 2 || totalResenas < MIN_CASOS) return null;

  const mejor = piezas[0];
  const peor = piezas[piezas.length - 1];
  const ratio = peor.tasa > 0 ? mejor.tasa / peor.tasa : Infinity;

  let titulo: string;
  let accion: string | undefined;
  let tarea: string | undefined;
  if (peor.resenas === 0) {
    titulo = `${peor.nombre} tuvo ${peor.toques} toques y ninguna reseña. En ${mejor.nombre}, ${rinde(mejor.toques, mejor.resenas)}.`;
    accion = `mové ${peor.nombre} a donde la gente ya está por irse (la caja, la entrega), o pedile al equipo que ofrezca ${mejor.nombre}.`;
    tarea = `Mover ${peor.nombre}: tuvo ${peor.toques} toques y ninguna reseña`;
  } else if (ratio >= 2) {
    titulo = `${mejor.nombre} rinde ${Math.round(ratio)} veces más que ${peor.nombre}.`;
    accion = `mové ${peor.nombre} a un lugar parecido al de ${mejor.nombre}, o pedile al equipo que ofrezca ${mejor.nombre}.`;
    tarea = `Reubicar ${peor.nombre}: rinde ${Math.round(ratio)} veces menos que ${mejor.nombre}`;
  } else {
    titulo = `Tus piezas rinden parecido: en la mejor, ${rinde(mejor.toques, mejor.resenas)}; en la que menos, ${rinde(peor.toques, peor.resenas)}.`;
  }

  return {
    id: "piezas",
    cruce: "Toques por pieza × reseñas",
    grafico: "pastillas",
    titulo,
    barras: piezas.slice(0, 6).map((p, i, arr) => ({
      etiqueta: p.nombre,
      detalle: `${p.toques} toques · ${p.resenas === 0 ? "ninguna reseña" : `${p.resenas} reseña${p.resenas === 1 ? "" : "s"}`}`,
      valor: unoDeCada(p.toques, p.resenas),
      proporcion: mejor.tasa > 0 ? p.tasa / mejor.tasa : 0,
      tono: i === 0 ? "bien" : i === arr.length - 1 && (p.resenas === 0 || ratio >= 2) ? "mal" : "neutro",
    })),
    accion,
    tarea,
    comoLoCalculamos: `Toques de cada pieza en los últimos ${DIAS_ANALISIS} días, y cuántos terminaron en una reseña dentro de los ${VENTANA_MINUTOS} minutos. Solo comparamos piezas con ${MIN_TOQUES_PIEZA} toques o más.`,
  };
}

/** ¿Quién del equipo está detrás de las reseñas? Tarjeta personal + nombre en el texto. */
export function conclusionEquipo(
  resenas: ResenaAnalisis[],
  atribucion: Map<number, TapAnalisis>,
  empleados: string[],
): Conclusion | null {
  if (resenas.length < MIN_CASOS * 2) return null;
  const personas = [...new Set(empleados.map((e) => e.trim()).filter(Boolean))].map((nombre) => {
    const primerNombre = normalizarTexto(nombre.split(/\s+/)[0]).replace(/[^a-z]/g, "");
    const patron = primerNombre.length >= 3 ? new RegExp(`\\b${primerNombre}\\b`) : null;
    const porTarjeta = new Set<number>();
    const porNombre = new Set<number>();
    for (const r of resenas) {
      if (atribucion.get(r.id)?.empleado === nombre) porTarjeta.add(r.id);
      else if (patron && patron.test(normalizarTexto(r.texto))) porNombre.add(r.id);
    }
    const ids = new Set([...porTarjeta, ...porNombre]);
    const estrellas = resenas.filter((r) => ids.has(r.id)).map((r) => r.estrellas);
    return { nombre, total: ids.size, porTarjeta: porTarjeta.size, porNombre: porNombre.size, prom: promedio(estrellas) };
  });
  personas.sort((a, b) => b.total - a.total);
  const top = personas[0];
  if (!top || top.total < MIN_CASOS) return null;

  return {
    id: "equipo",
    cruce: "Tarjetas del equipo × texto de reseñas",
    grafico: "personas",
    titulo: `${top.nombre} está detrás de ${deCada10(top.total / resenas.length)} reseñas.`,
    barras: personas
      .filter((p) => p.total > 0)
      .slice(0, 5)
      .map((p) => ({
        etiqueta: p.nombre,
        detalle: `${p.total} reseñas: ${p.porTarjeta} por su tarjeta, ${p.porNombre} que mencionan su nombre`,
        valor: `${fmt1(p.prom)}★`,
        proporcion: p.total / top.total,
        tono: p.prom >= 4 ? "bien" : "mal",
      })),
    comoLoCalculamos: `Suma las reseñas que llegaron por la tarjeta personal de cada persona y las que la nombran en el texto, sin contar dos veces la misma, en los últimos ${DIAS_ANALISIS} días. Un nombre que también es una palabra común puede sumar de más.`,
  };
}

interface TemaStats {
  id: string;
  nombre: string;
  n: number;
  prom: number;
  idsResenas: Set<number>;
}

function statsPorTema(resenas: ResenaAnalisis[]): TemaStats[] {
  const porTema = new Map<string, { estrellas: number[]; ids: Set<number> }>();
  for (const r of resenas) {
    for (const id of detectarTemas(r.texto)) {
      const t = porTema.get(id) ?? { estrellas: [], ids: new Set<number>() };
      t.estrellas.push(r.estrellas);
      t.ids.add(r.id);
      porTema.set(id, t);
    }
  }
  return [...porTema.entries()].map(([id, t]) => ({
    id,
    nombre: nombreDeTema(id),
    n: t.estrellas.length,
    prom: promedio(t.estrellas),
    idsResenas: t.ids,
  }));
}

/** ¿Qué tema le baja la calificación, y cuánto? */
export function conclusionTemas(resenas: ResenaAnalisis[]): Conclusion | null {
  const conTexto = resenas.filter((r) => r.texto.trim());
  if (conTexto.length < MIN_CASOS * 2) return null;
  const base = promedio(resenas.map((r) => r.estrellas));
  const temas = statsPorTema(conTexto).filter((t) => t.n >= MIN_CASOS);
  const peor = [...temas].filter((t) => t.prom < 4 && t.prom < base - 0.3).sort((a, b) => a.prom - b.prom)[0];
  if (!peor) return null;

  const sinPeor = resenas.filter((r) => !peor.idsResenas.has(r.id)).map((r) => r.estrellas);
  const simulado = promedio(sinPeor);
  const nombre = peor.nombre.toLowerCase();
  const mueve = fmt1(simulado) !== fmt1(base);
  const titulo = mueve
    ? `Sin las quejas por ${nombre} tendrías ${fmt1(simulado)} en vez de ${fmt1(base)}.`
    : `Las reseñas que hablan de ${nombre} promedian ${fmt1(peor.prom)}★, aunque todavía no te mueven la calificación.`;

  return {
    id: "temas",
    cruce: "Temas × estrellas",
    titulo,
    barras: temas
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
      .map((t) => ({
        etiqueta: t.nombre,
        detalle: `${t.n} reseñas`,
        valor: `${fmt1(t.prom)}★`,
        proporcion: t.prom / 5,
        tono: t.prom >= 4 ? "bien" : "mal",
      })),
    accion: `fijate qué pasa con ${nombre}: ${peor.n} reseñas lo mencionan y promedian ${fmt1(peor.prom)}★, y es el tema que más te baja la calificación.`,
    tarea: `Atacar ${nombre}: es lo que más te baja la calificación`,
    comoLoCalculamos: `Buscamos palabras clave de cada tema en el texto de tus reseñas y promediamos sus estrellas. "Tendrías X" es una simulación: tu promedio sin esas reseñas. Solo mostramos temas con ${MIN_CASOS} reseñas o más. Puede fallar con ironías o palabras que no reconocemos.`,
  };
}

/** Quejas (≤3★) sobre un tema que aparece de golpe: ≥3 en los últimos 30
 * días y ninguna en los 90 anteriores. Necesita al menos 4 meses de historia. */
export function conclusionAlerta(resenas: ResenaAnalisis[], hoy: Date): Conclusion | null {
  const dia = 86_400_000;
  const t0 = hoy.getTime();
  const fechaMs = (r: ResenaAnalisis) => new Date(`${r.fecha}T12:00:00Z`).getTime();
  const masVieja = Math.min(...resenas.map(fechaMs));
  if (!Number.isFinite(masVieja) || t0 - masVieja < 120 * dia) return null;

  const quejas = resenas.filter((r) => r.estrellas <= 3 && r.texto.trim());
  const recientes = quejas.filter((r) => t0 - fechaMs(r) <= 30 * dia);
  const previas = quejas.filter((r) => t0 - fechaMs(r) > 30 * dia && t0 - fechaMs(r) <= 120 * dia);
  const previosTemas = new Set(previas.flatMap((r) => detectarTemas(r.texto)));

  const conteo = new Map<string, number>();
  for (const r of recientes) for (const id of detectarTemas(r.texto)) conteo.set(id, (conteo.get(id) ?? 0) + 1);
  const nuevos = [...conteo.entries()].filter(([id, n]) => n >= 3 && !previosTemas.has(id)).sort((a, b) => b[1] - a[1]);
  if (nuevos.length === 0) return null;

  const [id, n] = nuevos[0];
  const nombre = nombreDeTema(id).toLowerCase();
  return {
    id: "alerta",
    cruce: "Temas mes a mes",
    titulo: `Alerta: ${nombre} apareció en ${n} quejas en el último mes. En los 3 meses anteriores, en ninguna.`,
    grafico: "columnas",
    // Las últimas 8 semanas del tema: se ve que antes no estaba.
    barras: (() => {
      const semanas = Array.from({ length: 8 }, (_, i) => {
        const fin = t0 - i * 7 * dia;
        const cant = quejas.filter(
          (r) => fin - fechaMs(r) >= 0 && fin - fechaMs(r) < 7 * dia && detectarTemas(r.texto).includes(id),
        ).length;
        return { etiqueta: i === 0 ? "Hoy" : `−${i}`, cant };
      }).reverse();
      const max = Math.max(...semanas.map((x) => x.cant), 1);
      return semanas.map((x) => ({
        etiqueta: x.etiqueta,
        detalle: "quejas",
        valor: String(x.cant),
        proporcion: x.cant / max,
        tono: x.cant > 0 ? ("mal" as const) : ("neutro" as const),
      }));
    })(),
    nota: "Cada columna es una semana: la última es la que termina hoy.",
    accion: `leé esas ${n} reseñas: cuando algo aparece de golpe suele ser un cambio reciente (un proveedor, una máquina, un turno nuevo).`,
    tarea: `Revisar qué cambió con ${nombre}`,
    comoLoCalculamos: "Avisamos cuando un tema aparece en 3 reseñas de 3★ o menos en los últimos 30 días y no había aparecido en quejas de los 90 días anteriores.",
  };
}

/** ¿Me estoy quedando con más reseñas nuevas que mi competencia? */
export function conclusionZona(comparativas: ComparativaMes[]): Conclusion | null {
  const serie = comparativas
    .map((c) => {
      const propio = c.filas.find((f) => f.esPropio)?.nuevas ?? null;
      const otros = c.filas.filter((f) => !f.esPropio && f.nuevas !== null);
      if (propio === null || otros.length === 0) return null;
      const total = propio + otros.reduce((a, f) => a + (f.nuevas ?? 0), 0);
      if (total < MIN_CASOS) return null;
      return { mes: c.mes, enCurso: c.enCurso, propio, total, share: propio / total, competidores: otros.length };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 4)
    .reverse(); // de más viejo a más nuevo
  const cerrados = serie.filter((s) => !s.enCurso);
  const ultimo = cerrados[cerrados.length - 1];
  if (!ultimo) return null;

  let titulo = `En ${nombreMes(ultimo.mes)} te quedaste con ${deCada10(ultimo.share)} reseñas nuevas entre vos y tus ${ultimo.competidores} competidores.`;
  const primero = cerrados[0];
  if (primero && primero !== ultimo && Math.round(primero.share * 10) !== Math.round(ultimo.share * 10)) {
    titulo += ` En ${nombreMes(primero.mes)} eran ${deCada10(primero.share)}.`;
  }
  const max = Math.max(...serie.map((s) => s.share), 0.01);

  return {
    id: "zona",
    cruce: "Competencia mes a mes",
    grafico: "columnas",
    titulo,
    barras: serie.map((s) => ({
      etiqueta: `${nombreMes(s.mes)}${s.enCurso ? " (en curso)" : ""}`,
      detalle: `${s.propio} de ${s.total} reseñas nuevas`,
      valor: `${Math.round(s.share * 100)}%`,
      proporcion: s.share / max,
      tono: s === ultimo ? "bien" : "neutro",
    })),
    comoLoCalculamos:
      "Tus reseñas nuevas del mes sobre el total de reseñas nuevas tuyas y de los competidores que cargaste. Sale del total público de cada uno, que guardamos cada mes. Es contra tus competidores cargados, no contra toda la zona.",
  };
}

/** Cuántas reseñas de 5★ faltan para que Google muestre la décima siguiente.
 * Solo con el promedio exacto: hace falta tener (casi) todas las reseñas de
 * Google sincronizadas — con el número redondeado de Google no alcanza. */
export function metaCalificacion(
  resenas: ResenaAnalisis[],
  totalGoogle: number | null,
  hoy: Date,
): MetaCalificacion | null {
  const deGoogle = resenas.filter((r) => r.deGoogle);
  if (!totalGoogle || deGoogle.length < 20 || deGoogle.length < totalGoogle * 0.95) return null;
  const n = deGoogle.length;
  const suma = deGoogle.reduce((a, r) => a + r.estrellas, 0);
  const prom = suma / n;
  const mostrado = Math.round(prom * 10) / 10;
  if (mostrado >= 5) return null;
  const umbral = mostrado + 0.05;
  const faltan = Math.max(1, Math.ceil((umbral * n - suma) / (5 - umbral) - 1e-9));

  const dia = 86_400_000;
  const cincoRecientes = deGoogle.filter(
    (r) => r.estrellas === 5 && hoy.getTime() - new Date(`${r.fecha}T12:00:00Z`).getTime() <= DIAS_ANALISIS * dia,
  ).length;
  const porSemana = cincoRecientes / (DIAS_ANALISIS / 7);

  return {
    actual: fmt1(mostrado),
    siguiente: fmt1(mostrado + 0.1),
    faltan,
    progreso: Math.min(1, Math.max(0, (prom - (mostrado - 0.05)) / 0.1)),
    semanas: porSemana > 0 ? Math.max(1, Math.ceil(faltan / porSemana)) : null,
    compensaUnaMala: Math.max(1, Math.round((prom - 1) / (5 - prom))),
    comoLoCalculamos: `Con el promedio exacto de tus ${n} reseñas de Google (${prom.toFixed(2).replace(".", ",")}), calculamos cuántas de 5★ hacen falta para que redondee a la décima siguiente. Es aproximado: Google puede no contar alguna reseña. El ritmo sale de tus reseñas de 5★ de los últimos ${DIAS_ANALISIS} días.`,
  };
}

// ---------- cruces con las métricas de Google ----------

export interface DiaGoogle {
  fecha: string; // 'YYYY-MM-DD'
  comoLlegar: number;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_SEMANA_PLURAL = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
// Córdoba no tiene horario de verano: UTC-3 todo el año.
const OFFSET_CORDOBA_MS = -3 * 3600_000;
const SEMANAS_DIAS = 8;

function mediana(nums: number[]): number {
  const o = [...nums].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** ¿Hay un día de la semana con mucha gente buscando cómo llegar y pocos
 * toques al cartel? Cruza "cómo llegar" de Google con los toques, por día de
 * la semana, en las últimas 8 semanas con datos. Solo mira días en que el
 * cartel se usó al menos dos veces (si no, puede ser un día cerrado). */
export function conclusionDiasSemana(diarias: DiaGoogle[], taps: TapAnalisis[]): Conclusion | null {
  if (diarias.length === 0) return null;
  const hasta = diarias.reduce((m, d) => (d.fecha > m ? d.fecha : m), diarias[0].fecha);
  const desdeMs = new Date(`${hasta}T12:00:00Z`).getTime() - (SEMANAS_DIAS * 7 - 1) * 86_400_000;
  const desde = new Date(desdeMs).toISOString().slice(0, 10);
  const dias = diarias.filter((d) => d.fecha >= desde && d.fecha <= hasta);
  if (dias.length < 28) return null;

  const porDia = Array.from({ length: 7 }, () => ({ n: 0, comoLlegar: 0, toques: 0, fechasConToques: new Set<string>() }));
  for (const d of dias) {
    const w = new Date(`${d.fecha}T12:00:00Z`).getUTCDay();
    porDia[w].n += 1;
    porDia[w].comoLlegar += d.comoLlegar;
  }
  let totalToques = 0;
  for (const t of taps) {
    const fecha = new Date(msDe(t.creadoEn) + OFFSET_CORDOBA_MS).toISOString().slice(0, 10);
    if (fecha < desde || fecha > hasta) continue;
    const w = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    porDia[w].toques += 1;
    porDia[w].fechasConToques.add(fecha);
    totalToques += 1;
  }
  const totalComoLlegar = dias.reduce((a, d) => a + d.comoLlegar, 0);
  if (totalComoLlegar < 50 || totalToques < 20) return null;

  const abiertos = porDia
    .map((d, w) => ({ w, a: d.n ? d.comoLlegar / d.n : 0, t: d.n ? d.toques / d.n : 0, abierto: d.fechasConToques.size >= 2 }))
    .filter((d) => d.abierto && d.a > 0)
    .map((d) => ({ ...d, r: d.t / d.a }));
  if (abiertos.length < 4) return null;

  const medianaA = mediana(abiertos.map((d) => d.a));
  const medianaR = mediana(abiertos.map((d) => d.r));
  const elegido = abiertos
    .filter((d) => d.a >= medianaA && d.r <= medianaR * 0.5)
    .sort((a, b) => b.a - a.a)[0];
  if (!elegido) return null;

  const maxA = Math.max(...abiertos.map((d) => d.a));
  const veces = Math.max(2, Math.round(medianaR / elegido.r));
  const plural = DIAS_SEMANA_PLURAL[elegido.w];
  const singular = DIAS_SEMANA[elegido.w];
  const comparacion = elegido.a >= maxA ? "más que ningún otro día" : "tanto como tus días más movidos";
  const maxT = Math.max(...abiertos.map((d) => d.t));
  const orden = [1, 2, 3, 4, 5, 6, 0];

  return {
    id: "dias",
    cruce: "Cómo llegar (Google) × toques al cartel",
    grafico: "dobles",
    leyenda: ["Pedidos de cómo llegar", "Toques al cartel"],
    titulo: `Los ${plural} te piden cómo llegar ${comparacion}, pero el cartel se toca ${veces} veces menos que el resto de la semana.`,
    barras: orden
      .map((w) => abiertos.find((d) => d.w === w))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        etiqueta: DIAS_SEMANA[d.w][0].toUpperCase() + DIAS_SEMANA[d.w].slice(1),
        detalle: `${Math.round(d.a)} pedidos de cómo llegar y ${fmt1(d.t)} toques por día`,
        valor: fmt1(d.r * 10),
        proporcion: maxA > 0 ? d.a / maxA : 0,
        proporcion2: maxT > 0 ? d.t / maxT : 0,
        tono: d.w === elegido.w ? "mal" : "neutro",
      })),
    nota: "Cada columna se dibuja contra el máximo de su serie: lo que importa es la diferencia entre las dos en cada día.",
    accion: `que el turno del ${singular} ofrezca el cartel al cobrar: es un día con mucha gente y pocas reseñas pedidas.`,
    tarea: `Que el turno del ${singular} ofrezca el cartel al cobrar`,
    comoLoCalculamos: `Pedidos de cómo llegar de Google y toques al cartel de las últimas ${SEMANAS_DIAS} semanas con datos, promediados por día de la semana. Solo miramos días en que el cartel se usó (para no contar días cerrados). Google publica sus datos con 2 o 3 días de demora.`,
  };
}

export interface BusquedaAnalisis {
  palabra: string;
  /** null si Google solo dijo "menos de N". */
  impresiones: number | null;
}

// Palabras que no dicen QUÉ busca la gente: lugares, conectores, "cerca".
export const PALABRAS_GENERICAS = new Set([
  "de", "del", "la", "el", "los", "las", "en", "y", "a", "con", "para", "por", "un", "una",
  "cerca", "mi", "me", "near", "cordoba", "argentina", "capital", "centro", "barrio", "zona",
  "nueva", "general", "paz", "guemes", "alberdi", "cofico", "jardin", "cerro", "rosas",
  "mejor", "mejores", "abierto", "abierta", "ahora", "hoy", "horario", "horarios", "24", "hs", "horas",
  // Barrios y zonas de Córdoba: dicen DÓNDE buscan, no QUÉ.
  "chateau", "carreras", "arguello", "valle", "escondido", "villa", "belgrano", "urca", "providencia", "alta",
  "poeta", "lugones", "espinillo", "tablada", "quebrada", "horizonte", "palmar", "ciudad", "universitaria",
  "norte", "sur", "este", "oeste", "country", "barrio", "zona", "san", "vicente", "martin", "juan", "pueyrredon",
  "colinas", "jockey", "kennedy", "maipu", "alberdi", "observatorio", "marques", "sobremonte", "yofre", "residencial",
]);
// Rubros: si el nombre del comercio es "Café Martínez", "café" no es su marca.
export const RUBROS = new Set([
  "cafe", "cafeteria", "parrilla", "restaurante", "restaurant", "resto", "bar", "pizzeria", "heladeria",
  "panaderia", "confiteria", "barberia", "peluqueria", "gimnasio", "gym", "taller", "veterinaria",
  "clinica", "consultorio", "odontologico", "estetica", "local", "tienda", "almacen", "kiosco",
  // Plurales y en inglés: Google informa las búsquedas tal como se escribieron.
  "cafes", "cafeterias", "parrillas", "restaurantes", "restaurants", "restos", "bares", "pizzerias", "heladerias",
  "panaderias", "confiterias", "barberias", "peluquerias", "gimnasios", "talleres", "veterinarias", "clinicas",
  "consultorios", "tiendas", "locales", "coffee", "pizza", "pizzas", "burger", "burgers", "hamburgueseria", "hamburgueserias",
]);

export function tokens(s: string): string[] {
  return normalizarTexto(s).match(/[a-z0-9]+/g) ?? [];
}

/** ¿Lo que la gente busca coincide con lo que cuentan las reseñas? Cruza las
 * palabras de búsqueda de Google con el texto de las reseñas. */
export function conclusionBusquedas(
  busquedas: BusquedaAnalisis[],
  resenas: ResenaAnalisis[],
  nombreComercio: string,
): Conclusion | null {
  const conTexto = resenas.filter((r) => r.texto.trim()).map((r) => normalizarTexto(r.texto));
  if (conTexto.length < MIN_CASOS * 2) return null;

  const marca = new Set(
    tokens(nombreComercio).filter((t) => t.length >= 4 && !PALABRAS_GENERICAS.has(t) && !RUBROS.has(t)),
  );
  const esMarca = (palabra: string) => tokens(palabra).some((t) => marca.has(t));

  const conNumero = busquedas.filter((b) => b.impresiones !== null && b.impresiones > 0) as {
    palabra: string;
    impresiones: number;
  }[];
  const total = conNumero.reduce((a, b) => a + b.impresiones, 0);
  const sinMarca = conNumero
    .filter((b) => !esMarca(b.palabra))
    .map((b) => {
      // El rubro ("parrilla", "café") dice qué ES el negocio, no qué busca
      // la gente de él: no tiene sentido pedir que las reseñas lo nombren.
      const clave = tokens(b.palabra).filter((t) => t.length >= 3 && !PALABRAS_GENERICAS.has(t) && !RUBROS.has(t));
      if (clave.length === 0) return null;
      const patrones = clave.map((t) => new RegExp(`\\b${t.slice(0, 5)}`));
      const menciones = conTexto.filter((txt) => patrones.every((p) => p.test(txt))).length;
      return { ...b, menciones };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .sort((a, b) => b.impresiones - a.impresiones);
  const totalSinMarca = sinMarca.reduce((a, b) => a + b.impresiones, 0);
  if (sinMarca.length < 3 || totalSinMarca < 100) return null;

  const top = sinMarca.slice(0, 5);
  const hueco = top.find((b) => b.menciones <= 1 && b.impresiones >= totalSinMarca * 0.1);
  const fortaleza = sinMarca.slice(0, 10).find((b) => b.menciones >= MIN_CASOS);
  if (!hueco && !fortaleza) return null;

  const max = top[0].impresiones;
  const impresionesMarca = conNumero.filter((b) => esMarca(b.palabra)).reduce((a, b) => a + b.impresiones, 0);
  const nota =
    marca.size > 0 && impresionesMarca > 0
      ? `${deCada10((total - impresionesMarca) / total)} búsquedas no incluyen tu nombre: gente que te encontró sin conocerte.`
      : undefined;

  const base = {
    id: "busquedas",
    cruce: "Búsquedas en Google × texto de reseñas",
    grafico: "tarjetas" as const,
    barras: top.map((b): Barra => ({
      etiqueta: `"${b.palabra}"`,
      detalle: `${b.menciones === 0 ? "ninguna reseña lo menciona" : `${b.menciones} reseña${b.menciones === 1 ? "" : "s"} lo mencionan`}`,
      valor: `${b.impresiones} búsquedas`,
      proporcion: b.impresiones / max,
      tono: b.menciones <= 1 ? "mal" : b.menciones >= MIN_CASOS ? "bien" : "neutro",
      lectura:
        b.menciones <= 1
          ? "Te buscan por esto y casi ninguna reseña lo cuenta."
          : b.menciones >= MIN_CASOS
            ? "Lo buscan y lo elogian: que tu ficha lo diga."
            : "Algunas reseñas lo nombran.",
    })),
    nota,
    comoLoCalculamos:
      "Las palabras con las que te encontraron en Google en los últimos 3 meses, cruzadas con cuántas de tus reseñas las mencionan. Google no informa las búsquedas de menos de 15 veces por mes. Las que incluyen tu nombre se separan.",
  };
  if (hueco) {
    return {
      ...base,
      titulo: `Te buscan por "${hueco.palabra}" (${hueco.impresiones} veces en 3 meses) y casi ninguna reseña lo menciona.`,
      accion: `cuando alguien pida algo de "${hueco.palabra}", ofrecele el cartel: así tus reseñas cuentan lo que la gente busca.`,
      tarea: `Ofrecer el cartel a quien pide "${hueco.palabra}"`,
    };
  }
  return {
    ...base,
    titulo: `"${fortaleza!.palabra}" es de lo que más te buscan y de lo que más te elogian.`,
    accion: `si la descripción de tu ficha de Google no lo dice, sumalo: es tu mejor carta.`,
    tarea: `Sumar "${fortaleza!.palabra}" a la descripción de tu ficha`,
  };
}

// ---------- antes y después del cartel ----------

export interface MesHistorico {
  mes: string; // 'YYYY-MM'
  resenasNuevas: number;
  /** true si no se sabe cuántas hubo ese mes (lib/historico.ts). */
  nuevasSinDato?: boolean;
}

/** Reseñas nuevas por mes antes y después del primer toque al cartel. No
 * cuenta el mes del primer toque (quedó partido) ni el mes en curso. Dice
 * "desde que", nunca "gracias a": puede haber otras causas. */
export function conclusionEfectoCartel(
  historico: MesHistorico[],
  primerToque: string | null,
  mesActual: string,
): Conclusion | null {
  if (!primerToque) return null;
  const mesInicio = primerToque.slice(0, 7);
  const validos = historico
    .filter((h) => !h.nuevasSinDato && h.mes !== mesInicio && h.mes < mesActual)
    .sort((a, b) => a.mes.localeCompare(b.mes));
  const antes = validos.filter((h) => h.mes < mesInicio).slice(-3);
  const despues = validos.filter((h) => h.mes > mesInicio).slice(-6);
  if (antes.length < 2 || despues.length < 2) return null;

  const a = Math.round(promedio(antes.map((h) => h.resenasNuevas)));
  const d = Math.round(promedio(despues.map((h) => h.resenasNuevas)));
  const subio = d >= a * 1.2 && d - a >= 2;
  const bajo = d <= a * 0.8 && a - d >= 2;
  const titulo = subio
    ? `Desde que está el cartel recibís ${d} reseñas nuevas por mes. Antes eran ${a}.`
    : bajo
      ? `Desde que está el cartel recibís ${d} reseñas nuevas por mes, menos que antes (${a}).`
      : `Desde que está el cartel recibís ${d} reseñas nuevas por mes, parecido a antes (${a}).`;
  const meses = [...antes, ...despues];
  const max = Math.max(...meses.map((h) => h.resenasNuevas), 1);

  return {
    id: "efecto",
    cruce: "Primer toque × reseñas por mes",
    grafico: "columnas",
    titulo,
    barras: meses.map((h, i) => ({
      etiqueta: nombreMes(h.mes)[0].toUpperCase() + nombreMes(h.mes).slice(1),
      detalle: h.mes < mesInicio ? "antes del cartel" : "con el cartel",
      marca: h.mes > mesInicio && (i === 0 || meses[i - 1].mes < mesInicio) ? "Cartel" : undefined,
      valor: String(h.resenasNuevas),
      proporcion: h.resenasNuevas / max,
      tono: h.mes < mesInicio ? "neutro" : subio ? "bien" : bajo ? "mal" : "neutro",
    })),
    accion: subio
      ? undefined
      : "revisá dónde están las piezas y si el equipo las ofrece: el cartel rinde cuando alguien lo acerca en el momento justo.",
    tarea: subio ? undefined : "Revisar ubicación de las piezas y que el equipo las ofrezca",
    comoLoCalculamos:
      "Reseñas nuevas por mes en Google, antes y después del mes del primer toque a tu cartel (sin contar ese mes ni el mes en curso). Decimos \"desde que\", no \"gracias a\": en el medio pueden haber cambiado otras cosas.",
  };
}

export interface EntradaConclusiones {
  taps: TapAnalisis[];
  /** Todas las reseñas del comercio (las del período se filtran acá). */
  resenas: ResenaAnalisis[];
  /** Total de reseñas que informa Google (Places). */
  totalGoogle: number | null;
  comparativas: ComparativaMes[];
  /** Nombres de las tarjetas personales del comercio. */
  empleados: string[];
  hoy: Date;
  /** Métricas diarias de Google (vacío si el comercio no conectó su Google). */
  diarias?: DiaGoogle[];
  /** Palabras de búsqueda de los últimos meses (vacío si no hay). */
  busquedas?: BusquedaAnalisis[];
  nombreComercio?: string;
  /** Histórico mensual saneado y fecha del primer toque al cartel. */
  historico?: MesHistorico[];
  primerToque?: string | null;
  /** El comercio conectó su Google desde el portal. */
  googleConectado?: boolean;
}

export function armarConclusiones(e: EntradaConclusiones): Conclusiones {
  const desde = e.hoy.getTime() - DIAS_ANALISIS * 86_400_000;
  const recientes = e.resenas.filter((r) => new Date(r.creadoEn ?? `${r.fecha}T12:00:00Z`).getTime() >= desde);
  const tapsRecientes = e.taps.filter((t) => msDe(t.creadoEn) >= desde);
  const atribucion = atribuirResenas(tapsRecientes, recientes);

  const cartel = conclusionCartel(recientes, atribucion);
  const piezas = conclusionPiezas(tapsRecientes, atribucion);
  const equipo = conclusionEquipo(recientes, atribucion, e.empleados);
  const zona = conclusionZona(e.comparativas);
  const temas = conclusionTemas(e.resenas);
  const alerta = conclusionAlerta(e.resenas, e.hoy);
  const dias = conclusionDiasSemana(e.diarias ?? [], e.taps);
  const busquedas = conclusionBusquedas(e.busquedas ?? [], e.resenas, e.nombreComercio ?? "");
  const efecto = conclusionEfectoCartel(e.historico ?? [], e.primerToque ?? null, e.hoy.toISOString().slice(0, 7));
  const efectoSubio = efecto?.accion === undefined;
  // Una búsqueda que nadie menciona es algo que cuesta; una que se busca y
  // se elogia, algo que funciona.
  const busquedaCuesta = busquedas?.titulo.startsWith("Te buscan por") ?? false;

  const funciona = [efecto && efectoSubio ? efecto : null, cartel, piezas, equipo, zona, busquedaCuesta ? null : busquedas].filter(
    (c): c is Conclusion => c !== null,
  );
  const cuesta = [temas, dias, alerta, busquedaCuesta ? busquedas : null, efecto && !efectoSubio ? efecto : null].filter((c): c is Conclusion => c !== null);
  const tareas = [...cuesta, ...funciona].flatMap((c) => (c.tarea ? [c.tarea] : [])).slice(0, 3);

  const meta = metaCalificacion(e.resenas, e.totalGoogle, e.hoy);

  // Lo que todavía no se puede concluir, y cuánto falta: el dueño ve que la
  // sección está viva aunque recién arranque, y sabe qué la destraba.
  const pendientes: Pendiente[] = [];
  const conectar = e.googleConectado ? "" : " Llega cuando conectes tu Google.";
  const enCamino = (id: string, titulo: string, detalle: string, progreso: number | null) =>
    pendientes.push({ id, titulo, tipo: "en_camino", detalle, progreso: progreso === null ? null : Math.min(1, progreso) });
  const sinNovedad = (id: string, titulo: string, detalle: string) =>
    pendientes.push({ id, titulo, tipo: "sin_novedad", detalle, progreso: null });

  const conHora = recientes.filter((r) => r.creadoEn).length;
  const conTexto = e.resenas.filter((r) => r.texto.trim()).length;
  const dia = 86_400_000;

  if (!cartel) {
    if (conHora < MIN_CASOS * 2) {
      enCamino("cartel", "Cuántas reseñas te trae el cartel", `Necesita ${MIN_CASOS * 2} reseñas de Google con hora exacta de los últimos ${DIAS_ANALISIS} días: hay ${conHora}.${conectar}`, conHora / (MIN_CASOS * 2));
    } else {
      enCamino("cartel", "Cuántas reseñas te trae el cartel", `Necesita ${MIN_CASOS} reseñas que lleguen después de tocar el cartel: van ${atribucion.size}.`, atribucion.size / MIN_CASOS);
    }
  }
  if (!piezas) {
    const porPieza = new Map<string, number>();
    for (const t of tapsRecientes) porPieza.set(t.pieza, (porPieza.get(t.pieza) ?? 0) + 1);
    const conToques = [...porPieza.values()].filter((n) => n >= 10).length;
    enCamino("piezas", "Qué pieza funciona y cuál no", `Necesita 2 piezas con 10 toques o más (hay ${conToques}) y ${MIN_CASOS} reseñas que lleguen por el cartel (van ${atribucion.size}).`, Math.min(conToques / 2, atribucion.size / MIN_CASOS));
  }
  if (!equipo && e.empleados.some((n) => n.trim())) {
    enCamino("equipo", "Quién de tu equipo trae reseñas", `Necesita ${MIN_CASOS} reseñas que lleguen por una tarjeta personal o nombren a alguien del equipo.`, null);
  }
  if (!zona) {
    enCamino("zona", "Tu parte de las reseñas nuevas de la zona", e.comparativas.length === 0 ? "Se completa al cerrar el primer mes completo siguiendo a tu competencia. Sumá competidores en la pestaña Competidores." : "Necesita un mes cerrado con reseñas nuevas tuyas y de tus competidores.", null);
  }
  if (!temas) {
    if (conTexto < MIN_CASOS * 2) enCamino("temas", "Qué te baja la calificación", `Necesita ${MIN_CASOS * 2} reseñas con texto: hay ${conTexto}.${conectar}`, conTexto / (MIN_CASOS * 2));
    else sinNovedad("temas", "Qué te baja la calificación", "Ningún tema de tus reseñas te está bajando la calificación.");
  }
  if (!alerta) {
    const masVieja = e.resenas.length ? Math.min(...e.resenas.map((r) => new Date(`${r.fecha}T12:00:00Z`).getTime())) : e.hoy.getTime();
    const diasHistoria = Math.floor((e.hoy.getTime() - masVieja) / dia);
    if (diasHistoria < 120) enCamino("alerta", "Alertas de quejas nuevas", `Necesita 4 meses de reseñas para comparar: hay ${diasHistoria} días.`, diasHistoria / 120);
    else sinNovedad("alerta", "Alertas de quejas nuevas", "No apareció ningún tema nuevo de queja en el último mes.");
  }
  if (!dias) {
    const nDias = (e.diarias ?? []).length;
    if (nDias < 28) enCamino("dias", "Qué día te buscan y nadie pide la reseña", `Necesita 4 semanas de datos diarios de Google: hay ${nDias} días.${conectar}`, nDias / 28);
    else if (tapsRecientes.length < 20) enCamino("dias", "Qué día te buscan y nadie pide la reseña", `Necesita 20 toques al cartel: van ${tapsRecientes.length}.`, tapsRecientes.length / 20);
    else sinNovedad("dias", "Qué día te buscan y nadie pide la reseña", "Pedís reseñas parejo todos los días de la semana.");
  }
  if (!busquedas) {
    const nBusq = (e.busquedas ?? []).filter((b) => b.impresiones !== null).length;
    if (nBusq === 0) enCamino("busquedas", "Lo que te buscan vs. lo que dicen tus reseñas", `Llega con las palabras de búsqueda de Google del último mes cerrado.${conectar}`, null);
    else if (conTexto < MIN_CASOS * 2) enCamino("busquedas", "Lo que te buscan vs. lo que dicen tus reseñas", `Necesita ${MIN_CASOS * 2} reseñas con texto: hay ${conTexto}.`, conTexto / (MIN_CASOS * 2));
    else sinNovedad("busquedas", "Lo que te buscan vs. lo que dicen tus reseñas", "Todavía no hay suficientes búsquedas para comparar (Google no informa las de menos de 15 por mes).");
  }
  if (!efecto) {
    enCamino("efecto", "Cómo cambiaste desde que está el cartel", e.primerToque ? "Necesita 2 meses completos antes y 2 después del primer toque al cartel." : "Arranca con el primer toque al cartel.", null);
  }
  if (!meta) {
    const deGoogle = e.resenas.filter((r) => r.deGoogle).length;
    enCamino("meta", "Cuánto te falta para subir de calificación", e.totalGoogle ? `Necesita tus reseñas de Google sincronizadas: hay ${deGoogle} de ${e.totalGoogle}.${conectar}` : `Necesita la calificación de Google sincronizada.`, e.totalGoogle ? deGoogle / (e.totalGoogle * 0.95) : null);
  }

  return { funciona, cuesta, meta, tareas, pendientes, faltaGoogle: !e.googleConectado };
}
