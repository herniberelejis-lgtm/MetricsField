import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  desconectarGoogleCliente,
  eliminarCliente,
  getCliente,
  regenerarCodigoCliente,
  syncGoogleCliente,
} from "../api.js";
import { fmtARS, fmtNum } from "../constants.js";

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [confirmarNombre, setConfirmarNombre] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [mostrarBorrar, setMostrarBorrar] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function cargar() {
    const d = await getCliente(id);
    setCliente(d.cliente);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [id]);

  async function onEliminar(e) {
    e.preventDefault();
    setBorrando(true);
    setError("");
    try {
      await eliminarCliente(id, confirmarNombre);
      navigate("/admin/clientes");
    } catch (err) {
      setError(err.message);
    } finally {
      setBorrando(false);
    }
  }

  async function onSyncGoogle() {
    setSyncing(true);
    setError("");
    try {
      const d = await syncGoogleCliente(id);
      setCliente(d.cliente);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function onDesconectarGoogle() {
    if (!confirm("¿Desconectar Google Business Profile de este comercio?")) return;
    setError("");
    try {
      await desconectarGoogleCliente(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onRegenerarCodigo() {
    if (!confirm("¿Regenerar el código del portal? El link anterior deja de funcionar.")) return;
    setError("");
    try {
      const d = await regenerarCodigoCliente(id);
      setCliente(d.cliente);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !cliente) return <p className="error">{error}</p>;
  if (!cliente) return <p className="muted">Cargando cliente…</p>;

  const m = cliente.metricaActual;
  const esCuenta = !cliente.comercioPadreId;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/admin/clientes">← Clientes</Link>
      </p>

      <header className="page-header">
        <div>
          <h1>{cliente.nombre}</h1>
          <p className="muted">
            {cliente.rubro} · {cliente.zona} · {cliente.plan} · {cliente.estado}
          </p>
        </div>
        <div className="page-actions">
          <Link to={`/admin/clientes/${id}/editar`} className="btn-primary">
            Editar
          </Link>
        </div>
      </header>

      <nav className="sub-nav">
        <Link to={`/admin/clientes/${id}/crm`}>CRM reseñas</Link>
        <Link to={`/admin/clientes/${id}/metricas`}>Métricas del mes</Link>
        <Link to={`/admin/clientes/${id}/links`}>Links NFC</Link>
        <Link to={`/admin/clientes/${id}/competencia`}>Competencia</Link>
        {esCuenta && <Link to={`/admin/clientes/${id}/sucursales/nueva`}>+ Sucursal</Link>}
        <a href={cliente.portalUrl} target="_blank" rel="noreferrer">
          Abrir portal
        </a>
      </nav>

      {error && <p className="error">{error}</p>}

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Fee mensual</span>
          <span className="kpi-value">{fmtARS(cliente.fee)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Reseñas totales</span>
          <span className="kpi-value">{m ? fmtNum(m.resenasTotal) : fmtNum(cliente.resenasGoogle ?? 0)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Visitas al perfil</span>
          <span className="kpi-value">{m ? fmtNum(m.visitasPerfil) : "—"}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Rating</span>
          <span className="kpi-value">
            {m
              ? `${m.ratingPromedio.toFixed(1)}★`
              : cliente.ratingGoogle != null
                ? `${cliente.ratingGoogle.toFixed(1)}★`
                : "—"}
          </span>
        </div>
      </div>

      <div className="card stack">
        <p>
          <strong>Contacto:</strong> {cliente.contacto || "—"}
        </p>
        <p>
          <strong>Email notificaciones:</strong> {cliente.emailNotificaciones || "—"}
        </p>
        {esCuenta && (
          <p>
            <strong>Código portal:</strong> <code>{cliente.codigoAcceso}</code>{" "}
            <button type="button" className="btn-sm ghost" onClick={onRegenerarCodigo}>
              Regenerar
            </button>
          </p>
        )}
        <p>
          <strong>Google conectado:</strong> {cliente.googleConectadoEn ? "Sí" : "No"}
          {cliente.googleConectadoEn && (
            <button type="button" className="btn-sm ghost" onClick={onDesconectarGoogle}>
              Desconectar
            </button>
          )}
        </p>
        <p>
          <strong>Place ID:</strong> {cliente.googlePlaceId || "—"}
        </p>
        {cliente.googlePlaceId && (
          <div className="sync-row">
            <span>
              {cliente.googleSyncEn
                ? `Última sync: ${new Date(cliente.googleSyncEn).toLocaleString("es-AR")}`
                : "Todavía no se sincronizó con Places API."}
            </span>
            <button type="button" className="btn-sm" onClick={onSyncGoogle} disabled={syncing}>
              {syncing ? "Sincronizando…" : "Sincronizar ahora"}
            </button>
          </div>
        )}
        <p>
          <strong>Link reseña Google:</strong>{" "}
          {cliente.googleReviewUrl ? (
            <a href={cliente.googleReviewUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
          ) : (
            "—"
          )}
        </p>
        <p>
          <strong>Búsqueda clave:</strong> {cliente.busquedaClave || "—"}
        </p>
      </div>

      {esCuenta && (cliente.sucursales?.length ?? 0) > 0 && (
        <div className="card">
          <p className="section-label">Sucursales ({cliente.sucursales.length})</p>
          <ul className="simple-list">
            {cliente.sucursales.map((s) => (
              <li key={s.id}>
                <Link to={`/admin/clientes/${s.id}`}>{s.nombre}</Link>
                <span className="muted small">
                  {" "}
                  · {s.zona}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="danger-zone card">
        <p className="section-label">Zona peligrosa</p>
        {!mostrarBorrar ? (
          <button type="button" className="btn-danger ghost" onClick={() => setMostrarBorrar(true)}>
            Eliminar cliente…
          </button>
        ) : (
          <form className="form" onSubmit={onEliminar}>
            <p className="muted">
              Esto borra el cliente y sus datos. Para confirmar, escribí exactamente:{" "}
              <strong>{cliente.nombre}</strong>
            </p>
            <label>
              Nombre del negocio
              <input
                value={confirmarNombre}
                onChange={(e) => setConfirmarNombre(e.target.value)}
                placeholder={cliente.nombre}
                autoComplete="off"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setMostrarBorrar(false);
                  setConfirmarNombre("");
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-danger"
                disabled={borrando || confirmarNombre.trim() !== cliente.nombre.trim()}
              >
                {borrando ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
