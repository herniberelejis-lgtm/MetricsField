"use client";

import { useState } from "react";
import ChartCard from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { SERIES, INK, niceTicks } from "@/lib/palette";
import { fmtNum } from "@/lib/format";

// Tendencia de reseñas: dos variables sobre el mismo eje de tiempo —
// cantidad TOTAL de reseñas (eje izquierdo, cuentas) y CALIDAD, el rating
// promedio (eje derecho, escala fija 0..5). Dos escalas distintas a
// propósito: mezclarlas en un solo eje haría que el rating (1..5) se viera
// como una línea plana pegada al piso frente a cientos de reseñas.
//
// Autocontenido (no usa LineChart, que es de una sola serie) pero comparte
// la misma paleta y la misma card con toggle Gráfico/Tabla del resto.

const COLOR_TOTAL = SERIES[0]; // azul — cantidad
const COLOR_RATING = SERIES[3]; // verde — calidad

export default function TendenciaResenasChart({
  labels,
  totales,
  ratings,
}: {
  labels: string[];
  totales: number[];
  ratings: number[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 230;
  const M = { top: 14, right: 56, bottom: 24, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const ticksL = niceTicks(Math.max(...totales, 1));
  const maxL = ticksL[ticksL.length - 1];
  const maxR = 5; // rating siempre 0..5, escala honesta y estable

  const xAt = (i: number) =>
    M.left + (labels.length > 1 ? (i / (labels.length - 1)) * plotW : plotW / 2);
  const yL = (v: number) => M.top + plotH - (v / maxL) * plotH;
  const yR = (v: number) => M.top + plotH - (v / maxR) * plotH;

  const pathTotal = totales.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yL(v)}`).join(" ");
  const pathRating = ratings.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yR(v)}`).join(" ");
  const areaTotal = `${pathTotal} L ${xAt(totales.length - 1)} ${yL(0)} L ${xAt(0)} ${yL(0)} Z`;
  const band = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
  const last = labels.length - 1;

  const table = {
    head: ["Mes", "Reseñas (total)", "Rating"],
    rows: labels.map((l, i) => [l, fmtNum(totales[i]), ratings[i].toFixed(1)]),
  };

  return (
    <ChartCard
      title="Tendencia de reseñas"
      subtitle="Cantidad total y calidad (rating promedio) mes a mes"
      legend={[
        { label: "Total de reseñas", color: COLOR_TOTAL, mark: "line" },
        { label: "Rating promedio", color: COLOR_RATING, mark: "line" },
      ]}
      table={table}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tendencia de reseñas">
          {/* eje izquierdo: cuentas */}
          {ticksL.map((t) => (
            <g key={`l${t}`}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={yL(t)}
                y2={yL(t)}
                stroke={t === 0 ? INK.axis : INK.grid}
                strokeWidth={1}
              />
              <text
                x={M.left - 6}
                y={yL(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill={COLOR_TOTAL}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {fmtNum(t)}
              </text>
            </g>
          ))}

          {/* eje derecho: rating 0..5 (sin líneas propias, solo etiquetas) */}
          {[0, 1, 2, 3, 4, 5].map((t) => (
            <text
              key={`r${t}`}
              x={W - M.right + 6}
              y={yR(t) + 3}
              textAnchor="start"
              fontSize={10}
              fill={COLOR_RATING}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t}
            </text>
          ))}

          {labels.map((label, i) => (
            <text key={label} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={INK.muted}>
              {label}
            </text>
          ))}

          {hover !== null && (
            <line x1={xAt(hover)} x2={xAt(hover)} y1={M.top} y2={M.top + plotH} stroke={INK.axis} strokeWidth={1} />
          )}

          <path d={areaTotal} fill={COLOR_TOTAL} opacity={0.08} />
          <path d={pathTotal} fill="none" stroke={COLOR_TOTAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path
            d={pathRating}
            fill="none"
            stroke={COLOR_RATING}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="5 3"
          />

          {/* marcadores del último punto */}
          <circle cx={xAt(last)} cy={yL(totales[last])} r={4} fill={COLOR_TOTAL} stroke={INK.surface} strokeWidth={2} />
          <circle cx={xAt(last)} cy={yR(ratings[last])} r={4} fill={COLOR_RATING} stroke={INK.surface} strokeWidth={2} />

          {hover !== null && (
            <>
              <circle cx={xAt(hover)} cy={yL(totales[hover])} r={4} fill={COLOR_TOTAL} stroke={INK.surface} strokeWidth={2} />
              <circle cx={xAt(hover)} cy={yR(ratings[hover])} r={4} fill={COLOR_RATING} stroke={INK.surface} strokeWidth={2} />
            </>
          )}

          {/* hit targets por columna */}
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
              aria-label={`${label}: ${fmtNum(totales[i])} reseñas, rating ${ratings[i].toFixed(1)}`}
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
            topPct={(Math.min(yL(totales[hover]), yR(ratings[hover])) / H) * 100}
            rows={[
              { label: "Total", value: fmtNum(totales[hover]), color: COLOR_TOTAL },
              { label: "Rating", value: ratings[hover].toFixed(1), color: COLOR_RATING },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
