"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Capa de movimiento: marca <html> con js-mov (sin JS el contenido se ve
// igual, quieto) y revela cada bloque .revela por partes al entrar en
// pantalla. Si el usuario pidió menos movimiento, no hace nada.

export default function Movimiento() {
  // La ruta va como dependencia: al navegar entre páginas del sitio el
  // layout no se vuelve a montar, pero los bloques .revela son nuevos.
  const ruta = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const raiz = document.documentElement;
    raiz.classList.add("js-mov");
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll(".revela:not(.visible)").forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
    };
  }, [ruta]);
  return null;
}
