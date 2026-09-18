"use client";

import { useState } from "react";
import ChartCard from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { INK } from "@/lib/palette";
import { fmtMes } from "@/lib/format";
import type { MetricaMensual } from "@/lib/types";

// Línea de calificación mes a mes — panel "Mi Rating en Google". Eje fijo
// 1..5 (no relativo al rango de los datos): así una suba real de 4.2 a 4.6
// se ve como lo que es, un tramo chico dentro de la escala completa, en vez
// de un salto exagerado por un eje recortado.
export default function RatingSerieChart({
  historico,
  zona,
}: {
  historico: MetricaMensual[];
  zona: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = historico.length;

  const W = 640;
  const H = 190;
  const M = { top: 16, right: 12, bottom: 22, left: 24 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const x = (i: number) => (n <= 1 ? M.left + plotW / 2 : M.left + (i / (n - 1)) * plotW);
  const y = (v: number) => M.top + plotH - ((v - 1) / 4) * plotH;

  const paso = Math.max(1, Math.ceil(n / 6));

  const table = {
    head: ["Mes", "Rating"],
    rows: historico.map((m) => [fmtMes(m.mes), m.ratingPromedio.toFixed(1)]),
  };

  if (n === 0) return null;

  return (
    <ChartCard
      variant="glass"
      title={`Calificación en ${zona}`}
      subtitle={`Últimos ${n} mes${n === 1 ? "" : "es"}`}
      table={table}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Calificación en ${zona}, últimos ${n} meses`}
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <line key={`grid-${v}`} x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={INK.grid} strokeWidth={1} />
          ))}
          {[1, 3, 5].map((v) => (
            <text key={`y-${v}`} x={M.left} y={y(v) - 4} fontSize={9} fill={INK.muted}>
              {v}★
            </text>
          ))}
          {historico.map((m, i) =>
            i % paso === 0 || i === n - 1 ? (
              <text key={`x-${m.mes}`} x={x(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={INK.muted}>
                {fmtMes(m.mes).slice(0, 3)}
              </text>
            ) : null,
          )}
          <polyline
            points={historico.map((m, i) => `${x(i)},${y(m.ratingPromedio)}`).join(" ")}
            fill="none"
            stroke={INK.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {historico.map((m, i) => (
            <circle
              key={m.mes}
              cx={x(i)}
              cy={y(m.ratingPromedio)}
              r={hover === i ? 4 : 3}
              fill={INK.primary}
              tabIndex={0}
              role="button"
              aria-label={`${fmtMes(m.mes)}: ${m.ratingPromedio.toFixed(1)} estrellas`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ outline: "none", cursor: "pointer" }}
            />
          ))}
        </svg>

        {hover !== null && (
          <Tooltip
            title={fmtMes(historico[hover].mes)}
            leftPct={(x(hover) / W) * 100}
            topPct={(y(historico[hover].ratingPromedio) / H) * 100}
            rows={[{ label: "rating", value: historico[hover].ratingPromedio.toFixed(1), color: INK.primary }]}
          />
        )}
      </div>
    </ChartCard>
  );
}
