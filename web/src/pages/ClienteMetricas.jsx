import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { eliminarMetricaCliente, getCliente, guardarMetricaCliente } from "../api.js";
import { citasIA, fmtMes, fmtNum } from "../constants.js";

export default function ClienteMetricas() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const esPremium = cliente?.plan === "Premium";
  const ultima = cliente?.historico?.[cliente.historico.length - 1];
  const mesSugerido = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState({
    mes: mesSugerido,
    resenasNuevas: "",
    resenasTotal: "",
    ratingPromedio: "",
    visitasPerfil: "",
    llamadas: "",
    clicsComoLlegar: "",
    citasChatGPT: "0",
    citasCopilot: "0",
    citasPerplexity: "0",
  });

  async function cargar() {
    const d = await getCliente(id);
    setCliente(d.cliente);
    const u = d.cliente.historico?.[d.cliente.historico.length - 1];
    setForm((f) => ({
      ...f,
      resenasTotal: u ? String(u.resenasTotal) : "",
      ratingPromedio: u ? String(u.ratingPromedio) : "",
    }));
  }

  useEffect(() => {
    cargar()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const body = {
        mes: form.mes,
        resenasNuevas: Number(form.resenasNuevas),
        resenasTotal: Number(form.resenasTotal),
        ratingPromedio: Number(form.ratingPromedio),
        visitasPerfil: Number(form.visitasPerfil),
        llamadas: Number(form.llamadas),
        clicsComoLlegar: Number(form.clicsComoLlegar),
      };
      if (esPremium) {
        body.citasChatGPT = Number(form.citasChatGPT);
        body.citasCopilot = Number(form.citasCopilot);
        body.citasPerplexity = Number(form.citasPerplexity);
      }
      await guardarMetricaCliente(id, body);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function onEliminar(mes) {
    if (!confirm(`¿Eliminar las métricas de ${fmtMes(mes)}?`)) return;
    setError("");
    try {
      await eliminarMetricaCliente(id, mes);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (!cliente) return <p className="error">Cliente no encontrado</p>;

  return (
    <div className="metricas-page">
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← {cliente.nombre}</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>Métricas del mes</h1>
          <p className="muted">Si el mes ya existe, se reemplaza.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <form className="card form" onSubmit={onSubmit}>
        <label>
          Mes
          <input
            type="month"
            required
            value={form.mes}
            onChange={(e) => setField("mes", e.target.value)}
          />
        </label>

        <div className="form-row">
          <label>
            Reseñas nuevas
            <input
              type="number"
              min={0}
              required
              value={form.resenasNuevas}
              onChange={(e) => setField("resenasNuevas", e.target.value)}
            />
          </label>
          <label>
            Reseñas totales
            <input
              type="number"
              min={0}
              required
              value={form.resenasTotal}
              onChange={(e) => setField("resenasTotal", e.target.value)}
            />
          </label>
        </div>

        <label>
          Rating promedio (1.0 – 5.0)
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            required
            value={form.ratingPromedio}
            onChange={(e) => setField("ratingPromedio", e.target.value)}
          />
        </label>

        <div className="form-row">
          <label>
            Visitas al perfil
            <input
              type="number"
              min={0}
              required
              value={form.visitasPerfil}
              onChange={(e) => setField("visitasPerfil", e.target.value)}
            />
          </label>
          <label>
            Llamadas
            <input
              type="number"
              min={0}
              required
              value={form.llamadas}
              onChange={(e) => setField("llamadas", e.target.value)}
            />
          </label>
          <label>
            Clics cómo llegar
            <input
              type="number"
              min={0}
              required
              value={form.clicsComoLlegar}
              onChange={(e) => setField("clicsComoLlegar", e.target.value)}
            />
          </label>
        </div>

        {esPremium && (
          <div className="card premium-box">
            <p className="section-label">Citaciones en IA (Premium)</p>
            <div className="form-row">
              <label>
                ChatGPT
                <input
                  type="number"
                  min={0}
                  value={form.citasChatGPT}
                  onChange={(e) => setField("citasChatGPT", e.target.value)}
                />
              </label>
              <label>
                Copilot
                <input
                  type="number"
                  min={0}
                  value={form.citasCopilot}
                  onChange={(e) => setField("citasCopilot", e.target.value)}
                />
              </label>
              <label>
                Perplexity
                <input
                  type="number"
                  min={0}
                  value={form.citasPerplexity}
                  onChange={(e) => setField("citasPerplexity", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar métricas"}
        </button>
      </form>

      {cliente.historico?.length > 0 && (
        <>
          <h2 className="section-title">Meses cargados</h2>
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Reseñas</th>
                  <th>Rating</th>
                  {esPremium && <th>Citas IA</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...cliente.historico].reverse().map((h) => (
                  <tr key={h.mes}>
                    <td>{fmtMes(h.mes)}</td>
                    <td>
                      +{fmtNum(h.resenasNuevas)} ({fmtNum(h.resenasTotal)})
                    </td>
                    <td>{h.ratingPromedio.toFixed(1)}</td>
                    {esPremium && <td>{fmtNum(citasIA(h))}</td>}
                    <td>
                      <button type="button" className="btn-sm ghost danger-text" onClick={() => onEliminar(h.mes)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
