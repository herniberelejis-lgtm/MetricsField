const PALABRAS_TEMA = {
  atencion: ["atenci", "trato", "amable", "grosero", "personal", "atendieron"],
  precio: ["precio", "caro", "barato", "costoso", "plata", "cuesta"],
  demora: ["tardó", "tardaron", "demora", "espera", "esperar", "lento", "rápido", "rapidez"],
  limpieza: ["limpio", "sucio", "limpieza", "higiene", "orden"],
  calidad: ["calidad", "rico", "malo", "excelente", "producto", "resultado"],
};

function detectarTema(texto) {
  const t = texto.toLowerCase();
  for (const [tema, palabras] of Object.entries(PALABRAS_TEMA)) {
    if (palabras.some((p) => t.includes(p))) return tema;
  }
  return "general";
}

function variante(seed, opciones) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return opciones[hash % opciones.length];
}

const CIERRE_POSITIVO = {
  cercano: ["¡Te esperamos pronto de nuevo! 🙌", "¡Gracias por elegirnos!", "¡Nos vemos la próxima! 😊"],
  formal: ["Esperamos poder atenderlo nuevamente.", "Gracias por su confianza.", "A su disposición siempre."],
};

const CIERRE_NEGATIVO = {
  cercano: [
    "Nos encantaría que nos des otra oportunidad.",
    "Ya lo estamos corrigiendo, ¡gracias por avisarnos!",
    "Cualquier cosa, escribinos directo.",
  ],
  formal: [
    "Estamos trabajando para mejorar en base a su comentario.",
    "Agradecemos que nos lo haya hecho saber.",
    "Quedamos a disposición para lo que necesite.",
  ],
};

const TEMA_POSITIVO = {
  atencion: { cercano: "Nos alegra un montón que la atención te haya gustado.", formal: "Nos complace saber que la atención fue de su agrado." },
  precio: { cercano: "Que sientas que vale la pena es lo que más nos importa.", formal: "Valoramos que considere justa nuestra propuesta de precio." },
  demora: { cercano: "Qué bueno que los tiempos estuvieron a la altura.", formal: "Celebramos que los tiempos de atención hayan sido adecuados." },
  limpieza: { cercano: "La verdad que nos esforzamos por mantener todo impecable.", formal: "Ponemos especial cuidado en la limpieza del espacio." },
  calidad: { cercano: "Nos pone muy contentos que el resultado te haya encantado.", formal: "Nos complace que la calidad haya cumplido sus expectativas." },
};

const TEMA_NEGATIVO = {
  atencion: { cercano: "Lamentamos que la atención no haya sido como esperabas, no es lo habitual.", formal: "Lamentamos que la atención no haya cumplido sus expectativas." },
  precio: { cercano: "Entendemos tu comentario sobre el precio, lo tenemos en cuenta.", formal: "Tomamos nota de su comentario respecto al valor del servicio." },
  demora: { cercano: "La demora no está buena, ya lo estamos revisando con el equipo.", formal: "Lamentamos la demora; estamos revisando nuestros tiempos de atención." },
  limpieza: { cercano: "Gracias por avisarnos, la limpieza es algo que cuidamos mucho y lo vamos a reforzar.", formal: "Agradecemos el aviso; reforzaremos los protocolos de limpieza." },
  calidad: { cercano: "Lamentamos que el resultado no haya sido el esperado, queremos compensarlo.", formal: "Lamentamos que el resultado no haya cumplido sus expectativas." },
};

const SALUDOS = {
  cercano: ["Hola {autor}, ¡gracias por tu reseña!", "¡Hola {autor}!", "{autor}, muchas gracias por tomarte el tiempo."],
  formal: ["Estimado/a {autor}, muchas gracias por su reseña.", "Sr./Sra. {autor}, agradecemos su comentario."],
};

export function generarRespuestaSugerida(autor, estrellas, texto, tono = "cercano", intento = 0) {
  const positiva = estrellas >= 4;
  const tema = detectarTema(texto);
  const sal = String(intento);
  const saludo = variante(autor + texto + sal, SALUDOS[tono]).replace("{autor}", autor);
  const cuerpoTema =
    tema === "general"
      ? positiva
        ? { cercano: "Nos alegra mucho que hayas tenido una buena experiencia.", formal: "Nos complace que su experiencia haya sido positiva." }[tono]
        : { cercano: "Lamentamos que la experiencia no haya sido la esperada.", formal: "Lamentamos que su experiencia no haya cumplido sus expectativas." }[tono]
      : (positiva ? TEMA_POSITIVO : TEMA_NEGATIVO)[tema][tono];
  const cierre = variante(texto + tono + sal, positiva ? CIERRE_POSITIVO[tono] : CIERRE_NEGATIVO[tono]);
  return `${saludo} ${cuerpoTema} ${cierre}`;
}
