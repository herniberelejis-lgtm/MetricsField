"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Fila horizontal scrolleable (ej. el selector de sucursales) con degradé
// en los bordes cuando hay contenido cortado por el ancho — sin esto, la
// última tarjeta visible queda literalmente cortada a mitad de texto en el
// borde del contenedor, sin ninguna pista de que hay más para scrollear
// (el scrollbar nativo puede estar oculto según el navegador/SO).
export default function ScrollFadeRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function actualizar() {
      if (!el) return;
      setPuedeIzq(el.scrollLeft > 4);
      setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    actualizar();
    el.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);
    // El primer cálculo puede correr antes de que el layout esté asentado
    // (fuentes todavía cargando, medidas en 0) y `scroll`/`resize` no
    // vuelven a dispararse solos después — un ResizeObserver sobre el
    // contenedor sí detecta cuando su contenido termina de acomodarse.
    const observer = new ResizeObserver(actualizar);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className="flex gap-2 overflow-x-auto pb-1">
        {children}
      </div>
      {/* Viñeta con negro a baja opacidad, no un color sólido a matchear
          contra el fondo real (que puede ser blanco o slate-50 según la
          sección) — así se ve igual de bien en cualquiera de los dos. */}
      {puedeIzq && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-900/[0.09] to-transparent"
        />
      )}
      {puedeDer && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900/[0.09] to-transparent"
        />
      )}
    </div>
  );
}
