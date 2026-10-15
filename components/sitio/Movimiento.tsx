"use client";

import { useEffect } from "react";

// Capa de movimiento: marca <html> con js-mov (sin JS el contenido se ve
// igual, quieto) y revela cada bloque .revela por partes al entrar en
// pantalla. Si el usuario pidió menos movimiento, no hace nada.

export default function Movimiento() {
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
    document.querySelectorAll(".revela").forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
      raiz.classList.remove("js-mov");
    };
  }, []);
  return null;
}
