// Aviso semanal gratis para quien compró piezas sueltas (Mercado Libre) y
// lo pidió al activarlas: cuántas personas usaron cada pieza en la semana.
// Es la puerta al panel pago: el mail muestra lo que sí sabemos (toques) y
// ofrece lo que solo da el panel (cuántas reseñas trajo, responderlas,
// compararse con la competencia). Funciones puras: se testean sin base.

export interface PiezaAviso {
  id: string;
  nombreNegocio: string;
  email: string;
  toquesSemana: number;
  toquesSemanaAnterior: number;
  toquesTotal: number;
}

export interface AvisoPiezas {
  email: string;
  /** Negocios de ese mail (alguien puede tener piezas en dos locales). */
  negocios: string[];
  toquesSemana: number;
  toquesSemanaAnterior: number;
  piezas: { id: string; negocio: string; semana: number; total: number }[];
  /** Comparación en palabras contra la semana anterior; null si no hay con qué. */
  cambio: string | null;
}

export function agruparAvisos(piezas: PiezaAviso[]): AvisoPiezas[] {
  const porMail = new Map<string, PiezaAviso[]>();
  for (const p of piezas) {
    const k = p.email.trim().toLowerCase();
    if (!k) continue;
    porMail.set(k, [...(porMail.get(k) ?? []), p]);
  }
  return [...porMail.entries()].map(([email, ps]) => {
    const semana = ps.reduce((a, p) => a + p.toquesSemana, 0);
    const anterior = ps.reduce((a, p) => a + p.toquesSemanaAnterior, 0);
    let cambio: string | null = null;
    if (anterior > 0) {
      const pct = Math.round(((semana - anterior) / anterior) * 100);
      cambio = pct === 0 ? "igual que la semana anterior" : `${Math.abs(pct)}% ${pct > 0 ? "más" : "menos"} que la semana anterior`;
    }
    return {
      email,
      negocios: [...new Set(ps.map((p) => p.nombreNegocio))],
      toquesSemana: semana,
      toquesSemanaAnterior: anterior,
      piezas: ps.map((p) => ({ id: p.id, negocio: p.nombreNegocio, semana: p.toquesSemana, total: p.toquesTotal })),
      cambio,
    };
  });
}

/** Una pieza sin ningún toque en toda su vida no merece un mail que diga
 * "0" cada lunes: se manda igual, pero con el consejo de dónde ponerla. */
export function consejoAviso(a: AvisoPiezas): string | null {
  if (a.toquesSemana === 0) {
    return "Esta semana nadie la usó. Ponela bien a la vista (en la caja o en la mesa) y pedí la reseña en voz alta al cobrar: “¿Nos dejás una reseña? Acercá el celu acá”.";
  }
  if (a.toquesSemanaAnterior > 0 && a.toquesSemana < a.toquesSemanaAnterior) {
    return "Bajó un poco: recordale al equipo que la ofrezca al cobrar, a todos por igual.";
  }
  return null;
}
