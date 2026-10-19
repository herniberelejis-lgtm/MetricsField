import type { Barra, Conclusion, Conclusiones as DatosConclusiones, Pendiente } from "@/lib/conclusiones";

// "Tus conclusiones": lo que sale de cruzar el cartel, las reseñas, las
// métricas de Google y la competencia (lib/conclusiones.ts). Arriba, las tres
// frases más importantes; abajo, tres preguntas: qué funciona, qué cuesta y
// qué hacer esta semana. Cada tarjeta se arma solo si hay datos suficientes —
// con poca historia la sección directamente no aparece, en vez de mostrar
// conclusiones inventadas.

// Paleta del boceto: un verde y un naranja de igual peso, distintos también
// en luminosidad (se distinguen sin depender del color).
const TARJETA = "rounded-[24px] bg-white p-6 shadow-[0_1px_2px_rgba(17,17,17,0.04)] sm:p-7";

const COLOR_BARRA: Record<Barra["tono"], string> = {
  bien: "bg-[#0E7A53]",
  mal: "bg-[#B4540A]",
  neutro: "bg-[#BDBDB7]",
};

const COLOR_VALOR: Record<Barra["tono"], string> = {
  bien: "text-[#0B5E40]",
  mal: "text-[#8A3F00]",
  neutro: "text-slate-800",
};

const COLOR_PASTILLA: Record<Barra["tono"], string> = {
  bien: "bg-[#E8F5EF] text-[#0B5E40]",
  mal: "bg-[#FFF4E5] text-[#8A3F00]",
  neutro: "bg-[#F1F1EE] text-slate-700",
};

