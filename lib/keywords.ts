// Extracción de términos recurrentes sin costo ni API: cuenta palabras
// sobre el texto que ya existe (reseñas + feedback) y devuelve las más
// repetidas. No es NLP ni un LLM — es frecuencia de tokens con una lista de
// vacías (stopwords) en español. Alcanza para "de qué se habla este mes";
// para detectar empleados o sentimiento haría falta el enchufe de IA (hoy
// sin usar).

const VACIAS = new Set<string>([
  "para", "pero", "como", "porque", "cuando", "donde", "muy", "mas",
  "este", "esta", "estos", "estas", "eso", "esa", "ese", "esos", "esas",
  "que", "con", "por", "los", "las", "una", "unos", "unas", "del", "les",
  "sus", "sin", "son", "fue", "han", "hay", "sea", "ser", "estan", "todo",
  "toda", "todos", "todas", "nada", "algo", "ahi", "aca", "alla", "tambien",
  "tan", "asi", "vez", "veces", "dia", "dias", "hoy", "aqui", "ellos",
  "ellas", "nosotros", "ustedes", "usted", "vos", "hola", "gracias", "buen",
  "buena", "bueno", "buenos", "buenas", "local", "lugar", "solo", "hace",
  "hacer", "tiene", "tienen", "estuvo", "estuve", "muchas", "muchos", "mucho",
  "poco", "cada", "otro", "otra", "otros", "otras", "sobre", "entre", "hasta",
  "desde", "cual", "quien", "cuales", "algun", "alguna",
]);

// NFD + saca todos los diacríticos (U+0300–U+036F): "áé" -> "ae", "ñ" -> "n"
// (aceptable para contar términos). Después quedan solo letras a-z.
const NORM = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface TerminoFrecuente {
  termino: string;
  conteo: number;
}

/** Devuelve los términos más repetidos en un conjunto de textos. Solo cuenta
 * palabras de ≥4 letras que no sean vacías, y solo devuelve las que aparecen
 * al menos `minimo` veces (por eso "recurrentes"). */
export function terminosFrecuentes(
  textos: string[],
  opciones: { max?: number; minimo?: number } = {},
): TerminoFrecuente[] {
  const { max = 8, minimo = 2 } = opciones;
  const conteos = new Map<string, number>();

  for (const texto of textos) {
    if (!texto) continue;
    const tokens = NORM(texto).match(/[a-z]+/g) ?? [];
    // Una vez por texto: que una reseña que repite "café" 5 veces no pese
    // como 5 menciones.
    const vistos = new Set<string>();
    for (const t of tokens) {
      if (t.length < 4 || VACIAS.has(t)) continue;
      vistos.add(t);
    }
    for (const t of vistos) conteos.set(t, (conteos.get(t) ?? 0) + 1);
  }

  return [...conteos.entries()]
    .filter(([, n]) => n >= minimo)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([termino, conteo]) => ({ termino, conteo }));
}
