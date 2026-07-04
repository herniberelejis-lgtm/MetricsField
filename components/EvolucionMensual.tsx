"use client";

import { useState } from "react";
import type { MetricaMensual } from "@/lib/types";
import { citasIA } from "@/lib/types";
import { fmtMes, fmtNum } from "@/lib/format";
import type { TerminoFrecuente } from "@/lib/keywords";

// Detalle ya calculado en el servidor (no viaja texto crudo de reseñas ni
// feedback al cliente — solo el agregado).
export interface DetalleMes {
  terminos: TerminoFrecuente[];
  nResenasTexto: number;
}

// Evolución mes a mes interactiva: la misma tabla de siempre, pero cada fila
// se despliega en un panel con lo que SÍ se puede derivar automático de los
// datos actuales — los términos/temas más repetidos en las reseñas y el
// feedback de ese mes. Horarios y empleados no se pueden derivar hoy (las
// reseñas se guardan sin hora y no hay registro de empleados), así que se
// dicen como no disponibles en vez de inventarlos.
export default function EvolucionMensual({
  historico,
  esPremium,
  detalle,
}: {
  historico: MetricaMensual[];
  esPremium: boolean;
  detalle: Record<string, DetalleMes>;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const filas = [...historico].reverse();
  const cols = esPremium ? 6 : 5;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Mes</th>
            <th className="px-4 py-3 font-medium">Reseñas nuevas</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Visitas</th>
            {esPremium && <th className="px-4 py-3 font-medium">Citas IA</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((h) => {
            const open = abierto === h.mes;
            const d = detalle[h.mes];
            return (
              <FilaMes
                key={h.mes}
                h={h}
                esPremium={esPremium}
                open={open}
                detalle={d}
                cols={cols}
                onToggle={() => setAbierto(open ? null : h.mes)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilaMes({
  h,
  esPremium,
  open,
  detalle,
  cols,
  onToggle,
}: {
  h: MetricaMensual;
  esPremium: boolean;
  open: boolean;
  detalle?: DetalleMes;
  cols: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
        onClick={onToggle}
        aria-expanded={open}
      >
        <td className="px-4 py-2.5 font-medium text-slate-800">
          <span className="mr-1.5 inline-block text-slate-400">{open ? "▾" : "▸"}</span>
          {fmtMes(h.mes)}
        </td>
        <td className="px-4 py-2.5 tabular-nums">{fmtNum(h.resenasNuevas)}</td>
        <td className="px-4 py-2.5 tabular-nums">{fmtNum(h.resenasTotal)}</td>
        <td className="px-4 py-2.5 tabular-nums">{h.ratingPromedio.toFixed(1)}</td>
        <td className="px-4 py-2.5 tabular-nums">{fmtNum(h.visitasPerfil)}</td>
        {esPremium && <td className="px-4 py-2.5 tabular-nums">{fmtNum(citasIA(h))}</td>}
      </tr>
      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={cols} className="px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Temas más repetidos este mes
                </p>
                {detalle && detalle.terminos.length > 0 ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detalle.terminos.map((t) => (
                        <span
                          key={t.termino}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                        >
                          {t.termino}
                          <span className="tabular-nums text-slate-400">{t.conteo}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Sobre {detalle.nResenasTexto} reseña
                      {detalle.nResenasTexto === 1 ? "" : "s"} y feedback con texto de ese mes.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No hay suficiente texto de reseñas ni feedback este mes para
                    detectar temas.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Horarios y empleados mencionados: no disponibles todavía con los
                datos que se registran hoy.
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
