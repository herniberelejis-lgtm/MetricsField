import type { ReactNode } from "react";

// Métricas en una sola tarjeta dividida en celdas: etiqueta arriba, cifra
// de 26px y una línea de detalle (DESIGN.md §4). Sin íconos en círculos ni
// tarjetas sueltas: la misma tira en Escaneos, Calificación y el mes.

export interface CeldaMetrica {
  etiqueta: string;
  valor: string;
  /** Debajo de la cifra: un cambio, una aclaración o qué falta. */
  detalle?: ReactNode;
}

export default function TiraMetricas({
  celdas,
  etiqueta,
  className = "",
}: {
  celdas: CeldaMetrica[];
  /** Nombre de la tira para lectores de pantalla. */
  etiqueta: string;
  className?: string;
}) {
  if (celdas.length === 0) return null;
  // 2 columnas en el celular; en compu, todas en una fila (hasta 5), así no
  // quedan huecos al final.
  const columnas = (["lg:grid-cols-2", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5"] as const)[
    Math.min(celdas.length, 5) - 1
  ];
  return (
    <section
      aria-label={etiqueta}
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#EEF0F3] ${columnas} ${className}`}
    >
      {celdas.map((c) => (
        <div key={c.etiqueta} className="flex min-w-0 flex-col gap-1 bg-white px-4 py-4 sm:px-5">
          <span className="text-[13px] font-medium leading-tight text-slate-600">{c.etiqueta}</span>
          <span className="text-[26px] font-medium leading-tight tracking-tight text-slate-900 tabular-nums">{c.valor}</span>
          {c.detalle && <span className="text-xs leading-snug text-slate-600">{c.detalle}</span>}
        </div>
      ))}
      {/* Con cantidad impar en el celular, la última celda no deja un hueco gris. */}
      {celdas.length % 2 === 1 && <div aria-hidden className="bg-white lg:hidden" />}
    </section>
  );
}
