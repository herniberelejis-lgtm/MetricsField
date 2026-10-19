import type { Barra, Conclusion, Conclusiones as DatosConclusiones } from "@/lib/conclusiones";
import { SectionHeading } from "@/components/ui";

// "Tus conclusiones": lo que sale de cruzar el cartel, las reseñas y la
// competencia (lib/conclusiones.ts), en tres preguntas. Cada tarjeta se
// arma solo si hay datos suficientes — con poca historia esta sección
// directamente no aparece, en vez de mostrar conclusiones inventadas.

const TARJETA =
  "rounded-3xl border border-white/60 bg-white/65 p-6 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl";

const COLOR_BARRA: Record<Barra["tono"], string> = {
  bien: "bg-emerald-700",
  mal: "bg-amber-600",
  neutro: "bg-slate-400",
};

const COLOR_VALOR: Record<Barra["tono"], string> = {
  bien: "text-emerald-800",
  mal: "text-amber-800",
  neutro: "text-slate-800",
};

function Tarjeta({ c, tono }: { c: Conclusion; tono: "funciona" | "cuesta" }) {
  return (
    <article className={`${TARJETA} flex flex-col gap-4`}>
      <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
        {c.cruce}
      </span>
      <h4 className="text-lg font-semibold leading-snug text-slate-900">{c.titulo}</h4>

      {c.barras.length > 0 && (
        <ul className="flex flex-col gap-3">
          {c.barras.map((b) => (
            <li key={b.etiqueta} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">{b.etiqueta}</span>
                  {b.detalle && <span className="block text-xs text-slate-500">{b.detalle}</span>}
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${COLOR_VALOR[b.tono]}`}>{b.valor}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${COLOR_BARRA[b.tono]}`}
                  style={{ width: `${Math.max(3, Math.round(b.proporcion * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {c.nota && <p className="text-sm leading-relaxed text-slate-600">{c.nota}</p>}

      {c.accion && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            tono === "cuesta" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-800"
          }`}
        >
          <span className="font-semibold">Probá: </span>
          {c.accion}
        </p>
      )}

      <details className="text-xs leading-relaxed text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-700">Cómo lo calculamos</summary>
        <p className="mt-1">{c.comoLoCalculamos}</p>
      </details>
    </article>
  );
}

export default function Conclusiones({ datos }: { datos: DatosConclusiones }) {
  const { funciona, cuesta, meta, tareas } = datos;
  if (funciona.length === 0 && cuesta.length === 0 && !meta) return null;

  return (
    <section className="mb-2">
      <SectionHeading
        title="Tus conclusiones"
        subtitle="cruzamos tu cartel, tus reseñas y tu competencia: cosas que Google no te dice"
      />

      {funciona.length > 0 && (
        <>
          <h3 className="mb-3 mt-2 text-sm font-semibold text-slate-700">¿Qué está funcionando?</h3>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {funciona.map((c) => (
              <Tarjeta key={c.id} c={c} tono="funciona" />
            ))}
          </div>
        </>
      )}

      {cuesta.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-700">¿Qué te está costando?</h3>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {cuesta.map((c) => (
              <Tarjeta key={c.id} c={c} tono="cuesta" />
            ))}
          </div>
        </>
      )}

      {(meta || tareas.length > 0) && (
        <>
          <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-700">¿Qué hacés esta semana?</h3>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {meta && (
              <article className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white">
                <span className="self-start rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  Tu próxima meta
                </span>
                <h4 className="text-lg font-semibold leading-snug">
                  Te faltan {meta.faltan} reseña{meta.faltan === 1 ? "" : "s"} de 5★ para que Google muestre{" "}
                  {meta.siguiente}.
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="text-xl font-semibold">
                      {meta.semanas === null ? "—" : `~${meta.semanas} semana${meta.semanas === 1 ? "" : "s"}`}
                    </div>
                    <div className="text-xs text-slate-300">a tu ritmo de 5★ actual</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="text-xl font-semibold">{meta.compensaUnaMala} de 5★</div>
                    <div className="text-xs text-slate-300">compensan cada reseña de 1★</div>
                  </div>
                </div>
                <details className="text-xs leading-relaxed text-slate-300">
                  <summary className="cursor-pointer font-medium text-white">Cómo lo calculamos</summary>
                  <p className="mt-1">{meta.comoLoCalculamos}</p>
                </details>
              </article>
            )}
            {tareas.length > 0 && (
              <article className={`${TARJETA} flex flex-col gap-3`}>
                <h4 className="text-base font-semibold text-slate-900">Tres cosas, de lo de arriba</h4>
                <ol className="flex flex-col gap-3">
                  {tareas.map((t, i) => (
                    <li key={t} className="flex items-start gap-3 border-t border-slate-200/70 pt-3 first:border-0 first:pt-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-snug text-slate-800">{t}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )}
          </div>
        </>
      )}
    </section>
  );
}
