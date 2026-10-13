"use client";

import { useState } from "react";
import ChartCard, { type LegendItem } from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { INK, RATING_COLORS } from "@/lib/palette";
import type { VistaMapa } from "@/lib/semaforo";

// Mapa de calor día de la semana × hora de CUÁNDO llegan las reseñas de
// Google, sobre las reseñas del mes o las últimas 100 (lib/semaforo.ts) —
// mismo layout que "a qué hora te tocan el cartel" (TapsPorHoraSemanaChart),
// pero acá el color es la calificación (rojo 1★ → verde 5★), no el volumen. Es
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

const hh = (h: number) => `${String(h).padStart(2, "0")}h`;

export default function RatingPorHoraChart({ vistas }: { vistas: VistaMapa[] }) {
  // Arranca en "Este mes" si ya llegó alguna; si no, en las últimas 100.
  const inicial = vistas.find((v) => v.total > 0)?.clave ?? vistas[0]?.clave;
  const [clave, setClave] = useState(inicial);
  const [hover, setHover] = useState<{ fila: number; hora: number } | null>(null);
  const vista = vistas.find((v) => v.clave === clave) ?? vistas[0];
  if (!vista) return null;
  const filas = vista.filas;

  const W = 640;
  const H = 190;
  const M = { top: 4, right: 8, bottom: 16, left: 34 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const filaH = plotH / filas.length;
  const colW = plotW / 24;
  const gap = 1.5;

  const table = {
    head: ["Día", ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))],
    rows: filas.map((f) => [
      f.etiqueta,
      ...f.horas.map((c) => (c.rating === null ? "—" : `${c.rating}★ (${c.cantidad})`)),
    ]),
  };
  const celda = hover ? filas[hover.fila].horas[hover.hora] : null;

  return (
    <ChartCard
      variant="glass"
      title="Cuándo llegan tus reseñas de Google"
      subtitle={`${vista.nombre} · ${vista.total} reseña${vista.total === 1 ? "" : "s"}, por día de la semana y hora, coloreado por calificación`}
      legend={LEYENDA}
      table={table}
    >
      {vistas.length > 1 && (
        <div className="mb-3 inline-flex rounded-full bg-slate-100 p-0.5 text-xs" role="tablist">
          {vistas.map((v) => (
            <button
              key={v.clave}
              type="button"
              role="tab"
              aria-selected={v.clave === vista.clave}
              onClick={() => {
                setClave(v.clave);
                setHover(null);
              }}
              className={`rounded-full px-3 py-1 font-medium transition ${
                v.clave === vista.clave ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v.nombre}
            </button>
          ))}
        </div>
      )}

      {vista.total > 0 ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Reseñas de Google por día de la semana y hora (${vista.nombre}), coloreadas por calificación`}
          >
            {filas.map((f, fila) => (
              <text
                key={`y-${f.etiqueta}`}
                x={M.left - 6}
                y={M.top + fila * filaH + filaH / 2 + 3}
                textAnchor="end"
                fontSize={9}
                fill={INK.muted}
              >
                {f.etiqueta}
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
                {hh(h)}
              </text>
            ))}

            {filas.map((f, fila) =>
              f.horas.map((c, hora) => {
                const activa = hover?.fila === fila && hover.hora === hora;
                const vacia = c.rating === null;
                return (
                  <rect
                    key={`${f.etiqueta}-${hora}`}
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
                        : `${f.etiqueta} ${hh(hora)}: ${c.cantidad} reseña${c.cantidad === 1 ? "" : "s"}, promedio ${c.rating}★`
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

          {hover !== null && celda?.rating && (
            <Tooltip
              title={`${filas[hover.fila].etiqueta}, ${hh(hover.hora)}`}
              leftPct={((M.left + hover.hora * colW + colW / 2) / W) * 100}
              topPct={((M.top + hover.fila * filaH) / H) * 100}
              rows={[
                {
                  label: `reseña${celda.cantidad === 1 ? "" : "s"}, promedio`,
                  value: `${celda.cantidad} · ${celda.rating}★`,
                  color: RATING_COLORS[celda.rating],
                },
              ]}
            />
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">
          {vista.clave === "mes"
            ? "Todavía no llegó ninguna reseña de Google este mes."
            : "Todavía no hay reseñas de Google con hora para armar el mapa."}
        </p>
      )}
    </ChartCard>
  );
}