/** Etiqueta corta para el pie de una columna ("Septiembre" → "Sep"). */
function corta(etiqueta: string): string {
  if (etiqueta.length <= 9) return etiqueta;
  const t = etiqueta.slice(0, 3);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Barras({ barras }: { barras: Barra[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {barras.map((b) => (
        <li key={b.etiqueta} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="font-semibold text-slate-800">{b.etiqueta}</span>
              {b.detalle && <span className="block text-xs text-slate-500">{b.detalle}</span>}
            </span>
            <span className={`shrink-0 font-bold tabular-nums ${COLOR_VALOR[b.tono]}`}>{b.valor}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F1EE]">
            <div
              className={`h-full rounded-full ${COLOR_BARRA[b.tono]}`}
              style={{ width: `${Math.max(3, Math.round(b.proporcion * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Columnas({ barras }: { barras: Barra[] }) {
  return (
    <div className="flex h-48 items-end gap-2 sm:gap-3" role="list">
      {barras.map((b) => (
        <div key={b.etiqueta} role="listitem" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className={`text-sm font-bold tabular-nums ${COLOR_VALOR[b.tono]}`}>{b.valor}</span>
          <div
            className={`w-full max-w-12 rounded-t-lg rounded-b-sm ${COLOR_BARRA[b.tono]}`}
            style={{ height: `${Math.max(4, Math.round(b.proporcion * 120))}px` }}
            title={b.detalle ? `${b.etiqueta}: ${b.valor} ${b.detalle}` : `${b.etiqueta}: ${b.valor}`}
          />
          <span className="w-full truncate text-center text-[11px] text-slate-500">{corta(b.etiqueta)}</span>
          <span className="h-3 text-[10px] font-bold text-[#0E7A53]">{b.marca ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

function Dobles({ barras, leyenda }: { barras: Barra[]; leyenda?: [string, string] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-44 items-end gap-2" role="list">
        {barras.map((b) => (
          <div
            key={b.etiqueta}
            role="listitem"
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            title={`${b.etiqueta}: ${b.detalle ?? ""}`}
          >
            <div className="flex h-32 items-end gap-[3px]">
              <div className="w-3 rounded-t-[4px] bg-[#BDBDB7] sm:w-3.5" style={{ height: `${Math.max(3, Math.round(b.proporcion * 128))}px` }} />
              <div
                className="w-3 rounded-t-[4px] bg-[#0E7A53] sm:w-3.5"
                style={{ height: `${Math.max(3, Math.round((b.proporcion2 ?? 0) * 128))}px` }}
              />
            </div>
            <span className={`text-xs ${b.tono === "mal" ? "font-extrabold text-[#8A3F00]" : "text-slate-600"}`}>
              {b.etiqueta.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
      {leyenda && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-[#BDBDB7]" aria-hidden />
            {leyenda[0]}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-[#0E7A53]" aria-hidden />
            {leyenda[1]}
          </span>
        </div>
      )}
    </div>
  );
}

function Pastillas({ barras }: { barras: Barra[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {barras.map((b) => (
        <li key={b.etiqueta} className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{b.etiqueta}</span>
            {b.detalle && <span className="block text-xs text-slate-500">{b.detalle}</span>}
          </span>
          <span className={`shrink-0 rounded-[10px] px-2.5 py-1.5 text-[13px] font-bold ${COLOR_PASTILLA[b.tono]}`}>
            {b.valor}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Personas({ barras }: { barras: Barra[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {barras.map((b) => (
        <li key={b.etiqueta} className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
          >
            {b.etiqueta.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-900">{b.etiqueta}</span>
            {b.detalle && <span className="block text-xs text-slate-500">{b.detalle}</span>}
          </span>
          <span className={`shrink-0 text-[15px] font-bold ${COLOR_VALOR[b.tono]}`}>{b.valor}</span>
        </li>
      ))}
    </ul>
  );
}

function Tarjetitas({ barras }: { barras: Barra[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {barras.map((b) => (
        <li key={b.etiqueta} className="flex flex-col gap-1 rounded-2xl border border-[#E4E4E0] px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-bold text-slate-900">{b.etiqueta}</span>
            <span className="text-xs text-slate-500">
              {b.valor} · {b.detalle}
            </span>
          </div>
          {b.lectura && <span className={`text-sm ${COLOR_VALOR[b.tono]}`}>{b.lectura}</span>}
        </li>
      ))}
    </ul>
  );
}

function Grafico({ c }: { c: Conclusion }) {
  if (c.barras.length === 0) return null;
  switch (c.grafico) {
    case "columnas":
      return <Columnas barras={c.barras} />;
    case "dobles":
      return <Dobles barras={c.barras} leyenda={c.leyenda} />;
    case "pastillas":
      return <Pastillas barras={c.barras} />;
    case "personas":
      return <Personas barras={c.barras} />;
    case "tarjetas":
      return <Tarjetitas barras={c.barras} />;
    default:
      return <Barras barras={c.barras} />;
  }
}

function Tarjeta({ c, tono }: { c: Conclusion; tono: "funciona" | "cuesta" }) {
  return (
    <article className={`${TARJETA} flex flex-col gap-5`}>
      <span className="self-start rounded-full bg-[#EDEDEA] px-2.5 py-1 text-[11px] font-bold text-[#444444]">
        {c.cruce}
      </span>
      <h4 className="text-[21px] font-bold leading-snug tracking-tight text-slate-900">{c.titulo}</h4>
      <Grafico c={c} />
      {c.nota && <p className="text-sm leading-relaxed text-slate-600">{c.nota}</p>}
      {c.accion && (
        <p
          className={`rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
            tono === "cuesta" ? "bg-[#FFF4E5] text-[#5C2A00]" : "bg-[#E8F5EF] text-[#0B3D2A]"
          }`}
        >
          <span className="font-bold">Probá: </span>
          {c.accion}
        </p>
      )}
      <details className="text-[13px] leading-relaxed text-slate-500">
        <summary className="cursor-pointer font-semibold text-slate-800">Cómo lo calculamos</summary>
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
  const { funciona, cuesta, meta, tareas, pendientes, faltaGoogle } = datos;
  const frases = tresFrases(funciona, cuesta);
  const enCamino = pendientes.filter((p) => p.tipo === "en_camino");
  const sinNovedad = pendientes.filter((p) => p.tipo === "sin_novedad");
  let pregunta = 0;

  return (
    <section className="mb-10">
      {frases.length === 0 && (
        <div className="mb-10 rounded-[24px] bg-[#111111] px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Tus conclusiones · en camino</p>
          <p className="mt-5 text-xl font-bold leading-snug sm:text-2xl">
            Estamos juntando los datos de tu cartel y de tu Google. Cada conclusión aparece sola apenas tiene datos
            suficientes para ser cierta.
          </p>
          <p className="mt-3 text-sm text-slate-300">Abajo ves cuánto le falta a cada una.</p>
          {faltaGoogle && <AvisoGoogle />}
        </div>
      )}

      {frases.length > 0 && (
        <div className="mb-10 rounded-[24px] bg-[#111111] px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Tus conclusiones · en {frases.length === 1 ? "una frase" : `${frases.length} frases`}
          </p>
          <ol className="mt-6 flex flex-col gap-5">
            {frases.map((f, i) => (
              <li key={f.texto} className="flex items-baseline gap-4">
                <span className={`w-5 shrink-0 text-sm font-bold ${f.bien ? "text-[#6EE7B7]" : "text-[#FDBA74]"}`}>
                  {i + 1}
                </span>
                <span className="text-[22px] font-bold leading-tight sm:text-[30px]">{f.texto}</span>
              </li>
            ))}
          </ol>
          {faltaGoogle && <AvisoGoogle />}
        </div>
      )}

      {funciona.length > 0 && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué está funcionando?" color="text-emerald-700" />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {funciona.map((c) => (
              <Tarjeta key={c.id} c={c} tono="funciona" />
            ))}
          </div>
        </>
      )}

      {cuesta.length > 0 && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué te está costando?" color="text-amber-700" />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {cuesta.map((c) => (
              <Tarjeta key={c.id} c={c} tono="cuesta" />
            ))}
          </div>
        </>
      )}

      {(meta || tareas.length > 0) && (
        <>
          <Pregunta numero={++pregunta} titulo="¿Qué hacés esta semana?" color="text-slate-700" />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {meta && (
              <article className="flex flex-col gap-4 rounded-[24px] bg-[#111111] p-6 text-white sm:p-7">
                <span className="self-start rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                  Tu próxima meta
                </span>
                <h4 className="text-[22px] font-bold leading-snug tracking-tight">
                  Te faltan {meta.faltan} reseña{meta.faltan === 1 ? "" : "s"} de 5★ para que Google muestre{" "}
                  {meta.siguiente}.
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{meta.actual} hoy</span>
                    <span>{meta.siguiente}</span>
                  </div>
                  <div
                    className="h-3.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label={`Camino de ${meta.actual} a ${meta.siguiente}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(meta.progreso * 100)}
                  >
                    <div
                      className="h-full rounded-full bg-[#6EE7B7]"
                      style={{ width: `${Math.max(4, Math.round(meta.progreso * 100))}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xl font-bold sm:text-2xl">
                      {meta.semanas === null ? "—" : `~${meta.semanas} semana${meta.semanas === 1 ? "" : "s"}`}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300">a tu ritmo de 5★ actual</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xl font-bold sm:text-2xl">{meta.compensaUnaMala} de 5★</div>
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

      {(enCamino.length > 0 || sinNovedad.length > 0) && (
        <div className="mt-10">
          {enCamino.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">En camino</span>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Se activan solas cuando haya datos</h3>
              </div>
              <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {enCamino.map((p) => (
                  <EnCaminoTarjeta key={p.id} p={p} />
                ))}
              </div>
            </>
          )}
          {sinNovedad.length > 0 && (
            <ul className={`${TARJETA} ${enCamino.length > 0 ? "mt-5" : ""} flex flex-col gap-2`}>
              <li className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Sin novedades</li>
              {sinNovedad.map((p) => (
                <li key={p.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <span aria-hidden className="mt-0.5 text-emerald-700">✓</span>
                  <span>
                    <span className="font-semibold text-slate-900">{p.titulo}:</span> {p.detalle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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

function EnCaminoTarjeta({ p }: { p: Pendiente }) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4">
      <h4 className="text-[15px] font-bold leading-snug text-slate-900">{p.titulo}</h4>
      <p className="text-xs leading-relaxed text-slate-600">{p.detalle}</p>
      {p.progreso !== null && (
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label={`Avance: ${p.titulo}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.progreso * 100)}
        >
          <div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.max(4, Math.round(p.progreso * 100))}%` }} />
        </div>
      )}
    </article>
  );
}

function AvisoGoogle() {
  return (
    <p className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-relaxed text-white">
      <span className="font-bold">Conectá tu Google</span> con el botón &quot;Conectar con Google&quot; de arriba a la
      derecha: con tus reseñas y tus métricas de Google se activan la mayoría de estas conclusiones.
    </p>
  );
}
