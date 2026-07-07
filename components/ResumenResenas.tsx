import type { TerminoFrecuente } from "@/lib/keywords";

// Resumen calculado en el servidor (ver app/portal/[codigo]/page.tsx) a
// partir de TODAS las reseñas del comercio — no solo las pendientes. Da una
// foto rápida de "cómo van las reseñas" sin tener que leerlas una por una:
// distribución por estrellas, si la tendencia reciente mejora o empeora, y
// qué se repite en las quejas (mismo extractor de términos que ya se usa en
// el drill-down mensual — sin IA paga, frecuencia de palabras sobre texto
// real).
export interface ResumenResenasData {
  distribucion: { estrellas: 1 | 2 | 3 | 4 | 5; cantidad: number }[]; // 5★ primero
  total: number;
  promedio: number | null;
  tendencia: { dir: "up" | "down" | "flat"; texto: string } | null;
  temasRecurrentes: TerminoFrecuente[];
}

const COLOR_TENDENCIA: Record<"up" | "down" | "flat", string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-slate-400",
};
const FLECHA_TENDENCIA: Record<"up" | "down" | "flat", string> = {
  up: "▲",
  down: "▼",
  flat: "→",
};

export default function ResumenResenas({ data }: { data: ResumenResenasData }) {
  const { distribucion, total, promedio, tendencia, temasRecurrentes } = data;
  const max = Math.max(...distribucion.map((d) => d.cantidad), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Cómo van tus reseñas</p>
        {promedio !== null && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {promedio.toFixed(1)}★
            </span>
            {tendencia && (
              <span className={`text-xs font-medium ${COLOR_TENDENCIA[tendencia.dir]}`}>
                {FLECHA_TENDENCIA[tendencia.dir]} {tendencia.texto}
              </span>
            )}
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Todavía no tenés reseñas cargadas.</p>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {distribucion.map((d) => (
              <div key={d.estrellas} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-xs text-slate-500">{d.estrellas}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: d.cantidad ? `${Math.max(4, (d.cantidad / max) * 100)}%` : "0%" }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                  {d.cantidad}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Lo que más se repite en las quejas
            </p>
            {temasRecurrentes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {temasRecurrentes.map((t) => (
                  <span
                    key={t.termino}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                  >
                    {t.termino}
                    <span className="tabular-nums text-slate-400">{t.conteo}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">
                No hay ninguna queja que se repita — buena señal.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
