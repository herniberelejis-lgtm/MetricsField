import type { TerminoFrecuente } from "@/lib/keywords";

// Misma fuente que "Lo que más se repite en las quejas" (lib/keywords.ts,
// frecuencia de palabras sobre el texto real de las reseñas) — acá se
// muestra en el Resumen, enmarcado como sugerencias de mejora en vez de
// quejas, para que el dueño lo vea sin tener que entrar a Reseñas.
export default function SugerenciasRepetidas({
  temas,
  apiHabilitada,
}: {
  temas: TerminoFrecuente[];
  apiHabilitada: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/65 p-5 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-slate-800">Sugerencias repetidas</p>
      <p className="mt-1 text-xs text-slate-500">
        {apiHabilitada
          ? "Se arma sola con cada reseña nueva de Google — palabras que más se repiten en las que tienen 3★ o menos."
          : "Hoy se arma con las reseñas que cargamos a mano. Cuando esté aprobada la conexión con la API de Google, se va a actualizar sola con cada reseña nueva."}
      </p>

      {temas.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">
          Todavía no hay suficientes reseñas con texto para detectar un patrón repetido.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {temas.map((t) => (
            <span
              key={t.termino}
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
            >
              {t.termino}
              <span className="tabular-nums text-slate-400">{t.conteo}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
