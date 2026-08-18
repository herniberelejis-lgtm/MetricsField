import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getDashboard } from "../api.js";
import { fmtARS, fmtNum } from "../constants.js";

const PERIODOS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "Último mes" },
  { key: "anio", label: "Último año" },
  { key: "todo", label: "Todo" },
];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const periodo = params.get("periodo") || "mes";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    getDashboard(periodo)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [periodo]);

  function setPeriodo(key) {
    setParams({ periodo: key });
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Cargando panel…</p>;

  const maxEstrellas = Math.max(...Object.values(data.resenasPorEstrellas), 1);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Panel</h1>
          <p className="muted">Métricas clave de la cartera</p>
        </div>
        <div className="periodo-tabs">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={p.key === periodo ? "tab active" : "tab"}
              onClick={() => setPeriodo(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">MRR</span>
          <span className="kpi-value">{fmtARS(data.kpis.mrr)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Clientes activos</span>
          <span className="kpi-value">{fmtNum(data.kpis.clientesActivos)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Reseñas</span>
          <span className="kpi-value">{fmtNum(data.kpis.resenasTotal)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Taps NFC+QR</span>
          <span className="kpi-value">
            {fmtNum(data.kpis.tapsNfc + data.kpis.tapsQr)}
          </span>
        </div>
      </div>

      <h2 className="section-title">Reseñas por estrellas</h2>
      <div className="card">
        {[5, 4, 3, 2, 1].map((n) => {
          const cantidad = data.resenasPorEstrellas[n] ?? 0;
          return (
            <div key={n} className="bar-row">
              <span className="bar-label">{n}★</span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${n <= 3 ? "neg" : "pos"}`}
                  style={{
                    width: cantidad ? `${Math.max(4, (cantidad / maxEstrellas) * 100)}%` : "0%",
                  }}
                />
              </div>
              <span className="bar-num">{cantidad}</span>
            </div>
          );
        })}
      </div>

      <h2 className="section-title">Detalle por cliente</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Negocio</th>
            <th>Plan</th>
            <th>Estado</th>
            <th>Rating</th>
            <th>Vistas</th>
          </tr>
        </thead>
        <tbody>
          {data.clientes.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/admin/clientes/${c.id}`} className="link">
                  {c.nombre}
                </Link>
                <div className="muted small">
                  {c.rubro} · {c.zona}
                </div>
              </td>
              <td>{c.plan}</td>
              <td>{c.estado}</td>
              <td>{c.rating != null ? `${c.rating.toFixed(1)}★` : "—"}</td>
              <td>{c.estado === "activo" ? fmtNum(c.visitasPerfil) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
