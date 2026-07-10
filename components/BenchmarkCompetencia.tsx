"use client";

import { useState } from "react";
import type { BenchmarkMes } from "@/lib/types";
import { fmtMes, fmtNum } from "@/lib/format";

/** Crecimiento del mes más reciente vs el anterior — calculado en el
 * servidor (ver app/portal/[codigo]/page.tsx) sobre los mismos datos de
 * `meses`, comparando reseñas nuevas propias contra las de los
 * competidores que se pudieron emparejar por nombre entre ambos meses. */
export interface CrecimientoVsCompetencia {
  mes: string;
  propio: number; // reseñas nuevas este mes (delta del total)
  propioPct: number | null;
  competenciaPct: number | null; // null si no hay competidores comparables entre los dos meses
}

// Benchmarking mensual: enfrenta las métricas del propio comercio con la
// foto de cada competidor "al corte" del mes elegido. Los datos vienen ya
// congelados desde competidores_snapshots (ver getBenchmarkMensual); acá
// solo se elige el mes y se arma la tabla.
export default function BenchmarkCompetencia({
  meses,
  crecimiento,
}: {
  meses: BenchmarkMes[];
  crecimiento?: CrecimientoVsCompetencia | null;
}) {
  const [sel, setSel] = useState(0);
  if (meses.length === 0) return null;
  const mes = meses[Math.min(sel, meses.length - 1)];

  const fmtRating = (v: number | null) => (v === null ? "—" : v.toFixed(1));
  const fmtRes = (v: number | null) => (v === null ? "—" : fmtNum(v));
  const fmtPct = (v: number | null) => (v === null ? null : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {crecimiento && (crecimiento.propioPct !== null || crecimiento.competenciaPct !== null) && (
        <div className="mb-4 rounded-lg bg-brand/5 px-3.5 py-2.5 text-sm">
          <span className="font-medium text-slate-800">
            {fmtMes(crecimiento.mes)}: {crecimiento.propio >= 0 ? "creciste" : "bajaste"} {fmtPct(crecimiento.propioPct) ?? `${crecimiento.propio >= 0 ? "+" : ""}${crecimiento.propio} reseñas`}
          </span>
          {crecimiento.competenciaPct !== null && (
            <span className="text-slate-500"> · tu competencia {fmtPct(crecimiento.competenciaPct)}</span>
          )}
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Benchmarking vs competencia
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Reseñas y rating al corte de cada mes
          </p>
        </div>
        {meses.length > 1 && (
          <select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            aria-label="Elegir mes"
          >
            {meses.map((m, i) => (
              <option key={m.mes} value={i}>
                {fmtMes(m.mes)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2 font-medium">Comercio</th>
              <th className="px-2 py-2 font-medium">Reseñas</th>
              <th className="px-2 py-2 font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-brand/5">
              <td className="px-2 py-2 font-semibold text-brand-fg">Tu negocio</td>
              <td className="px-2 py-2 tabular-nums font-medium text-slate-800">
                {fmtRes(mes.propioResenas)}
              </td>
              <td className="px-2 py-2 tabular-nums font-medium text-slate-800">
                {fmtRating(mes.propioRating)}
              </td>
            </tr>
            {mes.competidores.map((c, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-2 text-slate-700">{c.nombre}</td>
                <td className="px-2 py-2 tabular-nums text-slate-600">
                  {fmtRes(c.totalResenas)}
                </td>
                <td className="px-2 py-2 tabular-nums text-slate-600">
                  {fmtRating(c.rating)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mes.propioResenas === null && (
        <p className="mt-3 text-xs text-slate-400">
          Este mes todavía no tiene tus métricas cargadas, por eso aparece “—”
          en tu fila.
        </p>
      )}
    </div>
  );
}
