import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { crearSucursal } from "../api.js";
import GooglePlaceIdField from "../components/GooglePlaceIdField.jsx";
import { RUBROS, ZONAS } from "../constants.js";

export default function NuevaSucursal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    rubro: RUBROS[0],
    zona: ZONAS[0],
    googlePlaceId: "",
    googleReviewUrl: "",
    busquedaClave: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const d = await crearSucursal(id, form);
      navigate(`/admin/clientes/${d.sucursal.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← Volver a la cuenta</Link>
      </p>
      <header className="page-header">
        <h1>Nueva sucursal</h1>
      </header>
      <form className="card form" onSubmit={onSubmit}>
        {error && <p className="error">{error}</p>}
        <label>
          Nombre del local
          <input required value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Rubro
            <select value={form.rubro} onChange={(e) => setField("rubro", e.target.value)}>
              {RUBROS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zona
            <select value={form.zona} onChange={(e) => setField("zona", e.target.value)}>
              {ZONAS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Link de reseña Google
          <input
            type="url"
            value={form.googleReviewUrl}
            onChange={(e) => setField("googleReviewUrl", e.target.value)}
          />
        </label>
        <label>
          Google Place ID
          <GooglePlaceIdField value={form.googlePlaceId} onChange={(v) => setField("googlePlaceId", v)} />
        </label>
        <label>
          Búsqueda clave (GEO)
          <input value={form.busquedaClave} onChange={(e) => setField("busquedaClave", e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear sucursal"}
        </button>
      </form>
    </div>
  );
}
