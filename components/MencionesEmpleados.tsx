import type { MencionEmpleado } from "@/lib/empleados";

// Menciones de empleados en el texto de las reseñas — no es atribución
// exacta (Google no dice qué reseña vino de qué tap), es una señal real:
// cuántas reseñas nombran a cada uno y cómo puntúan esas reseñas.

function iniciales(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || "?";
}

export default function MencionesEmpleados({ menciones }: { menciones: MencionEmpleado[] }) {
  if (menciones.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Cómo evalúan a tu equipo</p>
      <p className="mt-1 text-xs text-slate-500">
        Reseñas que nombran a cada empleado con tarjeta personal — no es el total de sus atenciones,
        solo las que el cliente decidió nombrarlo por escrito.
      </p>
      <div className="mt-3 space-y-3">
        {menciones.map((m) => (
          <div key={m.nombre} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                  {iniciales(m.nombre)}
                </span>
                <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-amber-500">{m.ratingPromedio.toFixed(1)}★</span>
                <span className="text-slate-500">
                  {m.menciones} mención{m.menciones === 1 ? "" : "es"}
                </span>
              </div>
            </div>
            {m.ejemplos.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                {m.ejemplos.map((e, i) => (
                  <p key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">{e.autor}</span>{" "}
                    <span className="text-amber-400">{"★".repeat(e.estrellas)}</span> — &ldquo;{e.texto}&rdquo;
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
