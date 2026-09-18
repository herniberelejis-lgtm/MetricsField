"use client";

import { useState } from "react";
import ChartCard, { type LegendItem } from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { INK, RATING_COLORS } from "@/lib/palette";
import type { ResenasPorHoraDia } from "@/lib/db";

// Mapa de calor día×hora de CUÁNDO llegan las reseñas de Google — mismo
// layout que "a qué hora te tocan el cartel" (TapsPorHoraSemanaChart), pero
// acá el color es la calificación (rojo 1★ → verde 5★), no el volumen. Es
// la única escala roja-a-verde del portal del cliente (el resto es
// monocromo a propósito) — un rango de 5 pasos rojo→verde no puede pasar el
// chequeo de daltonismo par-a-par que sí exige una paleta categórica (ver
// lib/palette.ts), así que el número real SIEMPRE viaja también por el
// tooltip y la vista Tabla — nunca solo el color.

const HORAS_ETIQUETA = [0, 3, 6, 9, 12, 15, 18, 21];

const LEYENDA: LegendItem[] = ([1, 2, 3, 4, 5] as const).map((n) => ({
  label: `${n}★`,
  color: RATING_COLORS[n],
  mark: "rect",
}));

function etiquetaDia(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short" });
}

function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function RatingPorHoraChart({ dias }: { dias: ResenasPorHoraDia[] }) {
  const [hover, setHover] = useState<{ fila: number; hora: number } | null>(null);

  const hayActividad = dias.some((d) => d.horas.some((c) => c.rating !== null));

  const W = 640;
  const H = 190;
  const M = { top: 4, right: 8, bottom: 16, left: 34 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const filaH = plotH / dias.length;
  const colW = plotW / 24;
  const gap = 1.5;

  const table = {
    head: ["Día", ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))],
    rows: dias.map((d) => [
      `${etiquetaDia(d.fecha)} ${fechaCorta(d.fecha)}`,
      ...d.horas.map((c) => (c.rating === null ? "—" : `${c.rating}★ (${c.cantidad})`)),
    ]),
  };

  return (
    <ChartCard
      variant="glass"
      title="A qué hora llegan tus reseñas de Google"
      subtitle="Últimos 7 días, coloreado por calificación"
      legend={LEYENDA}
      table={table}
    >
      {hayActividad ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Reseñas de Google por hora, últimos 7 días, coloreadas por calificación"
          >
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
              d.horas.map((c, hora) => {
                const activa = hover?.fila === fila && hover.hora === hora;
                const vacia = c.rating === null;
                return (
                  <rect
                    key={`${d.fecha}-${hora}`}
                    x={M.left + hora * colW + gap / 2}
                    y={M.top + fila * filaH + gap / 2}
                    width={colW - gap}
                    height={filaH - gap}
                    rx={2}
                    fill={vacia ? INK.primary : RATING_COLORS[c.rating!]}
                    fillOpacity={vacia ? 0.05 : 1}
                    stroke={activa ? INK.primary : "none"}
                    strokeWidth={activa ? 1.5 : 0}
                    tabIndex={vacia ? -1 : 0}
                    role={vacia ? undefined : "button"}
                    aria-label={
                      vacia
                        ? undefined
                        : `${etiquetaDia(d.fecha)} ${fechaCorta(d.fecha)}, ${String(hora).padStart(2, "0")}h: ${c.cantidad} reseña${c.cantidad === 1 ? "" : "s"}, promedio ${c.rating}★`
                    }
                    onPointerEnter={() => setHover({ fila, hora })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ fila, hora })}
                    onBlur={() => setHover(null)}
                    style={{ outline: "none", cursor: vacia ? "default" : "pointer" }}
                  />
                );
              }),
            )}
          </svg>

          {hover !== null && dias[hover.fila].horas[hover.hora].rating !== null && (
            <Tooltip
              title={`${etiquetaDia(dias[hover.fila].fecha)} ${fechaCorta(dias[hover.fila].fecha)}, ${String(hover.hora).padStart(2, "0")}h`}
              leftPct={((M.left + hover.hora * colW + colW / 2) / W) * 100}
              topPct={((M.top + hover.fila * filaH) / H) * 100}
              rows={[
                {
                  label: `reseña${dias[hover.fila].horas[hover.hora].cantidad === 1 ? "" : "s"}`,
                  value: `${dias[hover.fila].horas[hover.hora].rating}★ (${dias[hover.fila].horas[hover.hora].cantidad})`,
                  color: RATING_COLORS[dias[hover.fila].horas[hover.hora].rating!],
                },
              ]}
            />
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">
          Todavía no llegó ninguna reseña de Google sincronizada esta semana.
        </p>
      )}
    </ChartCard>
  );
}
