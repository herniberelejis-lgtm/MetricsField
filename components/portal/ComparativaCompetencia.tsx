"use client";

import { useState } from "react";
import { fmtMes, fmtNum, fmtDec } from "@/lib/format";
import type { ComparativaMes, FilaComparativa } from "@/lib/comparativa-competencia";

// Mes a mes contra la competencia: reseñas captadas EN el mes (barra para
// comparar de un vistazo) y calificación al cierre con su cambio. La lógica
// vive en lib/comparativa-competencia.ts; acá solo se elige el mes y se pinta.

function fmtDelta(d: number | null): { texto: string; clase: string } {
  if (d === null) return { texto: "—", clase: "text-slate-300" };
  if (Math.abs(d) < 0.05) return { texto: "=", clase: "text-slate-600" };
  return d > 0
    ? { texto: `+${fmtDec(d, 1)}`, clase: "text-[#0B5E40]" }
    : { texto: `−${fmtDec(Math.abs(d))}`, clase: "text-[#8A3F00]" };
}

export default function ComparativaCompetencia({
  meses,
  primerMes,
}: {
  meses: ComparativaMes[];
  /** Cuándo aparece la primera comparativa, si todavía no hay ninguna. */
  primerMes: string | null;
}) {
  const [sel, setSel] = useState(0);
  const card =
    "min-w-0 rounded-2xl border border-[#E4E6EA] bg-white p-5 sm:p-6";

  if (meses.length === 0) {
    if (!primerMes) return null;
    return (
      <div className={card}>
        <h3 className="text-[15px] font-bold text-slate-900">Mes a mes vs tu competencia</h3>
        <p className="mt-1 text-sm text-slate-600">
          La comparación arranca en <strong>{fmtMes(primerMes)}</strong>: cada noche guardamos cómo está tu
          competencia y, cuando cerremos el primer mes, vas a ver cuántas reseñas captó cada uno contra vos y
          cómo se movió su calificación.
        </p>
      </div>
    );
  }

  const mes = meses[Math.min(sel, meses.length - 1)];
  const vos = mes.filas.find((f) => f.esPropio) ?? null;
  const etiquetaMes = `${fmtMes(mes.mes)}${mes.enCurso ? " (en curso)" : ""}`;

  return (
    <div className={card}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">Mes a mes vs tu competencia</h3>
          <p className="mt-0.5 text-xs text-slate-600">Reseñas captadas en el mes y calificación al cierre</p>
        </div>
        {meses.length > 1 && (
          <select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="shrink-0 rounded-lg border border-[#D6D9DE] bg-white px-2.5 py-1 text-xs text-slate-700"
            aria-label="Elegir mes"
          >
            {meses.map((m, i) => (
              <option key={m.mes} value={i}>
                {fmtMes(m.mes)}
                {m.enCurso ? " (en curso)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {vos && (vos.nuevas !== null || vos.rating !== null) && (
        <div className="mb-4 rounded-2xl bg-[#F4F7FB] px-4 py-3 text-sm text-slate-700">
          {vos.nuevas !== null && (
            <p>
              En {etiquetaMes} captaste <strong>{fmtNum(vos.nuevas)}</strong> reseña{vos.nuevas === 1 ? "" : "s"}
              {mes.puesto && (
                <>
                  : <strong>puesto #{mes.puesto.puesto}</strong> de {mes.puesto.total}
                </>
              )}
              .
              {mes.promedioCompetencia !== null && (
                <span className="text-slate-600">
                  {" "}
                  Tu competencia promedió {mes.promedioCompetencia.toFixed(mes.promedioCompetencia < 10 ? 1 : 0)}.
                </span>
              )}
            </p>
          )}
          {vos.rating !== null && (
            <p className="mt-1 text-slate-700">
              Tu calificación: {fmtDec(vos.rating, 1)}★
              {vos.deltaRating !== null && Math.abs(vos.deltaRating) >= 0.05 && ` (${fmtDelta(vos.deltaRating).texto})`}
              {mes.ratingCompetencia !== null && ` · competencia promedio ${fmtDec(mes.ratingCompetencia, 1)}★`}
            </p>
          )}
        </div>
      )}

      <TablaComparativa filas={mes.filas} />
      {mes.enCurso && (
        <p className="mt-3 text-xs text-slate-600">
          El mes todavía no terminó: es lo captado hasta hoy, igual para todos.
        </p>
      )}
    </div>
  );
}

/** Tabla de captación: barra de reseñas captadas, calificación y cambio.
 * La usan la comparativa mes a mes y "desde que los seguimos". */
export function TablaComparativa({
  filas,
  notaFila,
}: {
  filas: FilaComparativa[];
  /** Texto chico al lado del nombre (p. ej. "desde 15/10"). */
  notaFila?: (f: FilaComparativa) => string | null;
}) {
  const maxNuevas = Math.max(1, ...filas.map((f) => f.nuevas ?? 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
            <th className="px-2 py-2 font-medium">Comercio</th>
            <th className="px-2 py-2 font-medium">Reseñas captadas</th>
            <th className="px-2 py-2 font-medium">Calificación</th>
            <th className="px-2 py-2 font-medium">Cambio</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const delta = fmtDelta(f.deltaRating);
            return (
              <tr
                key={String(f.id)}
                className={`border-b border-[#EEF0F3] last:border-0 ${f.esPropio ? "bg-[#F4F7FB]" : ""}`}
              >
                <td className={`px-2 py-2 ${f.esPropio ? "font-semibold text-[#1F4E80]" : "text-slate-700"}`}>
                  {f.esPropio ? "Vos" : f.nombre}
                  {notaFila?.(f) && <span className="ml-1.5 text-xs font-normal text-slate-600">{notaFila(f)}</span>}
                </td>
                <td className="px-2 py-2">
                  {f.nuevas === null ? (
                    <span className="text-slate-600">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-[#EEF0F3] sm:w-32" aria-hidden>
                        <div
                          className={`h-full rounded-full ${f.esPropio ? "bg-[#6F9BCF]" : "bg-[#D3D9E2]"}`}
                          style={{ width: `${(f.nuevas / maxNuevas) * 100}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-slate-800">{fmtNum(f.nuevas)}</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 tabular-nums text-slate-700">
                  {f.rating === null ? "—" : `${fmtDec(f.rating, 1)}★`}
                </td>
                <td className={`px-2 py-2 tabular-nums font-medium ${delta.clase}`}>{delta.texto}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
