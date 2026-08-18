import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { crearLinkCliente, eliminarLinkCliente, getCliente } from "../api.js";
import { fmtNum } from "../constants.js";

const DESTINOS = [
  { value: "resena", label: "Reseña de Google" },
  { value: "menu", label: "Menú / catálogo" },
  { value: "instagram", label: "Instagram" },
  { value: "promo", label: "Promoción" },
  { value: "url_custom", label: "Otra URL" },
];

export default function ClienteLinks() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [tipo, setTipo] = useState("nfc");
  const [destino, setDestino] = useState("resena");
  const [urlDestino, setUrlDestino] = useState("");

  async function cargar() {
    const d = await getCliente(id);
    setCliente(d.cliente);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [id]);

  async function onCrear(e) {
    e.preventDefault();
    setError("");
    try {
      await crearLinkCliente(id, {
        etiqueta,
        tipo,
        destino,
        urlDestino: destino === "resena" ? null : urlDestino,
      });
      setEtiqueta("");
      setUrlDestino("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onEliminar(linkId, label) {
    if (!confirm(`¿Eliminar el link "${label}"?`)) return;
    setError("");
    try {
      await eliminarLinkCliente(id, linkId);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!cliente) return <p className="muted">Cargando…</p>;

  const links = cliente.links ?? [];
  const totalTaps = links.reduce((a, l) => a + l.taps, 0);
  const tapsPorDia = cliente.tapsPorDia ?? [];
  const maxTaps = Math.max(1, ...tapsPorDia.map((d) => d.taps));

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← {cliente.nombre}</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>Links NFC / QR</h1>
          <p className="muted">
            {fmtNum(totalTaps)} taps en {links.length} link{links.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap card" style={{ marginBottom: "1.5rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Etiqueta</th>
              <th>Tipo</th>
              <th>Destino</th>
              <th>Taps</th>
              <th>URL pública</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td>{l.etiqueta}</td>
                <td>{l.tipo}</td>
                <td>{l.destino}</td>
                <td>{fmtNum(l.taps)}</td>
                <td>
                  <a href={`/t/${l.id}`} target="_blank" rel="noreferrer" className="link small">
                    /t/{l.id}
                  </a>
                </td>
                <td>
                  <button type="button" className="btn-sm ghost" onClick={() => onEliminar(l.id, l.etiqueta)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tapsPorDia.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p className="section-label">Taps últimos 14 días</p>
          {tapsPorDia.map((d) => (
            <div key={d.fecha} className="bar-row">
              <span className="bar-label">{d.fecha.slice(5).replace("-", "/")}</span>
              <div className="bar-track">
                <div className="bar-fill pos" style={{ width: `${(d.taps / maxTaps) * 100}%` }} />
              </div>
              <span className="bar-num">{d.taps}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="section-label">Nuevo link</p>
        <form className="form" onSubmit={onCrear}>
          <label>
            Etiqueta
            <input required value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="nfc">NFC</option>
                <option value="qr">QR</option>
                <option value="ambos">NFC + QR</option>
              </select>
            </label>
            <label>
              Destino
              <select value={destino} onChange={(e) => setDestino(e.target.value)}>
                {DESTINOS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {destino !== "resena" && (
            <label>
              URL de destino
              <input
                required
                type="url"
                value={urlDestino}
                onChange={(e) => setUrlDestino(e.target.value)}
              />
            </label>
          )}
          <button type="submit">Crear link</button>
        </form>
      </div>
    </div>
  );
}
