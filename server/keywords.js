const VACIAS = new Set([
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

const NORM = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function terminosFrecuentes(textos, opciones = {}) {
  const { max = 8, minimo = 2 } = opciones;
  const conteos = new Map();

  for (const texto of textos) {
    if (!texto) continue;
    const tokens = NORM(texto).match(/[a-z]+/g) ?? [];
    const vistos = new Set();
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

module.exports = { terminosFrecuentes };
