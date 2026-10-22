import { terminosFrecuentes, type TerminoFrecuente } from "@/lib/keywords";
import type { ResenaCRM } from "@/lib/types";
import { fmtDec } from "@/lib/format";

// Resumen calculado en el servidor a partir de TODAS las reseñas del
// comercio — no solo las pendientes. Da una foto rápida de "cómo van las
// reseñas" sin tener que leerlas una por una: distribución por estrellas, si
// la tendencia reciente mejora o empeora, y qué se repite en las quejas
// (mismo extractor de términos que ya se usa en el drill-down mensual — sin
// IA paga, frecuencia de palabras sobre texto real). Lo usan tanto el portal
// del cliente como la ficha del cliente en /admin.
export interface ResumenResenasData {
  distribucion: { estrellas: 1 | 2 | 3 | 4 | 5; cantidad: number }[]; // 5★ primero
  total: number;
  promedio: number | null;
  tendencia: { dir: "up" | "down" | "flat"; texto: string } | null;
  temasRecurrentes: TerminoFrecuente[];
}

/** `resenas` debe venir ordenado por fecha DESC (como devuelve getResenas)
 * — la tendencia compara la mitad más nueva contra la mitad más vieja. */
export function calcularResumenResenas(resenas: ResenaCRM[]): ResumenResenasData {
  const distribucion = ([5, 4, 3, 2, 1] as const).map((estrellas) => ({
    estrellas,
    cantidad: resenas.filter((r) => r.estrellas === estrellas).length,
  }));
  const total = resenas.length;
  const promedio = total > 0 ? resenas.reduce((acc, r) => acc + r.estrellas, 0) / total : null;

  let tendencia: ResumenResenasData["tendencia"] = null;
  if (total >= 4) {
    const mitad = Math.floor(total / 2);
    const recientes = resenas.slice(0, mitad);
    const anteriores = resenas.slice(mitad, mitad * 2);
    const promedioDe = (arr: typeof resenas) =>
      arr.reduce((acc, r) => acc + r.estrellas, 0) / arr.length;
    const diferencia = promedioDe(recientes) - promedioDe(anteriores);
    const dir = diferencia > 0.15 ? "up" : diferencia < -0.15 ? "down" : "flat";
    tendencia = {
      dir,
      texto:
        dir === "up"
          ? "mejorando en las últimas reseñas"
          : dir === "down"
            ? "bajando en las últimas reseñas"
            : "estable",
    };
  }

  const temasRecurrentes = terminosFrecuentes(
    resenas.filter((r) => r.estrellas <= 3).map((r) => r.texto),
    { max: 6, minimo: 2 },
  );

  return { distribucion, total, promedio, tendencia, temasRecurrentes };
}

const COLOR_TENDENCIA: Record<"up" | "down" | "flat", string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-slate-400",
};
// Portal (DESIGN.md): el color dice bien o mal.
const COLOR_TENDENCIA_MONO: Record<"up" | "down" | "flat", string> = {
  up: "font-semibold text-[#0B5E40]",
  down: "font-semibold text-[#8A3F00]",
  flat: "text-slate-600",
};
const FLECHA_TENDENCIA: Record<"up" | "down" | "flat", string> = {
  up: "▲",
  down: "▼",
  flat: "→",
};

export default function ResumenResenas({
  data,
  variant = "solid",
}: {
  data: ResumenResenasData;
  /** "glass" es la tarjeta del portal del cliente (DESIGN.md) —
   * "solid" (default) es el que sigue usando la ficha de /admin. */
  variant?: "solid" | "glass";
}) {
  const { distribucion, total, promedio, tendencia, temasRecurrentes } = data;
  const max = Math.max(...distribucion.map((d) => d.cantidad), 1);
  const colorTendencia = variant === "glass" ? COLOR_TENDENCIA_MONO : COLOR_TENDENCIA;
  const portal = variant === "glass";
  const wrapClass = portal
    ? "min-w-0 rounded-2xl border border-[#E4E6EA] bg-white p-5"
    : "rounded-xl border border-slate-200 bg-white p-4";
  const gris = portal ? "text-slate-600" : "text-slate-500";
  const grisClaro = portal ? "text-slate-600" : "text-slate-400";

  return (
    <div className={wrapClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={portal ? "text-[15px] font-bold text-slate-900" : "text-sm font-medium text-slate-700"}>
          Cómo van tus reseñas
        </p>
        {promedio !== null && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {fmtDec(promedio, 1)}★
            </span>
            {tendencia && (
              <span className={`text-xs font-medium ${colorTendencia[tendencia.dir]}`}>
                {FLECHA_TENDENCIA[tendencia.dir]} {tendencia.texto}
              </span>
            )}
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className={`mt-2 text-sm ${gris}`}>Todavía no tenés reseñas cargadas.</p>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {distribucion.map((d) => (
              <div key={d.estrellas} className="flex items-center gap-2">
                <span className={`w-8 shrink-0 text-xs ${gris}`}>{d.estrellas}★</span>
                <div className={`h-2 flex-1 overflow-hidden rounded-full ${portal ? "bg-[#EEF0F3]" : "bg-slate-100"}`}>
                  <div
                    className={`h-full rounded-full ${portal ? (d.estrellas >= 4 ? "bg-[#8FD1AE]" : d.estrellas <= 2 ? "bg-[#F4B886]" : "bg-[#D3D9E2]") : "bg-brand"}`}
                    style={{ width: d.cantidad ? `${Math.max(4, (d.cantidad / max) * 100)}%` : "0%" }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                  {d.cantidad}
                </span>
              </div>
            ))}
          </div>

          <div className={`mt-3 border-t pt-3 ${portal ? "border-[#EEF0F3]" : "border-slate-100"}`}>
            <p
              className={
                portal ? "text-xs font-medium text-slate-600" : "text-xs font-medium uppercase tracking-wide text-slate-400"
              }
            >
              Lo que más se repite en las quejas
            </p>
            {temasRecurrentes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {temasRecurrentes.map((t) => (
                  <span
                    key={t.termino}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                      portal ? "bg-[#FFF4E8] text-[#8A3F00]" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {t.termino}
                    <span className={`tabular-nums ${portal ? "opacity-80" : "text-slate-400"}`}>{t.conteo}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className={`mt-1.5 text-xs ${grisClaro}`}>
                No hay ninguna queja que se repita — buena señal.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
