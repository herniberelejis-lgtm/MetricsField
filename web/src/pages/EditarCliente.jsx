import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { actualizarCliente, getCliente } from "../api.js";
import ClienteForm from "../components/ClienteForm.jsx";

export default function EditarCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCliente(id)
      .then((d) => setCliente(d.cliente))
      .catch((e) => setError(e.message));
  }, [id]);

  async function onSubmit(body) {
    setError("");
    setLoading(true);
    try {
      await actualizarCliente(id, body);
      navigate(`/admin/clientes/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!cliente && !error) return <p className="muted">Cargando cliente…</p>;

  return (
    <div className="form-page">
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← {cliente?.nombre ?? "Cliente"}</Link>
      </p>
      <h1>Editar cliente</h1>

      {cliente && (
        <ClienteForm
          cliente={cliente}
          onSubmit={onSubmit}
          loading={loading}
          error={error}
          submitLabel="Guardar cambios"
        />
      )}
      {!cliente && error && <p className="error">{error}</p>}
    </div>
  );
}
