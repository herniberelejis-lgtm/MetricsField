// Isotipo de marca: seis hexágonos entrelazados como eslabones. La forma
// sale de scripts/marca/generar.py (lib/marca.ts), la misma que usan el
// favicon, public/brand/ y la landing, así es idéntico en todos lados.
// Toma el color del texto (currentColor): negro sobre claro, blanco sobre
// oscuro. `size` es el alto; el ancho sale de la proporción del dibujo.

import { ISOTIPO_D, ISOTIPO_PROPORCION, ISOTIPO_VIEWBOX } from "@/lib/marca";

export default function BrandMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * ISOTIPO_PROPORCION)}
      height={size}
      viewBox={ISOTIPO_VIEWBOX}
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      aria-hidden
    >
      <path d={ISOTIPO_D} />
    </svg>
  );
}
