import type { Cliente } from "@/lib/types";
import ScrollActiveIntoView from "@/components/ScrollActiveIntoView";
import ScrollFadeRow from "@/components/ScrollFadeRow";
import { hrefSucursal, hrefTodos } from "../_lib";

// Tira de chips para elegir local — compartida entre Resumen (donde vive
// ahora, arriba de todo, para poder saltar de un local a otro sin salir
// del resumen) y Sucursales (que sigue mostrando el detalle de "un solo
// local" para quien llega ahí por el menú). Elegir un chip navega directo
// a #resumen — ver hrefSucursal/hrefTodos en _lib.tsx.
export default function SelectorSucursales({
  ubicaciones,
  activoId,
  modoTodos,
  codigoAcceso,
}: {
  ubicaciones: Cliente[];
  activoId: string;
  modoTodos: boolean;
  codigoAcceso: string;
}) {
  return (
    <ScrollFadeRow>
      {(() => {
        const chipTodos = (
          <a
            href={hrefTodos(codigoAcceso)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              modoTodos
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos
          </a>
        );
        return modoTodos ? (
          <ScrollActiveIntoView key="todos">{chipTodos}</ScrollActiveIntoView>
        ) : (
          <div key="todos" className="contents">
            {chipTodos}
          </div>
        );
      })()}
      {ubicaciones.map((s) => {
        const activa = !modoTodos && s.id === activoId;
        const chip = (
          <a
            href={hrefSucursal(codigoAcceso, s)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              activa
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.nombre}
          </a>
        );
        // En mobile la tira es más ancha que la pantalla — sin esto, si el
        // local elegido está lejos del principio, entrás y no lo ves
        // resaltado sin scrollear la tira vos mismo.
        return activa ? (
          <ScrollActiveIntoView key={s.id}>{chip}</ScrollActiveIntoView>
        ) : (
          <div key={s.id} className="contents">
            {chip}
          </div>
        );
      })}
    </ScrollFadeRow>
  );
}
