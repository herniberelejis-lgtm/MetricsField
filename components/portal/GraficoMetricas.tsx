"use client";

import { useState, type PointerEvent } from "react";
import type { IdKpi, Kpi } from "@/lib/tablero";

// Las métricas del período arriba de todo, estilo Google Analytics: cada
// métrica es una pestaña y el gráfico de abajo muestra la elegida, día por
// día, contra el período anterior (línea punteada). Pasando el dedo o el
// mouse por el gráfico se ve el número de cada día.

const ICONOS: Record<IdKpi, string> = {
  vistas: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  llegar: "M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  llamadas: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  toques: "M9 11V5a2 2 0 0 1 4 0v6M13 10a2 2 0 0 1 4 0v2M17 11a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-3l-3-5a2 2 0 0 1 3-2l2 2",
  resenas: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  calificacion: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
};

const TITULOS: Record<IdKpi, string> = {
  vistas: "Personas que te vieron en Google, por día",
  llegar: 'Pedidos de "cómo llegar", por día',
  llamadas: "Llamadas desde tu ficha, por día",
  toques: "Toques al cartel, por día",
  resenas: "Reseñas nuevas en Google, por día",
  calificacion: "Calificación",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCorta(f: string): string {
  return `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}`;
}
function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Tope "redondo" del eje (3 escalones iguales), lo más justo posible. */
function topeEje(max: number): number {
  if (max <= 0) return 3;
  const paso = max / 3;
  const mag = 10 ** Math.floor(Math.log10(paso));
  const lindo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * mag >= paso)! * mag;
  return Math.max(3, Math.round(lindo * 3));
}

const W = 840;
const H = 240;

function camino(vals: number[], tope: number, cerrar: boolean): string {
  const n = vals.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i * W) / (n - 1));
  const y = (v: number) => H - (v / tope) * H;
  let d = "M" + vals.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" L");
  if (cerrar) d += ` L${W} ${H} L0 ${H} Z`;
  return d;
}

function DeltaChip({ k }: { k: Kpi }) {
  if (!k.delta) return <span className="text-xs text-slate-500">{k.valor === null ? "" : "sin período anterior"}</span>;
  const color = k.delta.tono === "sube" ? "text-[#0B5E40]" : k.delta.tono === "baja" ? "text-[#8A3F00]" : "text-slate-600";
  const flecha = k.delta.tono === "sube" ? "▲" : k.delta.tono === "baja" ? "▼" : "=";
  return (
    <span className={`text-xs font-bold ${color}`}>
      {flecha} {k.delta.texto}
    </span>
  );
}

