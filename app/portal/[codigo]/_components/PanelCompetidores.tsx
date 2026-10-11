import type { Cliente, Competidor } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import type { ComparativaMes } from "@/lib/comparativa-competencia";
import ComparativaCompetencia from "@/components/portal/ComparativaCompetencia";
import SelectorSucursales from "./SelectorSucursales";

// Panel "Competidores": foto EN VIVO de cómo está parado el local frente a
// la competencia de su zona — "Tu local" siempre va primero, arriba de la
// lista, con el dato de ahora mismo (no el de la última foto congelada del
// mes). Los competidores se sincronizan contra Google Places cuando el
// cliente entra a ver esta pestaña (ver sincronizarCompetidoresDeComercio en
// page.tsx), no solo una vez por día vía cron. La comparación es siempre de
// UN local puntual (la competencia de un barrio no es la de otro) — en modo
// "Todos" se pide elegir uno. Debajo va la comparativa mes a mes
// (ComparativaCompetencia): reseñas captadas en cada mes y calificación al
// cierre, desde las fotos mensuales que congela el cron.
export default function PanelCompetidores({
  competidores,
  nombreLocal,
  ratingLocal,
  resenasLocal,
  comparativas,
  primerMesComparable,
  modoTodos,
  ubicaciones,
  activoId,
  codigoAcceso,
}: {
  competidores: Competidor[];
  nombreLocal: string;
  ratingLocal: number | null;
  resenasLocal: number;
  comparativas: ComparativaMes[];
  primerMesComparable: string | null;
  modoTodos: boolean;
  ubicaciones: Cliente[];
  activoId: string;
  codigoAcceso: string;
}) {
  const hayVarios = ubicaciones.length > 1;
  // Un competidor sin calificación ni reseñas (Place ID sin cargar o mal
  // copiado) es una fila de guiones: se arregla en el admin, no se muestra.
  const filasCompetencia = competidores
    .filter((c) => c.rating !== null || c.totalResenas !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  // "Este mes": reseñas captadas en el mes en curso, si ya hay foto del mes
  // anterior para restar (ver comparativaMensual).
  const mesEnCurso = comparativas.find((m) => m.enCurso) ?? null;
  const esteMes = new Map(mesEnCurso?.filas.map((f) => [f.id, f.nuevas]) ?? []);
  const fmtEsteMes = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `+${fmtNum(n)}`);

  return (
    <>
      {hayVarios && (
        <div className="mb-4">
          <div className="mb-2">
            <SelectorSucursales
              ubicaciones={ubicaciones}
              activoId={activoId}
              modoTodos={modoTodos}
              codigoAcceso={codigoAcceso}
            />
          </div>
          {modoTodos && (
            <p className="text-sm text-slate-500">
              La competencia es por local — elegí una sucursal arriba para verla (la de un barrio no es la de otro).
            </p>
          )}
        </div>
      )}

      {!modoTodos && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Cómo estás parado frente a los locales de tu zona, ahora mismo — se sincroniza solo cuando entrás a ver.
          </p>

          {competidores.length > 0 ? (
            <div className="mb-4 overflow-hidden rounded-3xl border border-white/60 bg-white/65 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">Ficha</th>
                      <th className="px-4 py-3 font-medium">Calificación</th>
                      <th className="px-4 py-3 font-medium">Reseñas</th>
                      {mesEnCurso && <th className="px-4 py-3 font-medium">Este mes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 bg-brand/5">
                      <td className="px-4 py-3 font-semibold text-brand-fg">{nombreLocal} (vos)</td>
                      <td className="px-4 py-3 tabular-nums font-medium text-slate-800">
                        {ratingLocal === null ? "—" : ratingLocal.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-slate-800">{fmtNum(resenasLocal)}</td>
                      {mesEnCurso && (
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                          {fmtEsteMes(esteMes.get("propio"))}
                        </td>
                      )}
                    </tr>
                    {filasCompetencia.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 text-slate-600 last:border-0">
                        <td className="px-4 py-3">{c.nombre}</td>
                        <td className="px-4 py-3 tabular-nums">{c.rating === null ? "—" : c.rating.toFixed(1)}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {c.totalResenas === null ? "—" : fmtNum(c.totalResenas)}
                        </td>
                        {mesEnCurso && (
                          <td className="px-4 py-3 tabular-nums text-slate-600">{fmtEsteMes(esteMes.get(c.id))}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mb-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
              Todavía no cargamos competidores con Place ID para tu zona — pedile a tu contacto en MetricsField que
              los agregue desde el panel para ver esta comparación.
            </p>
          )}
        </>
      )}

      {!modoTodos && competidores.length > 0 && (
        <ComparativaCompetencia meses={comparativas} primerMes={primerMesComparable} />
      )}
    </>
  );
}
