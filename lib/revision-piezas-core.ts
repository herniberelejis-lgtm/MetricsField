// Lógica pura de la revisión semanal de piezas autogestionadas (ver
// lib/revision-piezas.ts): qué se guarda de cada revisión y cuándo se avisa.
// Separada para probarla sin base ni Google (test/revision-piezas.test.ts).

import type { EstadoLugar } from "./places";

export interface Revision {
  estado: EstadoLugar;
  /** ISO de cuándo se vio este estado por primera vez. */
  desde: string;
  /** ISO de la última revisión. */
  revisado: string;
}

export function leerRevision(valor: string | null | undefined): Revision | null {
  if (!valor) return null;
  try {
    const r = JSON.parse(valor) as Partial<Revision>;
    if (!r.estado || !["ok", "cerrada_temporal", "cerrada", "no_encontrada"].includes(r.estado)) return null;
    return { estado: r.estado, desde: String(r.desde ?? ""), revisado: String(r.revisado ?? "") };
  } catch {
    return null;
  }
}

/** La revisión nueva a guardar: conserva `desde` si el estado no cambió. */
export function siguienteRevision(anterior: Revision | null, estado: EstadoLugar, ahora: Date): Revision {
  const iso = ahora.toISOString();
  return { estado, desde: anterior?.estado === estado ? anterior.desde || iso : iso, revisado: iso };
}

/** Se avisa una sola vez por problema: cuando la pieza pasa a un estado
 * malo distinto del que ya tenía (no todas las semanas). */
export function hayQueAvisar(anterior: Revision | null, estado: EstadoLugar): boolean {
  return estado !== "ok" && anterior?.estado !== estado;
}

export const TEXTO_ESTADO: Record<EstadoLugar, string> = {
  ok: "Funcionando",
  cerrada_temporal: "Google marca el negocio como cerrado temporalmente",
  cerrada: "Google marca el negocio como cerrado definitivamente",
  no_encontrada: "La ficha de Google ya no existe",
};