export default function GraficoMetricas({ kpis, dias }: { kpis: Kpi[]; dias: number }) {
  const conSerie = kpis.filter((k) => k.serie);
  // Arranca en la primera métrica que tenga algo para dibujar.
  const conDatos = conSerie.filter((k) => k.serie!.actual.some((v) => v > 0) || k.serie!.anterior?.some((v) => v > 0));
  const [elegida, setElegida] = useState<IdKpi | null>((conDatos[0] ?? conSerie[0])?.id ?? null);
  const [punto, setPunto] = useState<number | null>(null);
  const k = conSerie.find((x) => x.id === elegida) ?? conSerie[0] ?? null;
  const serie = k?.serie ?? null;
  const n = serie?.actual.length ?? 0;
  const tope = serie ? topeEje(Math.max(...serie.actual, ...(serie.anterior ?? []))) : 3;
  const etiquetasX = n > 1 ? [0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round(((n - 1) * 3) / 4), n - 1] : [0];
  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);

  function mover(e: PointerEvent<HTMLDivElement>) {
    if (!n) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setPunto(Math.round(p * (n - 1)));
  }

  return (
    <section aria-label="Métricas principales" className="overflow-hidden rounded-2xl border border-[#E4E6EA] bg-white">
      <div role="tablist" aria-label="Elegí la métrica del gráfico" className="grid grid-cols-2 border-b border-[#E4E6EA] sm:grid-cols-3">
        {kpis.map((m) => {
          const activa = m.id === k?.id;
          const contenido = (
            <>
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activa ? "bg-[#A9C5E6] text-[#123A63]" : "bg-[#EEF4FB] text-[#4F7AA8]"}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICONOS[m.id]} />
                  </svg>
                </span>
                <span className="text-xs font-semibold leading-tight text-slate-600">{m.label}</span>
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">{m.valor ?? "—"}</span>
              {m.valor === null ? <span className="text-[11px] leading-snug text-slate-500">{m.falta}</span> : <DeltaChip k={m} />}
            </>
          );
          const clases = `flex min-h-[112px] flex-col items-start gap-1.5 border-b-[3px] px-4 pb-3 pt-4 text-left ${
            activa ? "border-[#8AAFD6] bg-[#F4F8FC]" : "border-transparent bg-white"
          }`;
          return m.serie ? (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => {
                setElegida(m.id);
                setPunto(null);
              }}
              className={`${clases} cursor-pointer hover:bg-[#F4F7FB]`}
            >
              {contenido}
            </button>
          ) : (
            <div key={m.id} className={clases} title={m.nota}>
              {contenido}
            </div>
          );
        })}
      </div>

      {k && serie && conDatos.length > 0 ? (
        <div className="flex flex-col gap-3 px-4 pb-5 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-slate-900">{TITULOS[k.id]}</span>
              {k.nota && <span className="text-xs text-slate-500">{k.nota}</span>}
            </div>
            <div className="flex gap-4 text-xs text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-[18px] rounded bg-[#6F9BCF]" />
                Últimos {dias} días
              </span>
              {serie.anterior && (
                <span className="flex items-center gap-1.5">
                  <span className="w-[18px] border-t-2 border-dashed border-[#B8BEC8]" />
                  {dias} días anteriores
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="flex h-[220px] min-w-[36px] flex-col justify-between text-right text-[11px] text-slate-500">
              {[tope, (tope * 2) / 3, tope / 3, 0].map((v) => (
                <span key={v} className="leading-none">
                  {miles(v)}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="relative h-[220px] touch-none"
                onPointerMove={mover}
                onPointerDown={mover}
                onPointerLeave={() => setPunto(null)}
              >
                <svg
                  role="img"
                  aria-label={`${TITULOS[k.id]}: últimos ${dias} días${serie.anterior ? " contra los anteriores" : ""}`}
                  width="100%"
                  height="220"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  className="block overflow-visible"
                >
                  {[0, H / 3, (2 * H) / 3].map((y) => (
                    <line key={y} x1="0" y1={y + 0.5} x2={W} y2={y + 0.5} stroke="#EEF0F3" vectorEffect="non-scaling-stroke" />
                  ))}
                  <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#D6D9DE" vectorEffect="non-scaling-stroke" />
                  <path d={camino(serie.actual, tope, true)} fill="#6F9BCF" fillOpacity="0.08" />
                  {serie.anterior && (
                    <path
                      d={camino(serie.anterior, tope, false)}
                      fill="none"
                      stroke="#B8BEC8"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <path
                    d={camino(serie.actual, tope, false)}
                    fill="none"
                    stroke="#6F9BCF"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {punto !== null && (
                    <line
                      x1={(xPct(punto) / 100) * W}
                      y1="0"
                      x2={(xPct(punto) / 100) * W}
                      y2={H}
                      stroke="#6F9BCF"
                      strokeOpacity="0.35"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
                {punto !== null && (
                  <div
                    className="pointer-events-none absolute top-1 z-10 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow"
                    style={{
                      left: `${xPct(punto)}%`,
                      transform: `translateX(${xPct(punto) > 70 ? "-105%" : "5%"})`,
                    }}
                  >
                    <div className="font-semibold">{fechaCorta(serie.fechas[punto])}</div>
                    <div>
                      {miles(serie.actual[punto])}
                      {serie.anterior && <span className="text-slate-300"> · antes: {miles(serie.anterior[punto])}</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative mt-2 h-4 text-[11px] text-slate-500">
                {etiquetasX.map((i, j) => (
                  <span
                    key={`${i}-${j}`}
                    className="absolute top-0 whitespace-nowrap"
                    style={{
                      left: `${xPct(i)}%`,
                      transform: j === 0 ? "none" : j === etiquetasX.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                    }}
                  >
                    {fechaCorta(serie.fechas[i])}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-slate-600">
          El gráfico aparece cuando haya toques al cartel o datos de tu Google en este período.
        </p>
      )}
    </section>
  );
}
