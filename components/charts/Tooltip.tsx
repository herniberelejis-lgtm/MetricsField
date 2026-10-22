"use client";

// Tooltip de gráfico: una fila por serie, con "line key" (trazo corto del
// color de la serie). El valor lidera (fuerte), el nombre acompaña.
// Los nombres se insertan como texto React (nunca innerHTML).
export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export default function Tooltip({
  title,
  rows,
  leftPct,
  topPct,
}: {
  title: string;
  rows: TooltipRow[];
  leftPct: number; // 0..100, relativo al contenedor del gráfico
  topPct: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[9rem] -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md"
      style={{
        left: `${Math.min(Math.max(leftPct, 14), 86)}%`,
        top: `${Math.max(topPct, 2)}%`,
      }}
      role="status"
    >
      <div className="mb-1 text-[11px] font-medium text-slate-600">{title}</div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            {r.color && (
              <span
                className="inline-block h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: r.color }}
              />
            )}
            <span className="font-semibold text-slate-900 tabular-nums">
              {r.value}
            </span>
            <span className="text-slate-600">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
