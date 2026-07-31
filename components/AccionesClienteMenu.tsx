"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { accionEliminarCliente } from "@/app/actions";

// Menú "Más acciones" de la ficha del cliente: antes eran 5-6 botones
// sueltos compitiendo por atención arriba de la página. Cargar métricas es
// la única que queda a la vista (es la que se usa todos los meses) — el
// resto vive acá adentro. "Eliminar cliente" pide escribir el nombre exacto
// (mismo patrón que ClienteCardMenu, en el listado) — accionEliminarCliente
// ya lo exige del lado del servidor, esto es solo la fricción intencional
// de UI antes de llegar ahí.
export default function AccionesClienteMenu({ id, nombre }: { id: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function cerrarSiAfuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmando(false);
      }
    }
    document.addEventListener("mousedown", cerrarSiAfuera);
    return () => document.removeEventListener("mousedown", cerrarSiAfuera);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
      >
        Más acciones
        <span aria-hidden className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-10 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {!confirmando ? (
            <>
              <Link href={`/admin/clientes/${id}/editar`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Editar suscripción
              </Link>
              <Link href={`/admin/clientes/${id}/links`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Gestionar hardware
              </Link>
              <Link href={`/admin/clientes/${id}/competencia`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Competencia
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Eliminar cliente
              </button>
            </>
          ) : (
            <form action={accionEliminarCliente} className="space-y-2 p-1">
              <input type="hidden" name="id" value={id} />
              <p className="px-0.5 text-[11px] text-slate-500">
                Escribí <b>{nombre}</b> para confirmar. Borra todo (reseñas,
                métricas, links, sucursales, portal) y no se puede deshacer.
              </p>
              <input
                name="confirmarNombre"
                placeholder={nombre}
                autoFocus
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                >
                  Borrar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
