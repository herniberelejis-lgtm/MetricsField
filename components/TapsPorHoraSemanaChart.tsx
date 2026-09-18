"use client";

import { useState } from "react";
import ChartCard from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { INK } from "@/lib/palette";
import { fmtNum } from "@/lib/format";
import type { TapsPorHoraDia } from "@/lib/db";

// Mapa de calor día×hora: a qué hora te tocan el cartel, últimos 7 días.
// Heatmap con una sola tinta (más taps = más oscuro) en vez de líneas —
// es la forma correcta para "comparar magnitud en una grilla" (ver skill
// de dataviz), y mono porque el portal del cliente no usa color. Reemplaza
// tener que tocar día por día en "Taps por día" (Tu cartel) para ver el
// patrón horario de toda la semana de un vistazo.

const HORAS_ETIQUETA = [0, 3, 6, 9, 12, 15, 18, 21];

function etiquetaDia(fecha: string): string {
  // Mediodía fijo: evita que un string "YYYY-MM-DD" (que Date interpreta
  // en UTC) caiga en el día de calendario anterior según el huso local del
  // navegador que renderiza esto.
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short" });
}

function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function TapsPorHoraSemanaChart({ dias }: { dias: TapsPorHoraDia[] }) {
  const [hover, setHover] = useState<{ fila: number; hora: number } | null>(null);

  const max = Math.max(...dias.flatMap((d) => d.horas), 1);
  const hayActividad = max > 0;

  const W = 640;
  const H = 190;
  const M = { top: 4, right: 8, bottom: 16, left: 34 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const filaH = plotH / dias.length;
  const colW = plotW / 24;
  const gap = 1.5; // separador entre celdas (ver marks-and-anatomy: surface gap)

  const table = {
    head: ["Día", ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))],
    rows: dias.map((d) => [`${etiquetaDia(d.fecha)} ${fechaCorta(d.fecha)}`, ...d.horas.map((v) => fmtNum(v))]),
  };

  return (
    <ChartCard
      variant="glass"
      title="A qué hora te tocan el cartel"
      subtitle="Últimos 7 días, por hora del día"
      table={table}
    >
      {hayActividad ? (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Taps por hora, últimos 7 días">
            {dias.map((d, fila) => (
              <text
                key={`y-${d.fecha}`}
                x={M.left - 6}
                y={M.top + fila * filaH + filaH / 2 + 3}
                textAnchor="end"
                fontSize={9}
                fill={INK.muted}
              >
                {etiquetaDia(d.fecha)}
              </text>
            ))}

            {HORAS_ETIQUETA.map((h) => (
              <text
                key={`x-${h}`}
                x={M.left + h * colW + colW / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill={INK.muted}
              >
                {String(h).padStart(2, "0")}h
              </text>
            ))}

            {dias.map((d, fila) =>
              d.horas.map((v, hora) => {
                const activa = hover?.fila === fila && hover.hora === hora;
                return (
                  <rect
                    key={`${d.fecha}-${hora}`}
                    x={M.left + hora * colW + gap / 2}
                    y={M.top + fila * filaH + gap / 2}
                    width={colW - gap}
                    height={filaH - gap}
                    rx={2}
                    fill={INK.primary}
                    fillOpacity={v === 0 ? 0.05 : 0.12 + (v / max) * 0.88}
                    stroke={activa ? INK.primary : "none"}
                    strokeWidth={activa ? 1.5 : 0}
                    tabIndex={0}
                    role="button"
                    aria-label={`${etiquetaDia(d.fecha)} ${fechaCorta(d.fecha)}, ${String(hora).padStart(2, "0")}h: ${fmtNum(v)} taps`}
                    onPointerEnter={() => setHover({ fila, hora })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ fila, hora })}
                    onBlur={() => setHover(null)}
                    style={{ outline: "none", cursor: "pointer" }}
                  />
                );
              }),
            )}
          </svg>

          {hover !== null && (
            <Tooltip
              title={`${etiquetaDia(dias[hover.fila].fecha)} ${fechaCorta(dias[hover.fila].fecha)}, ${String(hover.hora).padStart(2, "0")}h`}
              leftPct={((M.left + hover.hora * colW + colW / 2) / W) * 100}
              topPct={((M.top + hover.fila * filaH) / H) * 100}
              rows={[{ label: "taps", value: fmtNum(dias[hover.fila].horas[hover.hora]), color: INK.primary }]}
            />
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">Todavía no hay actividad del cartel esta semana.</p>
      )}
    </ChartCard>
  );
}
