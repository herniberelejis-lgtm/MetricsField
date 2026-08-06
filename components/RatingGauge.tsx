// Anillo de progreso circular para la calificación de Google (0..5 estrellas
// mapeado a 0..100% del círculo). `dark` es la variante que se usa sobre la
// card "hero" (fondo negro) del local activo; el resto de las cards usa la
// variante clara.
export default function RatingGauge({
  rating,
  size = 96,
  dark = false,
}: {
  rating: number;
  size?: number;
  dark?: boolean;
}) {
  const stroke = size * 0.07;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, rating / 5));
  const dash = c * pct;

  const track = dark ? "rgba(255,255,255,0.18)" : "#EAEAEA";
  const progress = dark ? "#FFFFFF" : "#1A1A1A";
  const text = dark ? "#FFFFFF" : "#1A1A1A";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progress}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums"
        style={{ color: text }}
      >
        {rating.toFixed(1)}
      </div>
    </div>
  );
}
