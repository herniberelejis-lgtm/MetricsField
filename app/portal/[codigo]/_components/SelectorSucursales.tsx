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
            className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium transition ${
              modoTodos
                ? "bg-[#EEF4FB] font-semibold text-[#1F4E80] ring-1 ring-[#A9C5E6]"
                : "bg-white text-slate-700 ring-1 ring-[#E4E6EA] hover:bg-[#F7F9FC]"
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
            className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium transition ${
              activa
                ? "bg-[#EEF4FB] font-semibold text-[#1F4E80] ring-1 ring-[#A9C5E6]"
                : "bg-white text-slate-700 ring-1 ring-[#E4E6EA] hover:bg-[#F7F9FC]"
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
