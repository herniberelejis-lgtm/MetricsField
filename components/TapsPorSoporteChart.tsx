"use client";

import { useState, useTransition } from "react";
import ChartCard from "@/components/charts/ChartCard";
import Tooltip from "@/components/charts/Tooltip";
import { SERIES, INK, niceTicks } from "@/lib/palette";
import { fmtNum } from "@/lib/format";
import { accionObtenerTapsPorHora } from "@/app/portal/actions";

// Taps por día, separados por soporte (NFC vs QR) — mismo eje, misma unidad
// (cantidad de taps), así que van juntos en un solo gráfico con 2 series de
// color categórico, no un dual-axis. Si el comercio no tiene ningún link con
// QR habilitado, se muestra solo la línea de NFC (sin leyenda, una serie).
const COLOR_NFC = SERIES[0]; // azul
const COLOR_QR = SERIES[1]; // aqua

export default function TapsPorSoporteChart({
  labels,
  fechas,
  nfc,
  qr,
  mostrarQr,
  codigo,
}: {
  labels: string[];
  /** Fecha completa (YYYY-MM-DD) de cada punto, en el mismo orden que
   * `labels` — se manda al server action para pedir el desglose por hora. */
  fechas: string[];
  nfc: number[];
  qr: number[];
  mostrarQr: boolean;
  codigo: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<number | null>(null);
  const [horas, setHoras] = useState<{ hora: number; taps: number }[] | null>(null);
  const [pendiente, startTransition] = useTransition();

  function alternarDia(i: number) {
    if (diaAbierto === i) {
      setDiaAbierto(null);
      setHoras(null);
      return;
    }
    setDiaAbierto(i);
    setHoras(null);
    startTransition(async () => {
      const r = await accionObtenerTapsPorHora(codigo, fechas[i]);
      setHoras(r);
    });
  }

  const W = 640;
  const H = 230;
  const M = { top: 14, right: 20, bottom: 24, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const maxValor = mostrarQr
    ? Math.max(...nfc, ...qr, 1)
    : Math.max(...nfc, 1);
  const ticks = niceTicks(maxValor);
  const maxY = ticks[ticks.length - 1];

  const xAt = (i: number) =>
    M.left + (labels.length > 1 ? (i / (labels.length - 1)) * plotW : plotW / 2);
  const yAt = (v: number) => M.top + plotH - (v / maxY) * plotH;
  const band = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
  const last = labels.length - 1;

  const pathDe = (serie: number[]) =>
    serie.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  const pathNfc = pathDe(nfc);
  const pathQr = pathDe(qr);
  const areaNfc = `${pathNfc} L ${xAt(nfc.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;

  const table = {
    head: mostrarQr ? ["Día", "Taps NFC", "Taps QR"] : ["Día", "Taps"],
    rows: labels.map((l, i) => (mostrarQr ? [l, fmtNum(nfc[i]), fmtNum(qr[i])] : [l, fmtNum(nfc[i])])),
  };

  return (
    <ChartCard
      title="Taps por día"
      subtitle={`Últimos ${labels.length} días${mostrarQr ? " · separados por NFC y QR" : ""}`}
      legend={
        mostrarQr
          ? [
              { label: "Vía NFC", color: COLOR_NFC, mark: "line" },
              { label: "Vía QR (aprox.)", color: COLOR_QR, mark: "line" },
            ]
          : undefined
      }
      table={table}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Taps por día">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke={t === 0 ? INK.axis : INK.grid}
                strokeWidth={1}
              />
              <text
                x={M.left - 6}
                y={yAt(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill={INK.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {fmtNum(t)}
              </text>
            </g>
          ))}

          {labels.map((label, i) => (
            <text key={label} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={INK.muted}>
              {label}
            </text>
          ))}

          {hover !== null && (
            <line x1={xAt(hover)} x2={xAt(hover)} y1={M.top} y2={M.top + plotH} stroke={INK.axis} strokeWidth={1} />
          )}

          <path d={areaNfc} fill={COLOR_NFC} opacity={0.1} />
          <path d={pathNfc} fill="none" stroke={COLOR_NFC} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {mostrarQr && (
            <path d={pathQr} fill="none" stroke={COLOR_QR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}

          <circle cx={xAt(last)} cy={yAt(nfc[last])} r={4} fill={COLOR_NFC} stroke={INK.surface} strokeWidth={2} />
          {mostrarQr && (
            <circle cx={xAt(last)} cy={yAt(qr[last])} r={4} fill={COLOR_QR} stroke={INK.surface} strokeWidth={2} />
          )}

          {hover !== null && (
            <>
              <circle cx={xAt(hover)} cy={yAt(nfc[hover])} r={4} fill={COLOR_NFC} stroke={INK.surface} strokeWidth={2} />
              {mostrarQr && (
                <circle cx={xAt(hover)} cy={yAt(qr[hover])} r={4} fill={COLOR_QR} stroke={INK.surface} strokeWidth={2} />
              )}
            </>
          )}

          {labels.map((label, i) => (
            <rect
              key={label}
              x={xAt(i) - band / 2}
              y={M.top}
              width={band}
              height={plotH}
              fill={diaAbierto === i ? INK.grid : "transparent"}
              tabIndex={0}
              role="button"
              aria-label={
                mostrarQr
                  ? `${label}: ${fmtNum(nfc[i])} NFC, ${fmtNum(qr[i])} QR — tocar para ver por hora`
                  : `${label}: ${fmtNum(nfc[i])} taps — tocar para ver por hora`
              }
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => alternarDia(i)}
              style={{ outline: "none", cursor: "pointer" }}
            />
          ))}
        </svg>

        {hover !== null && (
          <Tooltip
            title={labels[hover]}
            leftPct={(xAt(hover) / W) * 100}
            topPct={(Math.min(yAt(nfc[hover]), yAt(mostrarQr ? qr[hover] : nfc[hover])) / H) * 100}
            rows={
              mostrarQr
                ? [
                    { label: "NFC", value: fmtNum(nfc[hover]), color: COLOR_NFC },
                    { label: "QR", value: fmtNum(qr[hover]), color: COLOR_QR },
                  ]
                : [{ label: "Taps", value: fmtNum(nfc[hover]), color: COLOR_NFC }]
            }
          />
        )}
      </div>

      <p className="mt-1 text-center text-[11px] text-slate-400">Tocá un día para ver a qué hora te tocaron el cartel.</p>

      {diaAbierto !== null && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">{labels[diaAbierto]} · por hora</p>
          {pendiente || !horas ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : horas.every((h) => h.taps === 0) ? (
            <p className="text-xs text-slate-400">No hubo taps ese día.</p>
          ) : (
            <div className="space-y-1">
              {horas
                .filter((h) => h.taps > 0)
                .map((h) => (
                  <div key={h.hora} className="flex items-center gap-2">
                    <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                      {String(h.hora).padStart(2, "0")}:00
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(6, (h.taps / Math.max(...horas.map((x) => x.taps))) * 100)}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-[11px] font-medium tabular-nums text-slate-700">{h.taps}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}
