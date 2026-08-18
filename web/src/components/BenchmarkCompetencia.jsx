import { useState } from "react";
import { fmtMes, fmtNum } from "../constants.js";

export default function BenchmarkCompetencia({ meses, crecimiento }) {
  const [sel, setSel] = useState(0);
  if (!meses?.length) {
    return <p className="muted">Todavía no hay datos de competencia — el equipo los carga desde el panel.</p>;
  }

  const mes = meses[Math.min(sel, meses.length - 1)];
  const fmtRating = (v) => (v === null ? "—" : Number(v).toFixed(1));
  const fmtRes = (v) => (v === null ? "—" : fmtNum(v));
  const fmtPct = (v) => (v === null ? null : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);

  return (
    <div className="card">
      {crecimiento && (crecimiento.propioPct !== null || crecimiento.competenciaPct !== null) && (
        <div className="benchmark-highlight">
          <strong>
            {fmtMes(crecimiento.mes)}: {crecimiento.propio >= 0 ? "creciste" : "bajaste"}{" "}
            {fmtPct(crecimiento.propioPct) ??
              `${crecimiento.propio >= 0 ? "+" : ""}${crecimiento.propio} reseñas`}
          </strong>
          {crecimiento.competenciaPct !== null && (
            <span className="muted"> · tu competencia {fmtPct(crecimiento.competenciaPct)}</span>
          )}
        </div>
      )}

      <div className="benchmark-header">
        <div>
          <p className="section-label">Benchmarking vs competencia</p>
          <p className="muted small">Reseñas y rating al corte de cada mes</p>
        </div>
        {meses.length > 1 && (
          <select value={sel} onChange={(e) => setSel(Number(e.target.value))} className="small">
            {meses.map((m, i) => (
              <option key={m.mes} value={i}>
                {fmtMes(m.mes)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Comercio</th>
              <th>Reseñas</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row-highlight">
              <td><strong>Tu negocio</strong></td>
              <td>{fmtRes(mes.propioResenas)}</td>
              <td>{fmtRating(mes.propioRating)}</td>
            </tr>
            {mes.competidores.map((c) => (
              <tr key={c.nombre}>
                <td>{c.nombre}</td>
                <td>{fmtRes(c.totalResenas)}</td>
                <td>{fmtRating(c.rating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
