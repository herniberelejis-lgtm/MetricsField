import type { TonoMarca } from "./types";

// Generador de respuestas sugeridas SIN ninguna API paga: combina
// sentimiento (según estrellas) × tema (detectado por palabras clave en el
// texto) × tono de marca del comercio, con variantes para no repetirse.
// El botón "Sugerir respuesta" del CRM llama a esta función — el enchufe a
// una API real (Anthropic) queda para más adelante, cuando el fundador
// decida pagarla; hasta entonces esto ES el producto, no un placeholder.

type Tema = "atencion" | "precio" | "demora" | "limpieza" | "calidad" | "general";

const PALABRAS_TEMA: Record<Exclude<Tema, "general">, string[]> = {
  atencion: ["atenci", "trato", "amable", "grosero", "personal", "atendieron"],
  precio: ["precio", "caro", "barato", "costoso", "plata", "cuesta"],
  demora: ["tardó", "tardaron", "demora", "espera", "esperar", "lento", "rápido", "rapidez"],
  limpieza: ["limpio", "sucio", "limpieza", "higiene", "orden"],
  calidad: ["calidad", "rico", "malo", "excelente", "producto", "resultado"],
};

function detectarTema(texto: string): Tema {
  const t = texto.toLowerCase();
  for (const [tema, palabras] of Object.entries(PALABRAS_TEMA)) {
    if (palabras.some((p) => t.includes(p))) return tema as Tema;
  }
  return "general";
}

/** Elige una variante de forma estable según el texto (mismo texto → misma
 * variante, para que no cambie cada vez que se abre la página). */
function variante<T>(seed: string, opciones: T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return opciones[hash % opciones.length];
}

const CIERRE_POSITIVO: Record<TonoMarca, string[]> = {
  cercano: [
    "¡Te esperamos pronto de nuevo! 🙌",
    "¡Gracias por elegirnos!",
    "¡Nos vemos la próxima! 😊",
    "¡Volvé cuando quieras!",
    "¡Siempre es un gusto recibirte!",
    "¡Hasta la próxima!",
    "¡Gracias por la buena onda!",
    "¡Te esperamos con las puertas abiertas!",
  ],
  formal: [
    "Esperamos poder atenderlo nuevamente.",
    "Gracias por su confianza.",
    "A su disposición siempre.",
    "Será un gusto recibirlo otra vez.",
    "Lo esperamos en su próxima visita.",
    "Muchas gracias por elegirnos.",
  ],
};

