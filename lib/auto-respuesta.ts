// Qué reseñas se responden solas en Google y cuáles quedan para una persona.
// La respuesta automática sale publicada con la identidad del comercio y sin
// que nadie la lea antes: ante la duda, siempre a mano. Lo que Google mira
// con lupa en las respuestas automáticas es que sean genéricas o repetidas,
// que no tengan que ver con lo que dijo el cliente, o que lleven links y
// teléfonos. Funciones puras: se testean sin base.

/** Máximo de respuestas automáticas por comercio en cada sincronización
 * (una por día): un goteo parejo, no una tanda de golpe. Las que no entran
 * se responden en la próxima, mientras sigan siendo recientes. */
export const TOPE_AUTO_POR_DIA = 5;

/** Cuántas respuestas recientes del comercio se miran para no repetir texto. */
export const RECIENTES_SIN_REPETIR = 40;

export type MotivoManual =
  | "estrellas" // por debajo del umbral que eligió el comercio
  | "queja" // buena calificación pero el texto trae una queja
  | "contacto" // links, mails o teléfonos: posible spam o datos personales
  | "idioma" // no parece estar en castellano
  | "larga"; // reseña larga y detallada: merece una respuesta pensada

export type Evaluacion = { auto: true } | { auto: false; motivo: MotivoManual };

/** Minúsculas y sin tildes, para buscar palabras sin depender de cómo se escribió. */
export function normalizar(texto: string): string {
  return (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Palabras que delatan una queja dentro de una reseña de 4-5★ ("la comida
// rica pero tardaron una hora"). Se busca como palabra o comienzo de
// palabra; un falso positivo solo manda la reseña a la cola manual.
const QUEJA = [
  /\bpero\b/,
  /\baunque\b/,
  /\bsin embargo\b/,
  /\blastima\b/,
  /\bmal[oa]?s?\b/,
  /\bpesim/,
  /\bhorrible/,
  /\bfeo\b|\bfea\b/,
  /\btard[oaeé]/,
  /\bdemor/,
  /\blent[oa]s?\b/,
  /\bespera(mos|r|ron)?\b/,
  /\bcar[oa]s?\b/,
  /\bsuci[oa]/,
  /\bfri[oa]s?\b/,
  /\bfalt[oóa]/,
  /\bproblema/,
  /\bqueja/,
  /\breclam/,
  /\bdecepci/,
  /\bregular\b/,
  /\bmejorar\b/,
  /\bno (volv|me |nos |les |te |vuelv|recomiend|estaba|tenian|habia|funcion|anda)/,
  /\bnunca\b/,
  /\bmaleducad|\bgroser|\bdesagradable/,
];

// Links, mails y números largos (teléfonos, CBU): no se responde solo algo
// que puede ser spam, ni se arriesga a repetir datos personales.
const CONTACTO = /https?:\/\/|www\.|\.(com|net|ar|org)\b|@\w|\d[\d\s-]{6,}\d/;

// Palabras muy comunes del castellano: una reseña con varias palabras y
// ninguna de estas probablemente está en otro idioma.
const CASTELLANO = new Set(
  "de la el que y en muy los las me con por para es un una lo todo nos se del al mas pero bien buen buena excelente lindo linda rico rica gracias atencion lugar recomiendo super genial hermoso volver siempre".split(" "),
);

const LARGA = 400;

export function evaluarAutoRespuesta(resena: { estrellas: number; texto: string }, umbral: 4 | 5): Evaluacion {
  if (resena.estrellas < umbral) return { auto: false, motivo: "estrellas" };
  const texto = normalizar(resena.texto).trim();
  if (!texto) return { auto: true }; // solo estrellas: un gracias alcanza
  if (CONTACTO.test(texto)) return { auto: false, motivo: "contacto" };
  if (QUEJA.some((re) => re.test(texto))) return { auto: false, motivo: "queja" };
  const palabras = texto.split(/[^a-zñ]+/).filter(Boolean);
  if (palabras.length >= 4 && !palabras.some((p) => CASTELLANO.has(p))) return { auto: false, motivo: "idioma" };
  if (texto.length > LARGA) return { auto: false, motivo: "larga" };
  return { auto: true };
}

/** Para comparar respuestas sin que una coma o una mayúscula las haga "distintas". */
export function huellaRespuesta(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9ñ]+/g, " ").trim();
}

/** Prueba variantes (`intento` 0, 1, 2…) hasta dar con una que no se haya
 * publicado hace poco en el mismo comercio. Si todas están usadas (no
 * debería pasar con el tamaño de las listas), devuelve null y la reseña
 * queda para responder a mano antes que repetir. */
export function elegirSinRepetir(
  generar: (intento: number) => string,
  recientes: string[],
  intentos = 40,
): string | null {
  const usadas = new Set(recientes.map(huellaRespuesta));
  for (let i = 0; i < intentos; i++) {
    const r = generar(i);
    if (!usadas.has(huellaRespuesta(r))) return r;
  }
  return null;
}
