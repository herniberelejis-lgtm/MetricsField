// Detector de temas de reseñas, gratis y sin IA: un diccionario de raíces y
// frases en español rioplatense por tema. No hace falta adivinar si una
// reseña habla bien o mal de un tema — eso ya lo dicen sus estrellas —, solo
// de QUÉ habla. Por eso alcanza con buscar palabras clave, y el resultado se
// puede explicar en una línea ("buscamos estas palabras").
//
// Límites conocidos: no entiende ironías ni negaciones raras, y un tema que
// la gente describe con palabras que no están acá no se detecta. Para sumar
// una palabra se agrega a la lista del tema; cada patrón tiene que poder
// leerse solo sin generar falsos positivos (ej. "tarde" sola no: "a la tarde").

export interface Tema {
  id: string;
  /** Nombre corto para mostrar al dueño. */
  nombre: string;
  /** Expresiones sobre el texto normalizado (minúsculas, sin acentos). */
  patrones: RegExp[];
}

export const TEMAS: Tema[] = [
  {
    id: "atencion",
    nombre: "Atención",
    patrones: [
      /\batenci[o]n\b/,
      /\batend(io|ieron|ido|ida|idos|idas|iendo|er)\b/,
      /\bamab(le|les|ilidad)\b/,
      /\bsimpatic[oa]s?\b/,
      /\bmoz[oa]s?\b/,
      /\bcamarer[oa]s?\b/,
      /\bmeser[oa]s?\b/,
      /\bservicial(es)?\b/,
      /\bcordial(es|idad)?\b/,
      /\btrato\b/,
      /\bvendedor(a|as|es)?\b/,
      /\bmal(a|o)? onda\b/,
      /\bmaleducad[oa]s?\b/,
    ],
  },
  {
    id: "demora",
    nombre: "Espera y demora",
    patrones: [
      /\bdemor/,
      /\btard(o|aron|amos|aba|aban|ando|anza)\b/,
      /\blent(o|a|os|as|itud)\b/,
      /\besper(amos|ando|e|ar mucho|a eterna)\b/,
      /\btuvimos que esperar\b/,
      /\b\d+\s*(min|minutos)\b/,
      /\bmedia hora\b/,
      /\buna hora\b/,
      /\brapid(o|a|ez|isimo)\b/,
    ],
  },
  {
    id: "pago",
    nombre: "Caja y cobro",
    patrones: [
      /\bcaja\b/,
      /\bcobr(ar|aron|o|an|aban|ando)\b/,
      /\bpag(ar|ue|amos|o con)\b/,
      /\befectivo\b/,
      /\bmercado ?pago\b/,
      /\btransferencia\b/,
      /\bposnet\b/,
      /\bfactura\b/,
      /\bcon tarjeta\b/,
      /\bvuelto\b/,
    ],
  },
  {
    id: "precio",
    nombre: "Precio",
    patrones: [
      /\bprecios?\b/,
      /\bcar[oa]s?\b/,
      /\bcarisim[oa]s?\b/,
      /\bbarat[oa]s?\b/,
      /\beconomic[oa]s?\b/,
      /\baccesibles?\b/,
      /\bcalidad[- ]precio\b/,
      /\bsale (muy )?caro\b/,
    ],
  },
  {
    id: "sabor",
    nombre: "Calidad y sabor",
    patrones: [
      /\bric[oa]s?\b/,
      /\briquisim[oa]s?\b/,
      /\bdelicios[oa]s?\b/,
      /\bsabros[oa]s?\b/,
      /\bsabor(es)?\b/,
      /\bexquisit[oa]s?\b/,
      /\bfresc[oa]s?\b/,
      /\bhorrible\b/,
      /\bincomible\b/,
      /\bcrud[oa]s?\b/,
    ],
  },
  {
    id: "temperatura",
    nombre: "Comida fría o tibia",
    patrones: [/\bfri[oa]s?\b/, /\btibi[oa]s?\b/, /\bse enfri/, /\bpoco caliente\b/],
  },
  {
    id: "porciones",
    nombre: "Porciones",
    patrones: [/\bporci(on|ones)\b/, /\babundant[e]s?\b/, /\bescas[oa]s?\b/, /\bmuy poco\b/],
  },
  {
    id: "limpieza",
    nombre: "Limpieza",
    patrones: [/\blimpi/, /\bsuci[oa]s?\b/, /\bsuciedad\b/, /\bbanos?\b/, /\bhigien/, /\bmal olor\b/, /\bolor\b/],
  },
  {
    id: "ambiente",
    nombre: "Ambiente",
    patrones: [
      /\bambiente\b/,
      /\bdecoracion\b/,
      /\bmusica\b/,
      /\bruido(s|so|sa)?\b/,
      /\bacogedor[a]?\b/,
      /\btranquil[oa]\b/,
      /\bcomod(o|a|os|as|idad)\b/,
      /\bincomod/,
      /\bcalor\b/,
      /\baire acondicionado\b/,
    ],
  },
  {
    id: "variedad",
    nombre: "Variedad y stock",
    patrones: [/\bvariedad\b/, /\bopciones\b/, /\bsurtido\b/, /\bstock\b/, /\bno (habia|tenian)\b/, /\bse les termin/],
  },
  {
    id: "delivery",
    nombre: "Envíos y pedidos",
    patrones: [/\bdelivery\b/, /\benvios?\b/, /\brappi\b/, /\bpedidos ?ya\b/, /\bpara llevar\b/, /\btake ?away\b/],
  },
  {
    id: "horario",
    nombre: "Horarios",
    patrones: [/\bhorarios?\b/, /\bestaba cerrado\b/, /\bcerrado\b/, /\babren\b/, /\bcierran\b/],
  },
  {
    id: "estacionamiento",
    nombre: "Estacionamiento",
    patrones: [/\bestacionamiento\b/, /\bestacionar\b/, /\bcochera\b/, /\bparking\b/],
  },
];

const POR_ID = new Map(TEMAS.map((t) => [t.id, t]));

export function nombreDeTema(id: string): string {
  return POR_ID.get(id)?.nombre ?? id;
}

/** Minúsculas y sin diacríticos ("Atención" → "atencion", "baño" → "bano"). */
export function normalizarTexto(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Ids de los temas que menciona un texto (cada tema una sola vez). */
export function detectarTemas(texto: string): string[] {
  if (!texto || !texto.trim()) return [];
  const t = normalizarTexto(texto);
  return TEMAS.filter((tema) => tema.patrones.some((p) => p.test(t))).map((tema) => tema.id);
}
