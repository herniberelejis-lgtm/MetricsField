export default function Sparkline({ values, width = 280, height = 56, mono = false }) {
  if (!values?.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = 6;
  const innerH = height - pad * 2;

  const pts = values
    .map((v, i) => {
      const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
      const y = pad + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = mono ? "#64748b" : "#1e293b";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img" aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
