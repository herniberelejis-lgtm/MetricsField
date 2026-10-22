"use client";

import { useState, type ReactNode } from "react";

export interface LegendItem {
  label: string;
  color: string;
  mark: "rect" | "line";
}

export interface TableData {
  head: string[];
  rows: string[][];
}

// Card contenedora de un gráfico: título, leyenda (siempre visible con ≥2
// series), y toggle Gráfico/Tabla — la tabla es el twin accesible (WCAG) y
// el canal de "relief" para los colores bajo 3:1 de contraste.
export default function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  table: TableData;
  children: ReactNode;
  /** "glass" es la tarjeta del portal del cliente (DESIGN.md) —
   * "solid" (default) es el que sigue usando /admin. */
  variant?: "solid" | "glass";
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  // Admin y portal con el mismo estilo (DESIGN.md); la variante queda por
  // compatibilidad.
  const portal = true;
  const wrapClass = "min-w-0 rounded-2xl border border-[#E4E6EA] bg-white p-5 sm:p-6";

  return (
    <div className={wrapClass}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={portal ? "text-[15px] font-bold text-slate-900" : "text-sm font-semibold text-slate-900"}>{title}</h3>
          {subtitle && (
            <p className={`mt-0.5 text-xs ${portal ? "text-slate-600" : "text-slate-500"}`}>{subtitle}</p>
          )}
        </div>
        <div className={`flex shrink-0 overflow-hidden rounded-lg border text-xs ${portal ? "border-[#E4E6EA]" : "border-slate-200"}`}>
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={
                view === v
                  ? portal
                    ? "bg-[#F1F4F8] px-3 py-1.5 font-semibold text-slate-900"
                    : "bg-slate-100 px-2.5 py-1 font-medium text-slate-800"
                  : portal
                    ? "px-3 py-1.5 text-slate-600 hover:text-slate-900"
                    : "px-2.5 py-1 text-slate-500 hover:text-slate-800"
              }
            >
              {v === "chart" ? "Gráfico" : "Tabla"}
            </button>
          ))}
        </div>
      </div>

      {legend && legend.length >= 2 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600"
            >
              {item.mark === "rect" ? (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
              ) : (
                <span
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.label}
            </span>
          ))}
        </div>
      )}

      {view === "chart" ? (
        children
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr
                className={
                  portal
                    ? "border-b border-[#EEF0F3] text-left text-xs text-slate-600"
                    : "border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"
                }
              >
                {table.head.map((h) => (
                  <th key={h} className="px-2 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className={`border-b last:border-0 ${portal ? "border-[#EEF0F3]" : "border-slate-100"}`}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={
                        j === 0
                          ? "px-2 py-1.5 font-medium text-slate-800"
                          : portal
                            ? "px-2 py-1.5 text-right text-slate-800"
                            : "px-2 py-1.5 text-slate-600 tabular-nums"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
