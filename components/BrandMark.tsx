// Isotipo de marca: 6 hexágonos entrelazados en forma de flor (ver Manual
// de Marca, sección "Isotipo") — misma geometría que app/icon.svg y el
// logo subido a Google Cloud Console para la verificación OAuth, para que
// el isotipo sea idéntico en todo el producto (admin, portal, home,
// favicon) y en lo que Google tiene registrado. Se calcula una sola vez a
// nivel de módulo — es geometría fija, no depende de props.

const CX = 50;
const CY = 50;
const RING_R = 23.4; // distancia del centro a cada hexágono
const HEX_R = 14.1; // "radio" de cada hexágono individual

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let j = 0; j < 6; j++) {
    const ang = (Math.PI / 180) * (60 * j);
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const POLYGONS = Array.from({ length: 6 }, (_, i) => {
  const ang = (Math.PI / 180) * (60 * i);
  const hx = CX + RING_R * Math.cos(ang);
  const hy = CY + RING_R * Math.sin(ang);
  return hexPoints(hx, hy, HEX_R);
});

export default function BrandMark({
  size = 24,
  strokeWidth = 4,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {POLYGONS.map((pts, i) => (
        <polygon key={i} points={pts} />
      ))}
    </svg>
  );
}
