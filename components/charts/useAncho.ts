"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Ancho real (en px) del contenedor de un gráfico SVG. Los gráficos del
 * portal dibujan con este ancho como viewBox: así una unidad del SVG es un
 * píxel y el texto de los ejes mide lo que dice (11px), en vez de achicarse
 * a 4-5px en el celular cuando un viewBox fijo de 640 se escala a 320.
 * Devuelve un callback ref: sirve aunque el contenedor aparezca después
 * (gráficos que se muestran solo cuando hay datos).
 */
export function useAncho(inicial: number): [number, (el: Element | null) => void] {
  const [ancho, setAncho] = useState(inicial);
  const observador = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: Element | null) => {
    observador.current?.disconnect();
    observador.current = null;
    if (!el) return;
    const medir = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setAncho(w);
    };
    medir();
    observador.current = new ResizeObserver(medir);
    observador.current.observe(el);
  }, []);
  return [ancho, ref];
}
