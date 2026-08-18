import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { crearCliente } from "../api.js";
import ClienteForm from "../components/ClienteForm.jsx";

export default function NuevoCliente() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(body) {
    setError("");
    setLoading(true);
    try {
      const { cliente } = await crearCliente(body);
      navigate(`/admin/clientes/${cliente.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page">
      <p className="breadcrumb">
        <Link to="/admin/clientes">← Clientes</Link>
      </p>
      <h1>Nuevo cliente</h1>
      <p className="muted">El código del portal se genera automáticamente.</p>

      <ClienteForm
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        submitLabel="Crear cliente"
      />
    </div>
  );
}
