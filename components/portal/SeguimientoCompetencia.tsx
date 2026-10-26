"use client";

import { fmtNum, fmtDec } from "@/lib/format";
import type { Seguimiento } from "@/lib/seguimiento-competencia";
import { TablaComparativa } from "./ComparativaCompetencia";

// "Desde que los seguimos": mientras no haya un mes entero cerrado para la
// comparativa mensual, compara contra el día en que se empezó a seguir a la
// competencia (lib/seguimiento-competencia.ts).

function fmtDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export default function SeguimientoCompetencia({ seguimiento }: { seguimiento: Seguimiento }) {
  const { desde, dias, filas, puesto, promedioCompetencia, ratingCompetencia } = seguimiento;
  const vos = filas.find((f) => f.esPropio) ?? null;
  const card =
    "min-w-0 rounded-2xl border border-[#E4E6EA] bg-white p-5 sm:p-6";

  return (
    <div className={`${card} mb-4`}>
      <h2 className="text-[15px] font-bold text-slate-900">Desde que seguimos a tu competencia</h2>
      <p className="mt-0.5 text-xs text-slate-600">
        Reseñas captadas desde el {fmtDia(desde)}
        {dias > 0 ? ` (${dias} día${dias === 1 ? "" : "s"})` : ""}, mientras se completa el primer mes
      </p>

      {dias === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          Hoy guardamos el punto de partida de cada uno. Desde mañana vas a ver acá cuántas reseñas captó cada
          competidor contra vos y cómo se mueve su calificación.
        </p>
      ) : (
        <>
          {vos && vos.nuevas !== null && (
            <div className="mb-4 mt-4 rounded-2xl bg-[#F4F7FB] px-4 py-3 text-sm text-slate-700">
              <p>
                Desde el {fmtDia(desde)} captaste <strong>{fmtNum(vos.nuevas)}</strong> reseña
                {vos.nuevas === 1 ? "" : "s"}
                {puesto && (
                  <>
                    : <strong>puesto #{puesto.puesto}</strong> de {puesto.total}
                  </>
                )}
                .
                {promedioCompetencia !== null && (
                  <span className="text-slate-600">
                    {" "}
                    Tu competencia promedió {promedioCompetencia.toFixed(promedioCompetencia < 10 ? 1 : 0)}.
                  </span>
                )}
              </p>
              {vos.rating !== null && ratingCompetencia !== null && (
                <p className="mt-1 text-slate-700">
                  Tu calificación: {fmtDec(vos.rating, 1)}★ · competencia promedio {fmtDec(ratingCompetencia, 1)}★
                </p>
              )}
            </div>
          )}
          <TablaComparativa
            filas={filas}
            notaFila={(f) => {
              const fila = filas.find((x) => x.id === f.id);
              return fila && fila.desde !== desde ? `desde ${fmtDia(fila.desde)}` : null;
            }}
          />
        </>
      )}
    </div>
  );
}
