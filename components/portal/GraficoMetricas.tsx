"use client";

import { useState, type PointerEvent } from "react";
import type { IdKpi, Kpi } from "@/lib/tablero";

// Las métricas del período arriba de todo, estilo Google Analytics: cada
// métrica es una pestaña y el gráfico de abajo muestra la elegida, día por
// día, contra el período anterior (línea punteada). Pasando el dedo o el
// mouse por el gráfico se ve el número de cada día.

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
  // Sin período anterior con qué comparar: un guion gris, nunca un "+100%".
  if (!k.delta) return <span className="text-xs text-slate-600">{k.valor === null ? "" : "—"}</span>;
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
              <span className={`text-[13px] leading-tight ${activa ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}>
                {m.label}
              </span>
              <span className={`text-[26px] leading-tight tracking-tight text-slate-900 ${activa ? "font-semibold" : "font-medium"}`}>
                {m.valor ?? "—"}
              </span>
              {m.valor === null ? <span className="text-[11px] leading-snug text-slate-600">{m.falta}</span> : <DeltaChip k={m} />}
            </>
          );
          // La pestaña elegida se marca con una línea de 2px, sin fondo de color.
          const clases = `flex min-h-[100px] flex-col items-start gap-1 border-b-2 px-4 pb-3 pt-4 text-left ${
            activa ? "border-[#6F9BCF]" : "border-transparent"
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
              className={`${clases} cursor-pointer bg-white hover:bg-[#F7F9FC] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4F7AA8]`}
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
              {k.nota && <span className="text-xs text-slate-600">{k.nota}</span>}
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
            <div className="flex h-[220px] min-w-[36px] flex-col justify-between text-right text-[11px] text-slate-600">
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
                    strokeWidth="2"
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
              <div className="relative mt-2 h-4 text-[11px] text-slate-600">
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
