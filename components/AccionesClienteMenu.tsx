"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Menú "Más acciones" de la ficha del cliente: antes eran 5-6 botones
// sueltos compitiendo por atención arriba de la página. Cargar métricas es
// la única que queda a la vista (es la que se usa todos los meses) — el
// resto vive acá adentro.
export default function AccionesClienteMenu({
  id,
  reporteHref,
}: {
  id: string;
  reporteHref: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function cerrarSiAfuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
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
        <div className="absolute right-0 top-9 z-10 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <Link href={`/admin/clientes/${id}/editar`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Editar suscripción
          </Link>
          <Link href={`/admin/clientes/${id}/links`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Gestionar hardware
          </Link>
          <Link href={`/admin/clientes/${id}/competencia`} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Competencia
          </Link>
          <Link href={reporteHref} className="block rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Generar reporte mensual
          </Link>
        </div>
      )}
    </div>
  );
}
