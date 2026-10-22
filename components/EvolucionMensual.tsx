"use client";

import { useState } from "react";
import type { MetricaMensual } from "@/lib/types";
import { citasIA } from "@/lib/types";
import { fmtMes, fmtNum, fmtDec } from "@/lib/format";
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
  mostrarVisitas,
  detalle,
}: {
  historico: MetricaMensual[];
  esPremium: boolean;
  /** Visitas salen de Business Profile: false hasta que Google lo apruebe. */
  mostrarVisitas: boolean;
  detalle: Record<string, DetalleMes>;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const filas = [...historico].reverse();
  const cols = 4 + (mostrarVisitas ? 1 : 0) + (esPremium ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E4E6EA] bg-white">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
            <th className="px-4 py-3 font-medium">Mes</th>
            <th className="px-4 py-3 text-right font-medium">Reseñas nuevas</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Calificación</th>
            {mostrarVisitas && <th className="px-4 py-3 text-right font-medium">Visitas</th>}
            {esPremium && <th className="px-4 py-3 text-right font-medium">Citas IA</th>}
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
                mostrarVisitas={mostrarVisitas}
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
  mostrarVisitas,
  open,
  detalle,
  cols,
  onToggle,
}: {
  h: MetricaMensual;
  esPremium: boolean;
  mostrarVisitas: boolean;
  open: boolean;
  detalle?: DetalleMes;
  cols: number;
  onToggle: () => void;
}) {
  // Solo se despliega un mes que tenga temas para mostrar: sin texto de
  // reseñas (API de reseñas no aprobada, nada cargado a mano) el panel
  // abierto quedaría vacío.
  const expandible = Boolean(detalle && detalle.terminos.length > 0);
  return (
    <>
      <tr
        className={`border-b border-[#EEF0F3] ${expandible ? "cursor-pointer hover:bg-[#F7F9FC]" : ""}`}
        onClick={expandible ? onToggle : undefined}
        aria-expanded={expandible ? open : undefined}
      >
        <td className="px-4 py-2.5 font-medium text-slate-800">
          {expandible && <span className="mr-1.5 inline-block text-slate-600">{open ? "▾" : "▸"}</span>}
          {fmtMes(h.mes)}
        </td>
        <td className="px-4 py-2.5 text-right text-slate-800">{h.nuevasSinDato ? "—" : fmtNum(h.resenasNuevas)}</td>
        <td className="px-4 py-2.5 text-right text-slate-800">{fmtNum(h.resenasTotal)}</td>
        <td className="px-4 py-2.5 text-right text-slate-800">{fmtDec(h.ratingPromedio, 1)} ★</td>
        {mostrarVisitas && <td className="px-4 py-2.5 text-right text-slate-800">{fmtNum(h.visitasPerfil)}</td>}
        {esPremium && <td className="px-4 py-2.5 text-right text-slate-800">{fmtNum(citasIA(h))}</td>}
      </tr>
      {open && expandible && (
        <tr className="border-b border-[#EEF0F3] bg-[#F7F9FC]">
          <td colSpan={cols} className="px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-600">
                  Temas más repetidos este mes
                </p>
                {detalle && detalle.terminos.length > 0 && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detalle.terminos.map((t) => (
                        <span
                          key={t.termino}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-[#E4E6EA]"
                        >
                          {t.termino}
                          <span className="tabular-nums text-slate-600">{t.conteo}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Sobre {detalle.nResenasTexto} reseña
                      {detalle.nResenasTexto === 1 ? "" : "s"} y feedback con texto de ese mes.
                    </p>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
