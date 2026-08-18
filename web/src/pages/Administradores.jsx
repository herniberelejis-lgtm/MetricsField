import { useEffect, useState } from "react";
import { api } from "../api.js";

function getAdministradores() {
  return api("/api/admin/administradores");
}

function agregarAdmin(body) {
  return api("/api/admin/administradores", { method: "POST", body: JSON.stringify(body) });
}

function eliminarAdmin(email) {
  return api("/api/admin/administradores", { method: "DELETE", body: JSON.stringify({ email }) });
}

export default function Administradores() {
  const [admins, setAdmins] = useState([]);
  const [emailActual, setEmailActual] = useState(null);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    try {
      const data = await getAdministradores();
      setAdmins(data.admins);
      setEmailActual(data.emailActual);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function onAgregar(e) {
    e.preventDefault();
    setError("");
    try {
      await agregarAdmin({ email, nombre });
      setEmail("");
      setNombre("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onEliminar(adminEmail) {
    if (!confirm(`¿Sacar a ${adminEmail} del panel?`)) return;
    setError("");
    try {
      await eliminarAdmin(adminEmail);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Administradores</h1>
          <p className="muted">Cuentas de Google que pueden entrar al panel.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="card stack" style={{ marginBottom: "1.5rem" }}>
        <p className="muted">
          Solo estas cuentas pueden iniciar sesión con Google. Cualquier otra queda rechazada.
          {emailActual && (
            <>
              {" "}
              Entraste como <strong>{emailActual}</strong>.
            </>
          )}
        </p>
        <form className="form" onSubmit={onAgregar}>
          <div className="form-row">
            <label>
              Email de Google
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Nombre
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
          </div>
          <button type="submit">Agregar</button>
        </form>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email}>
                  <td>{a.email}</td>
                  <td>{a.nombre}</td>
                  <td className="muted small">{new Date(a.creadoEn).toLocaleDateString("es-AR")}</td>
                  <td>
                    {a.email !== emailActual && (
                      <button type="button" className="btn-sm ghost" onClick={() => onEliminar(a.email)}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
