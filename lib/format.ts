// Helpers de formato para es-AR.

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("es-AR");

export function fmtARS(v: number): string {
  return ars.format(v);
}

export function fmtNum(v: number): string {
  return num.format(v);
}

/** Decimal con coma y cantidad fija de decimales: 4.6 → "4,6". */
export function fmtDec(v: number, decimales = 1): string {
  return v.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function fmtMes(mes: string): string {
  // "2026-06" -> "Jun 2026"
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const [y, m] = mes.split("-").map(Number);
  const nombres = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${nombres[(m ?? 1) - 1]} ${y}`;
}

export function delta(actual: number, anterior: number): {
  valor: number;
  pct: number | null;
  dir: "up" | "down" | "flat";
} {
  const valor = actual - anterior;
  const pct = anterior !== 0 ? (valor / anterior) * 100 : null;
  const dir = valor > 0 ? "up" : valor < 0 ? "down" : "flat";
  return { valor, pct, dir };
}
