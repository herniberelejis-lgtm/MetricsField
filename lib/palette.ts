// Paleta de visualización (modo claro, superficie blanca de las cards).
// Validada con el validador de 6 checks: ΔE adyacente mínimo 24.2 (protan),
// banda de luminosidad y piso de croma OK. Aqua y amarillo quedan bajo 3:1
// de contraste sobre blanco → regla de relief: cada gráfico expone vista
// tabla y tooltips (nunca color-solo).
//
// Regla dura: los slots se asignan en orden fijo por entidad y NUNCA se
// reasignan al filtrar — el color sigue a la entidad, no a su fila.

export const SERIES = [
  "#2a78d6", // 1 azul
  "#1baf7a", // 2 aqua
  "#eda100", // 3 amarillo
  "#008300", // 4 verde
  "#4a3aa7", // 5 violeta
  "#e34948", // 6 rojo
] as const;

// Chrome del gráfico (tinta y líneas — el texto usa tokens de texto, nunca
// el color de la serie).
export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
  goodText: "#006300",
} as const;

// Escala de calificación (1★..5★), rojo→verde — la única excepción al mono-
// croma del portal del cliente. Semáforo de calidad a propósito: es la
// convención universal de "reseña mala/buena" y acá el color SÍ es el dato
// (a diferencia de un mapa de calor de volumen, que solo necesita una
// tinta). Ojo con la accesibilidad: un rango rojo→verde de 5 pasos no puede
// pasar el chequeo de daltonismo par-a-par que sí pasan las paletas
// categóricas de esta app (protanopía/deuteranopía confunden precisamente
// rojo y verde) — por eso cada celda que use esta escala tiene que ir
// SIEMPRE acompañada del número real (tooltip y vista Tabla), nunca color
// solo. No reusar esto para nada que no sea "calificación 1-5".
export const RATING_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#d64545",
  2: "#e8834a",
  3: "#d9b525",
  4: "#7fb241",
  5: "#1f8a3d",
};

// Portal del cliente (DESIGN.md §2): cada color significa una sola cosa. El
// dato va en celeste; lo anterior o secundario, en grises; verde y durazno
// solo para "bien" y "para mejorar".
export const PORTAL = {
  dato: "#6F9BCF",
  barra: "#7FA7D3",
  medio: "#A9C5E6",
  suave: "#D9E6F4",
  anterior: "#B8BEC8",
  neutro: "#D3D9E2",
  grilla: "#EEF0F3",
  eje: "#D6D9DE",
  texto: "#1A1A1A",
  textoSec: "#666666",
  bien: "#0B5E40",
  bienBarra: "#8FD1AE",
  bienFondo: "#EAF7F0",
  mal: "#8A3F00",
  malBarra: "#F4B886",
  malFondo: "#FFF4E8",
} as const;

// Calificación 1★..5★ en el portal: la misma idea que RATING_COLORS (de
// "para mejorar" a "bien") pero en los tonos pastel del portal. Igual que
// aquella, nunca va sola: siempre con el número al lado o en el tooltip.
export const RATING_PASTEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#E8907E",
  2: "#F4B886",
  3: "#EDD38A",
  4: "#B9DCA0",
  5: "#8FD1AE",
};

/** Ticks "lindos" para un eje 0..max: devuelve [0, paso, 2·paso, …]. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  const step = candidates.find((c) => c >= rough) ?? candidates[4];
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
