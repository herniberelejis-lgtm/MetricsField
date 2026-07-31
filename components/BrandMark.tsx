// Isotipo de marca: rosette de 6 hexágonos entrelazados alrededor de uno
// central (ver Manual de Marca, sección "Isotipo"). Se calcula una sola vez
// a nivel de módulo — es geometría fija, no depende de props.

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let a = 0; a < 6; a++) {
    const ang = (Math.PI / 180) * (60 * a - 30);
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const CX = 50;
const CY = 50;
const R = 18;
const HEX_R = 15;

const HEX_CENTERS: Array<[number, number]> = [[CX, CY]];
for (let k = 0; k < 6; k++) {
  const ang = (Math.PI / 180) * (60 * k - 90);
  HEX_CENTERS.push([CX + R * Math.cos(ang), CY + R * Math.sin(ang)]);
}
const POLYGONS = HEX_CENTERS.map(([hx, hy]) => hexPoints(hx, hy, HEX_R));

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