const CIERRE_NEGATIVO: Record<TonoMarca, string[]> = {
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

const TEMA_POSITIVO: Record<Exclude<Tema, "general">, Record<TonoMarca, string[]>> = {
  atencion: {
    cercano: [
      "Nos alegra un montón que la atención te haya gustado.",
      "Le vamos a pasar tus palabras al equipo, ¡se van a poner muy contentos!",
      "Que te hayas sentido bien atendido es lo que más buscamos.",
    ],
    formal: [
      "Nos complace saber que la atención fue de su agrado.",
      "Transmitiremos sus palabras a todo el equipo.",
      "Es una satisfacción saber que se sintió bien atendido.",
    ],
  },
  precio: {
    cercano: [
      "Que sientas que vale la pena es lo que más nos importa.",
      "Nos alegra que la relación precio-calidad te haya cerrado.",
      "Buscamos siempre que valga cada peso, ¡qué bueno que se note!",
    ],
    formal: [
      "Valoramos que considere justa nuestra propuesta de precio.",
      "Nos alegra que la relación entre precio y calidad le haya resultado adecuada.",
      "Trabajamos para ofrecer un buen valor y nos complace que lo perciba.",
    ],
  },
  demora: {
    cercano: [
      "Qué bueno que los tiempos estuvieron a la altura.",
      "Nos alegra que no hayas tenido que esperar.",
      "Ponemos mucho empeño en ser rápidos, ¡gracias por notarlo!",
    ],
    formal: [
      "Celebramos que los tiempos de atención hayan sido adecuados.",
      "Nos complace que la atención haya sido ágil.",
      "Agradecemos que destaque la rapidez del servicio.",
    ],
  },
  limpieza: {
    cercano: [
      "La verdad que nos esforzamos por mantener todo impecable.",
      "Qué bueno que se note el cuidado que le ponemos al lugar.",
      "Mantener todo limpio y ordenado es una prioridad para nosotros.",
    ],
    formal: [
      "Ponemos especial cuidado en la limpieza del espacio.",
      "Nos complace que haya notado el cuidado del lugar.",
      "La limpieza y el orden son una prioridad para nuestro equipo.",
    ],
  },
  calidad: {
    cercano: [
      "Nos pone muy contentos que el resultado te haya encantado.",
      "¡Qué bueno que te haya gustado tanto!",
      "Le ponemos mucho cariño a cada detalle, nos alegra que se note.",
    ],
    formal: [
      "Nos complace que la calidad haya cumplido sus expectativas.",
      "Es una satisfacción saber que quedó conforme con el resultado.",
      "Cuidamos cada detalle y nos alegra que lo haya apreciado.",
    ],
  },
};

const GENERAL_POSITIVO: Record<TonoMarca, string[]> = {
  cercano: [
    "Nos alegra mucho que hayas tenido una buena experiencia.",
    "¡Qué lindo leer esto!",
    "Nos alegraste el día con tu comentario.",
    "Comentarios así nos dan pilas para seguir.",
    "Nos encanta saber que la pasaste bien.",
    "Es un placer que te hayas ido contento.",
  ],
  formal: [
    "Nos complace que su experiencia haya sido positiva.",
    "Es una satisfacción recibir comentarios como el suyo.",
    "Valoramos mucho que haya compartido su experiencia.",
    "Nos alegra que su visita haya sido de su agrado.",
  ],
};

const TEMA_NEGATIVO: Record<Exclude<Tema, "general">, Record<TonoMarca, string>> = {
  atencion: {
    cercano: "Lamentamos que la atención no haya sido como esperabas, no es lo habitual.",
    formal: "Lamentamos que la atención no haya cumplido sus expectativas.",
  },
  precio: {
    cercano: "Entendemos tu comentario sobre el precio, lo tenemos en cuenta.",
    formal: "Tomamos nota de su comentario respecto al valor del servicio.",
  },
  demora: {
    cercano: "La demora no está buena, ya lo estamos revisando con el equipo.",
    formal: "Lamentamos la demora; estamos revisando nuestros tiempos de atención.",
  },
  limpieza: {
    cercano: "Gracias por avisarnos, la limpieza es algo que cuidamos mucho y lo vamos a reforzar.",
    formal: "Agradecemos el aviso; reforzaremos los protocolos de limpieza.",
  },
  calidad: {
    cercano: "Lamentamos que el resultado no haya sido el esperado, queremos compensarlo.",
    formal: "Lamentamos que el resultado no haya cumplido sus expectativas.",
  },
};

const SALUDOS: Record<TonoMarca, string[]> = {
  cercano: ["Hola {autor}, ¡gracias por tu reseña!", "¡Hola {autor}!", "{autor}, muchas gracias por tomarte el tiempo."],
  formal: ["Estimado/a {autor}, muchas gracias por su reseña.", "Sr./Sra. {autor}, agradecemos su comentario."],
};

const SALUDOS_SIN_NOMBRE: Record<TonoMarca, string[]> = {
  cercano: [
    "¡Hola! Gracias por tu reseña.",
    "¡Hola!",
    "Muchas gracias por tomarte el tiempo.",
    "¡Gracias por dejarnos tu opinión!",
    "¡Mil gracias por tu comentario!",
    "¡Hola! Qué bueno leerte.",
    "¡Gracias por escribirnos!",
  ],
  formal: [
    "Muchas gracias por su reseña.",
    "Agradecemos su comentario.",
    "Le agradecemos que se haya tomado el tiempo de escribirnos.",
    "Muchas gracias por compartir su opinión.",
  ],
};

/** El nombre público de Google lo elige el autor de la reseña: puede ser un
 * teléfono, un link o cualquier texto. Como la respuesta sale publicada con
 * la identidad del comercio (a veces sin que nadie la lea antes), del
 * nombre solo se usa la primera palabra, con letras nada más y corta. Si no
 * queda un nombre razonable, se saluda sin nombre. */
export function nombreParaSaludo(autor: string): string {
  const primera = (autor ?? "").normalize("NFC").trim().split(/\s+/)[0] ?? "";
  if (!/^[\p{L}][\p{L}'’-]{1,19}$/u.test(primera)) return "";
  return primera.charAt(0).toLocaleUpperCase("es") + primera.slice(1);
}

/**
 * `intento` deja pedir una variante distinta a propósito (botón "Regenerar")
 * sin volverse aleatorio: mismo intento + mismo texto siempre da la misma
 * combinación, así no "tiembla" si se re-renderiza sin que el usuario pida
 * cambiarla.
 */
export function generarRespuestaSugerida(
  autor: string,
  estrellas: number,
  texto: string,
  tono: TonoMarca = "cercano",
  intento = 0,
): string {
  const positiva = estrellas >= 4;
  const tema = detectarTema(texto);
  const sal = String(intento);
  const nombre = nombreParaSaludo(autor);
  // Reemplazo con función: un string de reemplazo interpreta $&, $' y $`.
  const saludo = nombre
    ? variante(autor + texto + sal, SALUDOS[tono]).replace("{autor}", () => nombre)
    : variante(autor + texto + sal, SALUDOS_SIN_NOMBRE[tono]);
  // Cada parte se elige con su propia semilla: así cambiar `intento` mueve
  // las tres por separado y salen cientos de combinaciones distintas (la
  // respuesta automática no puede repetirse entre reseñas del mismo local).
  const semillaCuerpo = `${texto}|cuerpo|${sal}`;
  const cuerpoTema =
    tema === "general"
      ? positiva
        ? variante(semillaCuerpo, GENERAL_POSITIVO[tono])
        : { cercano: "Lamentamos que la experiencia no haya sido la esperada.", formal: "Lamentamos que su experiencia no haya cumplido sus expectativas." }[tono]
      : positiva
        ? variante(semillaCuerpo, TEMA_POSITIVO[tema][tono])
        : TEMA_NEGATIVO[tema][tono];
  const cierre = variante(texto + tono + sal, positiva ? CIERRE_POSITIVO[tono] : CIERRE_NEGATIVO[tono]);

  return `${saludo} ${cuerpoTema} ${cierre}`;
}
