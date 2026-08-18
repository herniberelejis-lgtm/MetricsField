export const RUBROS = [
  "Peluquería / Barbería",
  "Restaurante / Bar",
  "Clínica / Consultorio",
  "Taller mecánico",
  "Veterinaria",
  "Gimnasio",
  "Estética",
  "Otro",
];

export const ZONAS = ["Güemes", "Nueva Córdoba", "Alberdi", "General Paz", "Cerro de las Rosas", "Otra"];

export const PLANES = ["Base", "Premium"];
export const ESTADOS = ["prospecto", "activo", "pausado", "baja"];

export function fmtARS(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtNum(n) {
  return new Intl.NumberFormat("es-AR").format(n);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fmtMes(ym) {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

export function deltaKpi(actual, anterior) {
  const d = actual - anterior;
  if (d === 0) return { dir: "flat", valor: 0 };
  return { dir: d > 0 ? "up" : "down", valor: d };
}

export function citasIA(m) {
  if (!m) return 0;
  return (m.citasChatGPT ?? 0) + (m.citasCopilot ?? 0) + (m.citasPerplexity ?? 0);
}
