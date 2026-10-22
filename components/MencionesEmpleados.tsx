import type { MencionEmpleado } from "@/lib/empleados";
import { fmtDec } from "@/lib/format";

// Personal: un dato 100% real por empleado (taps de su tarjeta NFC) y una
// señal proxy (menciones de su nombre en el texto de las reseñas) — no es
// atribución exacta, Google no dice qué reseña vino de qué tap. Ordenado
// por menciones, sin lenguaje de "mejor/peor mozo": con pocas menciones
// cualquier orden es ruido, no una evaluación real.

const MUESTRA_CHICA = 5;

function iniciales(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || "?";
}

export default function MencionesEmpleados({ menciones }: { menciones: MencionEmpleado[] }) {
  if (menciones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
      <p className="text-xs leading-relaxed text-slate-600">
        Los <span className="font-semibold text-slate-800">taps</span> son un dato exacto: cuántas veces
        se usó cada tarjeta. Las <span className="font-semibold text-slate-800">menciones</span> son una
        señal, no una atribución exacta — reseñas que nombran a cada empleado en el texto, no el total
        de sus atenciones. No es un ranking de desempeño.
      </p>
      <div className="mt-3 space-y-3">
        {menciones.map((m) => (
          <div key={m.nombre} className="rounded-xl bg-[#F7F9FC] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EEF4FB] text-xs font-bold text-[#1F4E80]">
                  {iniciales(m.nombre)}
                </span>
                <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold tabular-nums text-slate-700">
                  {m.taps} toque{m.taps === 1 ? "" : "s"}
                </span>
                {m.menciones > 0 && (
                  <>
                    <span className="font-semibold text-slate-900">{fmtDec(m.ratingPromedio, 1)}★</span>
                    <span className="text-slate-600">
                      {m.menciones} mención{m.menciones === 1 ? "" : "es"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {m.menciones === 0 ? (
              <p className="mt-2 border-t border-[#E4E6EA]/70 pt-2 text-xs text-slate-600">
                Todavía ninguna reseña lo menciona por nombre.
              </p>
            ) : (
              <>
                {m.menciones < MUESTRA_CHICA && (
                  <p className="mt-2 text-[11px] font-medium text-slate-600">
                    Muestra chica ({m.menciones} mención{m.menciones === 1 ? "" : "es"}) — no saques
                    conclusiones firmes todavía.
                  </p>
                )}
                {m.quejasFrecuentes.length > 0 && (
                  <div className="mt-2 border-t border-[#E4E6EA]/70 pt-2">
                    <p className="text-[11px] font-medium text-slate-600">
                      Quejas que se repiten
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.quejasFrecuentes.map((t) => (
                        <span
                          key={t.termino}
                          className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-xs text-[#8A3F00]"
                        >
                          {t.termino}
                          <span className="tabular-nums opacity-80">{t.conteo}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {m.ejemplos.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-[#E4E6EA]/70 pt-2">
                    {m.ejemplos.map((e, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">{e.autor}</span>{" "}
                        <span className="text-slate-900">{"★".repeat(e.estrellas)}</span> — &ldquo;{e.texto}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
