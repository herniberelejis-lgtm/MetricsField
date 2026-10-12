"use client";

import { fmtNum } from "@/lib/format";
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
    "rounded-3xl border border-white/60 bg-white/65 p-6 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl";

  return (
    <div className={`${card} mb-4`}>
      <h3 className="text-sm font-semibold text-slate-900">Desde que seguimos a tu competencia</h3>
      <p className="mt-0.5 text-xs text-slate-500">
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
            <div className="mb-4 mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
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
                  <span className="text-white/70">
                    {" "}
                    Tu competencia promedió {promedioCompetencia.toFixed(promedioCompetencia < 10 ? 1 : 0)}.
                  </span>
                )}
              </p>
              {vos.rating !== null && ratingCompetencia !== null && (
                <p className="mt-1 text-white/80">
                  Tu calificación: {vos.rating.toFixed(1)}★ · competencia promedio {ratingCompetencia.toFixed(1)}★
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
