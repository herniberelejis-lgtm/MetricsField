import { useState } from "react";
import { ESTADOS, PLANES, RUBROS, ZONAS } from "../constants.js";
import GooglePlaceIdField from "./GooglePlaceIdField.jsx";

const DEFAULTS = {
  nombre: "",
  rubro: RUBROS[0],
  zona: ZONAS[0],
  plan: "Base",
  estado: "prospecto",
  contacto: "",
  emailNotificaciones: "",
  fee: "35000",
  googleReviewUrl: "",
  googlePlaceId: "",
  tonoMarca: "cercano",
  busquedaClave: "",
};

export default function ClienteForm({ cliente, onSubmit, loading, error, submitLabel }) {
  const [form, setForm] = useState(() => ({
    ...DEFAULTS,
    ...(cliente
      ? {
          nombre: cliente.nombre ?? "",
          rubro: cliente.rubro ?? RUBROS[0],
          zona: cliente.zona ?? ZONAS[0],
          plan: cliente.plan ?? "Base",
          estado: cliente.estado ?? "prospecto",
          contacto: cliente.contacto ?? "",
          emailNotificaciones: cliente.emailNotificaciones ?? "",
          fee: String(cliente.fee ?? 35000),
          googleReviewUrl: cliente.googleReviewUrl ?? "",
          googlePlaceId: cliente.googlePlaceId ?? "",
          tonoMarca: cliente.tonoMarca ?? "cercano",
          busquedaClave: cliente.busquedaClave ?? "",
        }
      : {}),
  }));

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({
      ...form,
      fee: Number(form.fee) || 0,
    });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <label>
        Nombre del negocio
        <input
          required
          value={form.nombre}
          onChange={(e) => setField("nombre", e.target.value)}
        />
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

      <div className="form-row">
        <label>
          Plan
          <select value={form.plan} onChange={(e) => setField("plan", e.target.value)}>
            {PLANES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={form.estado} onChange={(e) => setField("estado", e.target.value)}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Contacto (WhatsApp / email)
        <input value={form.contacto} onChange={(e) => setField("contacto", e.target.value)} />
      </label>

      <label>
        Email de notificaciones
        <input
          type="email"
          value={form.emailNotificaciones}
          onChange={(e) => setField("emailNotificaciones", e.target.value)}
        />
      </label>

      <label>
        Fee mensual (ARS)
        <input
          type="number"
          value={form.fee}
          onChange={(e) => setField("fee", e.target.value)}
        />
      </label>

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
        <GooglePlaceIdField
          value={form.googlePlaceId}
          onChange={(v) => setField("googlePlaceId", v)}
        />
      </label>

      <label>
        Tono de marca
        <select value={form.tonoMarca} onChange={(e) => setField("tonoMarca", e.target.value)}>
          <option value="cercano">Cercano</option>
          <option value="formal">Formal</option>
        </select>
      </label>

      <label>
        Búsqueda clave (GEO)
        <input
          value={form.busquedaClave}
          onChange={(e) => setField("busquedaClave", e.target.value)}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
