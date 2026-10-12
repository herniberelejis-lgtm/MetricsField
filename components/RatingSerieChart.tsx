"use client";

import { useState } from "react";
import ChartCard from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { INK } from "@/lib/palette";
import { fmtMes } from "@/lib/format";
import type { MetricaMensual } from "@/lib/types";
import { mesSiguiente } from "@/lib/comparativa-competencia";

// Línea de calificación mes a mes — panel "Mi Rating en Google".
//
// Eje vertical: hasta 5★ arriba y abajo lo justo para que se vea el
// movimiento, pero nunca menos de una estrella entera de rango. Con el eje
// fijo 1..5 un comercio en 4.7–4.9 (casi todos los clientes) veía una raya
// plana pegada al techo; con un recorte agresivo (4.7–4.9) una décima
// parecía un salto. Un tramo de al menos 1★, con las marcas rotuladas, deja
// ver una décima sin exagerarla.
//
// Eje horizontal: meses en su posición real en el tiempo. Un mes sin dato
// (el saneado del histórico lo puede sacar) queda como hueco con línea
// punteada, en vez de juntar Jul y Sep como si fueran seguidos.

function mesesEntre(desde: string, hasta: string): string[] {
  const salida: string[] = [];
  let m = desde;
  while (m <= hasta && salida.length < 120) {
    salida.push(m);
    m = mesSiguiente(m);
  }
  return salida;
}

export default function RatingSerieChart({
  historico,
}: {
  historico: MetricaMensual[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = historico.length;
  if (n === 0) return null;

  const meses = mesesEntre(historico[0].mes, historico[n - 1].mes);
  const indiceMes = new Map(meses.map((m, i) => [m, i]));
  const totalMeses = meses.length;

  const W = 640;
  const H = 200;
  const M = { top: 18, right: 40, bottom: 24, left: 34 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const ratings = historico.map((h) => h.ratingPromedio);
  const minimo = Math.min(...ratings);
  const techo = 5;
  const piso = Math.max(1, Math.min(techo - 1, Math.floor((minimo - 0.2) * 2) / 2));
  const pasoY = techo - piso <= 2 ? 0.5 : 1;
  const marcasY: number[] = [];
  for (let v = piso; v <= techo + 1e-9; v += pasoY) marcasY.push(Number(v.toFixed(1)));

  const xMes = (mes: string) => {
    const i = indiceMes.get(mes) ?? 0;
    return totalMeses <= 1 ? M.left + plotW / 2 : M.left + (i / (totalMeses - 1)) * plotW;
  };
  const y = (v: number) => M.top + plotH - ((v - piso) / (techo - piso)) * plotH;

  // Tramos: sólido entre meses seguidos, punteado si en el medio falta uno.
  const tramos = historico.slice(1).map((h, i) => {
    const prev = historico[i];
    const seguido = mesSiguiente(prev.mes) === h.mes;
    return { desde: prev, hasta: h, seguido };
  });
  const hayHuecos = tramos.some((t) => !t.seguido);

  const pasoX = Math.max(1, Math.ceil(totalMeses / 7));
  const primero = historico[0];
  const ultimo = historico[n - 1];
  const cambio = ultimo.ratingPromedio - primero.ratingPromedio;
  const subtitulo =
    n === 1
      ? fmtMes(ultimo.mes)
      : Math.abs(cambio) < 0.05
        ? `Estable en ${ultimo.ratingPromedio.toFixed(1)}★ desde ${fmtMes(primero.mes)}`
        : `${cambio > 0 ? "+" : "−"}${Math.abs(cambio).toFixed(1)}★ desde ${fmtMes(primero.mes)}`;

  const table = {
    head: ["Mes", "Calificación"],
    rows: historico.map((m) => [fmtMes(m.mes), m.ratingPromedio.toFixed(1)]),
  };

  return (
    <ChartCard variant="glass" title="Tu calificación en Google" subtitle={subtitulo} table={table}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Tu calificación en Google: ${subtitulo}`}
        >
          {marcasY.map((v) => (
            <g key={`y-${v}`}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={INK.grid} strokeWidth={1} />
              <text x={M.left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill={INK.muted}>
                {Number.isInteger(v) ? `${v}★` : v.toFixed(1)}
              </text>
            </g>
          ))}

          {meses.map((mes, i) =>
            i % pasoX === 0 || i === totalMeses - 1 ? (
              <text
                key={`x-${mes}`}
                x={xMes(mes)}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill={INK.muted}
                opacity={historico.some((h) => h.mes === mes) ? 1 : 0.5}
              >
                {fmtMes(mes).slice(0, 3)}
              </text>
            ) : null,
          )}

          {tramos.map((t) => (
            <line
              key={`t-${t.desde.mes}`}
              x1={xMes(t.desde.mes)}
              y1={y(t.desde.ratingPromedio)}
              x2={xMes(t.hasta.mes)}
              y2={y(t.hasta.ratingPromedio)}
              stroke={t.seguido ? INK.primary : INK.muted}
              strokeWidth={2}
              strokeDasharray={t.seguido ? undefined : "4 4"}
              strokeLinecap="round"
            />
          ))}

          {historico.map((m, i) => (
            <circle
              key={m.mes}
              cx={xMes(m.mes)}
              cy={y(m.ratingPromedio)}
              r={hover === i ? 5 : 4}
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

          {/* Etiqueta directa solo en el último valor: es el que importa. */}
          <text
            x={xMes(ultimo.mes) + 8}
            y={y(ultimo.ratingPromedio) + 3}
            fontSize={11}
            fontWeight={600}
            fill={INK.primary}
          >
            {ultimo.ratingPromedio.toFixed(1)}★
          </text>
        </svg>

        {hover !== null && (
          <Tooltip
            title={fmtMes(historico[hover].mes)}
            leftPct={(xMes(historico[hover].mes) / W) * 100}
            topPct={(y(historico[hover].ratingPromedio) / H) * 100}
            rows={[{ label: "calificación", value: historico[hover].ratingPromedio.toFixed(1), color: INK.primary }]}
          />
        )}
      </div>
      {hayHuecos && (
        <p className="mt-2 text-xs text-slate-400">La línea punteada cruza meses sin dato.</p>
      )}
    </ChartCard>
  );
}
