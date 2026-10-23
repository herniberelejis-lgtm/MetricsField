"use client";

import { useState } from "react";
import { PORTAL, niceTicks } from "@/lib/palette";
import Tooltip from "./Tooltip";
import { useAncho } from "./useAncho";

// Línea de una sola serie: trazo 2px, lavado de área al 10%, marcador final
// ≥8px con anillo de superficie de 2px, y crosshair que ajusta al mes más
// cercano. Etiqueta directa solo en el último punto (nunca en todos).
export default function LineChart({
  labels,
  values,
  color,
  format = (v) => String(v),
}: {
  labels: string[];
  values: number[];
  color: string;
  format?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Ancho real: el texto de los ejes mide lo que dice (DESIGN.md).
  const [W, refAncho] = useAncho(640);

  const H = 230;
  const M = { top: 14, right: 64, bottom: 24, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const ticks = niceTicks(Math.max(...values, 1));
  const maxY = ticks[ticks.length - 1];
  const xAt = (i: number) =>
    M.left + (labels.length > 1 ? (i / (labels.length - 1)) * plotW : plotW / 2);
  const yAt = (v: number) => M.top + plotH - (v / maxY) * plotH;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xAt(values.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
  const band = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
  const last = values.length - 1;

  return (
    <div className="relative" ref={refAncho}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Gráfico de línea"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke={t === 0 ? PORTAL.eje : PORTAL.grilla}
              strokeWidth={1}
            />
            <text
              x={M.left - 6}
              y={yAt(t) + 3}
              textAnchor="end"
              fontSize={11}
              fill={PORTAL.textoSec}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(t)}
            </text>
          </g>
        ))}

        {labels.map((label, i) => (
          <text
            key={label}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill={PORTAL.textoSec}
          >
            {label}
          </text>
        ))}

        {/* crosshair */}
        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={M.top}
            y2={M.top + plotH}
            stroke={PORTAL.eje}
            strokeWidth={1}
          />
        )}

        <path d={areaPath} fill={color} opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* marcador en hover */}
        {hover !== null && (
          <circle
            cx={xAt(hover)}
            cy={yAt(values[hover])}
            r={4}
            fill={color}
            stroke={"#FFFFFF"}
            strokeWidth={2}
          />
        )}

        {/* marcador + etiqueta directa del último punto */}
        <circle
          cx={xAt(last)}
          cy={yAt(values[last])}
          r={4}
          fill={color}
          stroke={"#FFFFFF"}
          strokeWidth={2}
        />
        <text
          x={xAt(last) + 8}
          y={yAt(values[last]) + 3.5}
          fontSize={12}
          fontWeight={600}
          fill={PORTAL.texto}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {format(values[last])}
        </text>

        {/* hit targets por posición X (más grandes que la marca) */}
        {labels.map((label, i) => (
          <rect
            key={label}
            x={xAt(i) - band / 2}
            y={M.top}
            width={band}
            height={plotH}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${label}: ${format(values[i])}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ outline: "none" }}
          />
        ))}
      </svg>

      {hover !== null && (
        <Tooltip
          title={labels[hover]}
          leftPct={(xAt(hover) / W) * 100}
          topPct={(yAt(values[hover]) / H) * 100}
          rows={[{ label: "", value: format(values[hover]), color }]}
        />
      )}
    </div>
  );
}
