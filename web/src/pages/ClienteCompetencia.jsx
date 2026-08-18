import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  crearCompetidorCliente,
  eliminarCompetidorCliente,
  getCliente,
  syncCompetidorCliente,
} from "../api.js";
import GooglePlaceIdField from "../components/GooglePlaceIdField.jsx";
import { fmtNum } from "../constants.js";

export default function ClienteCompetencia() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [placeId, setPlaceId] = useState("");

  async function cargar() {
    const d = await getCliente(id);
    setCliente(d.cliente);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [id]);

  async function onAgregar(e) {
    e.preventDefault();
    setError("");
    try {
      await crearCompetidorCliente(id, { nombre, googlePlaceId: placeId || null });
      setNombre("");
      setPlaceId("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSync(compId) {
    setError("");
    try {
      const d = await syncCompetidorCliente(id, compId);
      setCliente((c) => ({ ...c, competidores: d.competidores }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onEliminar(compId, nom) {
    if (!confirm(`¿Eliminar a ${nom} de la lista?`)) return;
    setError("");
    try {
      await eliminarCompetidorCliente(id, compId);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!cliente) return <p className="muted">Cargando…</p>;

  const miRating = cliente.metricaActual?.ratingPromedio ?? cliente.ratingGoogle;
  const miTotal = cliente.metricaActual?.resenasTotal ?? cliente.resenasGoogle;

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← {cliente.nombre}</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>Competencia</h1>
          <p className="muted">Rating y reseñas vs. locales de la zona</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap card" style={{ marginBottom: "1.5rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Rating</th>
              <th>Reseñas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr className="row-highlight">
              <td>{cliente.nombre} (vos)</td>
              <td>{miRating != null ? `${Number(miRating).toFixed(1)}★` : "—"}</td>
              <td>{miTotal != null ? fmtNum(miTotal) : "—"}</td>
              <td></td>
            </tr>
            {(cliente.competidores ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.rating != null ? `${Number(c.rating).toFixed(1)}★` : "—"}</td>
                <td>{c.totalResenas != null ? fmtNum(c.totalResenas) : "—"}</td>
                <td>
                  {c.googlePlaceId && (
                    <button type="button" className="btn-sm ghost" onClick={() => onSync(c.id)}>
                      Sync
                    </button>
                  )}
                  <button type="button" className="btn-sm ghost" onClick={() => onEliminar(c.id, c.nombre)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <p className="section-label">Agregar competidor</p>
        <form className="form" onSubmit={onAgregar}>
          <label>
            Nombre
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            Google Place ID (opcional)
            <GooglePlaceIdField value={placeId} onChange={setPlaceId} />
          </label>
          <button type="submit">Agregar</button>
        </form>
      </div>
    </div>
  );
}
