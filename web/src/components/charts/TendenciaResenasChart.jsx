import { useState } from "react";
import { fmtNum } from "../../constants.js";

const COLOR_TOTAL = "#1e293b";
const COLOR_RATING = "#94a3b8";

function niceTicks(max) {
  if (max <= 5) return [0, 1, 2, 3, 4, 5].filter((t) => t <= max);
  const step = max <= 20 ? 5 : max <= 100 ? 20 : Math.ceil(max / 5 / 10) * 10;
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] < max) ticks.push(max);
  return ticks;
}

export default function TendenciaResenasChart({ labels, totales, ratings }) {
  const [hover, setHover] = useState(null);
  const [verTabla, setVerTabla] = useState(false);

  if (!labels?.length) return null;

  const W = 640;
  const H = 220;
  const M = { top: 12, right: 48, bottom: 28, left: 40 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const ticksL = niceTicks(Math.max(...totales, 1));
  const maxL = ticksL[ticksL.length - 1] || 1;
  const maxR = 5;

  const xAt = (i) => M.left + (labels.length > 1 ? (i / (labels.length - 1)) * plotW : plotW / 2);
  const yL = (v) => M.top + plotH - (v / maxL) * plotH;
  const yR = (v) => M.top + plotH - (v / maxR) * plotH;

  const pathTotal = totales.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yL(v)}`).join(" ");
  const pathRating = ratings.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yR(v)}`).join(" ");

  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <div>
          <p className="section-label">Tendencia de reseñas</p>
          <p className="muted small">Total acumulado y rating promedio mes a mes</p>
        </div>
        <button type="button" className="btn-sm ghost" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? "Gráfico" : "Tabla"}
        </button>
      </div>

      <div className="chart-legend">
        <span><i className="legend-line solid" /> Total reseñas</span>
        <span><i className="legend-line dashed" /> Rating</span>
      </div>

      {verTabla ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Total</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l}>
                  <td>{l}</td>
                  <td>{fmtNum(totales[i])}</td>
                  <td>{ratings[i].toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-svg-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="tendencia-chart" role="img" aria-label="Tendencia de reseñas">
            {ticksL.map((t) => (
              <g key={`l${t}`}>
                <line x1={M.left} x2={W - M.right} y1={yL(t)} y2={yL(t)} className="chart-grid" />
                <text x={M.left - 6} y={yL(t) + 4} className="chart-axis" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {[0, 2.5, 5].map((t) => (
              <text key={`r${t}`} x={W - M.right + 6} y={yR(t) + 4} className="chart-axis muted-axis">
                {t}
              </text>
            ))}
            <path d={pathTotal} fill="none" stroke={COLOR_TOTAL} strokeWidth="2.5" />
            <path
              d={pathRating}
              fill="none"
              stroke={COLOR_RATING}
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {labels.map((l, i) => (
              <g key={l}>
                <rect
                  x={xAt(i) - plotW / labels.length / 2}
                  y={M.top}
                  width={plotW / labels.length}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                <text x={xAt(i)} y={H - 6} className="chart-axis" textAnchor="middle">
                  {l}
                </text>
              </g>
            ))}
            {hover != null && (
              <g>
                <line x1={xAt(hover)} x2={xAt(hover)} y1={M.top} y2={M.top + plotH} className="chart-hover-line" />
                <circle cx={xAt(hover)} cy={yL(totales[hover])} r="4" fill={COLOR_TOTAL} />
                <circle cx={xAt(hover)} cy={yR(ratings[hover])} r="4" fill={COLOR_RATING} />
              </g>
            )}
          </svg>
          {hover != null && (
            <div className="chart-tooltip">
              <strong>{labels[hover]}</strong>
              <span>{fmtNum(totales[hover])} reseñas · {ratings[hover].toFixed(1)}★</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
