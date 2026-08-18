import { useEffect, useState } from "react";
import { getActividad } from "../api.js";

const ETIQUETAS_ACCION = {
  login: "Inició sesión",
  crear_cliente: "Creó cliente",
  editar_cliente: "Editó cliente",
  eliminar_cliente: "Eliminó cliente",
  desconectar_google_cliente: "Desconectó Google de un cliente",
  regenerar_codigo_portal: "Regeneró el código de portal",
  eliminar_link: "Eliminó un link NFC",
  eliminar_competidor: "Eliminó un competidor",
  eliminar_prospecto: "Eliminó un prospecto",
  agregar_admin: "Agregó un administrador",
  eliminar_admin: "Quitó un administrador",
  generar_lote_piezas: "Generó lote de piezas",
  asignar_pieza_hardware: "Asignó pieza de hardware",
  sync_google_cliente: "Sincronizó Google de un cliente",
  crear_sucursal: "Creó sucursal",
};

export default function Actividad() {
  const [entradas, setEntradas] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActividad()
      .then((data) => setEntradas(data.entradas))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Actividad</h1>
          <p className="muted">Registro de lo que se hizo en el panel — últimas 200 acciones.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id}>
                  <td className="muted small nowrap">
                    {new Date(e.creadoEn).toLocaleString("es-AR")}
                  </td>
                  <td>{e.adminEmail || <span className="muted">equipo (sin identificar)</span>}</td>
                  <td>{ETIQUETAS_ACCION[e.accion] ?? e.accion}</td>
                  <td className="muted">{e.detalle || "—"}</td>
                </tr>
              ))}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted center">
                    Todavía no hay actividad registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
