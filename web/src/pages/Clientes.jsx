import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClientes } from "../api.js";
import { fmtARS } from "../constants.js";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientes()
      .then((d) => setClientes(d.clientes))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Cargando clientes…</p>;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Clientes</h1>
          <p className="muted">{clientes.length} cuentas en cartera</p>
        </div>
        <Link to="/admin/clientes/nuevo" className="btn-primary">
          + Nuevo cliente
        </Link>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="card-grid">
        {clientes.map((c) => (
          <Link key={c.id} to={`/admin/clientes/${c.id}`} className="client-card">
            <div className="client-card-top">
              <strong>{c.nombre}</strong>
              {c.sucursales > 0 && (
                <span className="badge">{c.sucursales} sucursal(es)</span>
              )}
            </div>
            <div className="muted small">
              {c.rubro} · {c.zona}
            </div>
            <div className="client-card-meta">
              <span>{c.plan}</span>
              <span>{c.estado}</span>
              <span>{fmtARS(c.fee)}</span>
            </div>
          </Link>
        ))}
      </div>

      {clientes.length === 0 && !error && (
        <p className="muted">No hay clientes cargados en la base.</p>
      )}
    </div>
  );
}
