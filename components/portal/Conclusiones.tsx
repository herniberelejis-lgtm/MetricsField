import type { Barra, Conclusion, Conclusiones as DatosConclusiones } from "@/lib/conclusiones";

// "Tus conclusiones": lo que sale de cruzar el cartel, las reseñas, las
// métricas de Google y la competencia (lib/conclusiones.ts). Arriba, las tres
// frases más importantes; abajo, tres preguntas: qué funciona, qué cuesta y
// qué hacer esta semana. Cada tarjeta se arma solo si hay datos suficientes —
// con poca historia la sección directamente no aparece, en vez de mostrar
// conclusiones inventadas.

const TARJETA =
  "rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl";

const COLOR_BARRA: Record<Barra["tono"], string> = {
  bien: "bg-emerald-700",
  mal: "bg-amber-600",
  neutro: "bg-slate-300",
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
      <h4 className="text-xl font-bold leading-snug tracking-tight text-slate-900">{c.titulo}</h4>

      {c.barras.length > 0 && (
        <ul className="flex flex-col gap-3">
          {c.barras.map((b) => (
            <li key={b.etiqueta} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-800">{b.etiqueta}</span>
                  {b.detalle && <span className="block text-xs text-slate-500">{b.detalle}</span>}
                </span>
                <span className={`shrink-0 font-bold tabular-nums ${COLOR_VALOR[b.tono]}`}>{b.valor}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
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
            tono === "cuesta" ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"
          }`}
        >
          <span className="font-bold">Probá: </span>
          {c.accion}
        </p>
      )}

      <details className="text-xs leading-relaxed text-slate-500">
        <summary className="cursor-pointer font-semibold text-slate-700">Cómo lo calculamos</summary>
        <p className="mt-1">{c.comoLoCalculamos}</p>
      </details>
    </article>
  );
}

function Pregunta({ numero, titulo, color }: { numero: number; titulo: string; color: string }) {
  return (
    <div className="mb-4 mt-10 flex flex-col gap-1 first:mt-0">
      <span className={`text-xs font-bold uppercase tracking-[0.08em] ${color}`}>Pregunta {numero}</span>
      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{titulo}</h3>
    </div>
  );
}

/** Las tres frases de la portada: lo que más funciona y lo que más cuesta,
 * intercaladas. */
function tresFrases(funciona: Conclusion[], cuesta: Conclusion[]): { texto: string; bien: boolean }[] {
  const salida: { texto: string; bien: boolean }[] = [];
  const max = Math.max(funciona.length, cuesta.length);
  for (let i = 0; i < max && salida.length < 3; i++) {
    if (funciona[i]) salida.push({ texto: funciona[i].titulo, bien: true });
    if (cuesta[i] && salida.length < 3) salida.push({ texto: cuesta[i].titulo, bien: false });
  }
  return salida;
}

export default function Conclusiones({ datos }: { datos: DatosConclusiones }) {
  const { funciona, cuesta, meta, tareas } = datos;
  if (funciona.length === 0 && cuesta.length === 0 && !meta) return null;
  const frases = tresFrases(funciona, cuesta);
  let pregunta = 0;

  return (
    <section className="mb-10">
      {frases.length > 0 && (
        <div className="mb-10 rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Tus conclusiones · en {frases.length === 1 ? "una frase" : `${frases.length} frases`}
          </p>
          <ol className="mt-6 flex flex-col gap-5">
            {frases.map((f, i) => (
              <li key={f.texto} className="flex items-baseline gap-4">
                <span className={`w-5 shrink-0 text-sm font-bold ${f.bien ? "text-emerald-300" : "text-amber-300"}`}>
                  {i + 1}
                </span>
                <span className="text-xl font-bold leading-snug sm:text-2xl">{f.texto}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {funciona.length > 0 && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué está funcionando?" color="text-emerald-700" />
          <div className="grid items-start gap-5 md:grid-cols-2">
            {funciona.map((c) => (
              <Tarjeta key={c.id} c={c} tono="funciona" />
            ))}
          </div>
        </>
      )}

      {cuesta.length > 0 && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué te está costando?" color="text-amber-700" />
          <div className="grid items-start gap-5 md:grid-cols-2">
            {cuesta.map((c) => (
              <Tarjeta key={c.id} c={c} tono="cuesta" />
            ))}
          </div>
        </>
      )}

      {(meta || tareas.length > 0) && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué hacés esta semana?" color="text-slate-700" />
          <div className="grid items-start gap-5 md:grid-cols-2">
            {meta && (
              <article className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white">
                <span className="self-start rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  Tu próxima meta
                </span>
                <h4 className="text-xl font-bold leading-snug tracking-tight">
                  Te faltan {meta.faltan} reseña{meta.faltan === 1 ? "" : "s"} de 5★ para que Google muestre{" "}
                  {meta.siguiente}.
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-bold">
                      {meta.semanas === null ? "—" : `~${meta.semanas} semana${meta.semanas === 1 ? "" : "s"}`}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300">a tu ritmo de 5★ actual</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-bold">{meta.compensaUnaMala} de 5★</div>
                    <div className="mt-0.5 text-xs text-slate-300">compensan cada reseña de 1★</div>
                  </div>
                </div>
                <details className="text-xs leading-relaxed text-slate-300">
                  <summary className="cursor-pointer font-semibold text-white">Cómo lo calculamos</summary>
                  <p className="mt-1">{meta.comoLoCalculamos}</p>
                </details>
              </article>
            )}
            {tareas.length > 0 && (
              <article className={`${TARJETA} flex flex-col gap-3`}>
                <h4 className="text-xl font-bold tracking-tight text-slate-900">
                  {tareas.length === 1 ? "Una cosa" : `${tareas.length === 2 ? "Dos" : "Tres"} cosas`}, de las conclusiones de arriba
                </h4>
                <ol className="flex flex-col">
                  {tareas.map((t, i) => (
                    <li key={t} className="flex items-start gap-3 border-t border-slate-200/70 py-3 first:border-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-1 text-[15px] font-medium leading-snug text-slate-800">{t}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )}
          </div>
        </>
      )}

      <footer className="mt-8 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200/70 pt-4 text-xs text-slate-500">
        <span>Ninguna conclusión con menos de 5 casos.</span>
        <span>Lo atribuido al cartel es aproximado.</span>
        <span>Decimos &quot;desde que&quot;, nunca &quot;gracias a&quot;.</span>
        <span>Cada número tiene su &quot;cómo lo calculamos&quot;.</span>
      </footer>
    </section>
  );
}
