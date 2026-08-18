import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  asignarPiezaHardware,
  generarLoteHardware,
  getHardware,
} from "../api.js";
import { fmtNum } from "../constants.js";

const TIPOS = [
  { value: "nfc", label: "Chip NFC" },
  { value: "qr", label: "QR impreso" },
  { value: "ambos", label: "NFC + QR (mismo standee)" },
];

const LABEL_TIPO = {
  nfc: "NFC",
  qr: "QR",
  ambos: "NFC + QR",
};

export default function Hardware() {
  const [inventario, setInventario] = useState([]);
  const [comercios, setComercios] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [asignando, setAsignando] = useState(null);
  const [loteForm, setLoteForm] = useState({
    cantidad: "200",
    tipo: "ambos",
    lote: "",
  });
  const [asignarForms, setAsignarForms] = useState({});

  async function cargar() {
    setLoading(true);
    try {
      const data = await getHardware();
      setInventario(data.inventario);
      setComercios(data.comercios);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const libres = inventario.filter((p) => !p.comercioId && !p.autogestionado);
  const autogestionadas = inventario.filter((p) => !p.comercioId && p.autogestionado);
  const asignadas = inventario.filter((p) => p.comercioId);
  const lotes = [...new Set(inventario.map((p) => p.lote).filter(Boolean))];

  function getAsignarForm(id) {
    return asignarForms[id] ?? { comercioId: "", etiqueta: "" };
  }

  function setAsignarField(id, key, value) {
    setAsignarForms((prev) => ({
      ...prev,
      [id]: { ...getAsignarForm(id), [key]: value },
    }));
  }

  async function onGenerarLote(e) {
    e.preventDefault();
    setGenerando(true);
    setError("");
    try {
      await generarLoteHardware({
        cantidad: Number(loteForm.cantidad) || 1,
        tipo: loteForm.tipo,
        lote: loteForm.lote.trim() || undefined,
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function onAsignar(piezaId) {
    const form = getAsignarForm(piezaId);
    if (!form.comercioId || !form.etiqueta.trim()) {
      setError("Elegí cliente y etiqueta antes de asignar.");
      return;
    }

    setAsignando(piezaId);
    setError("");
    try {
      await asignarPiezaHardware({
        id: piezaId,
        comercioId: form.comercioId,
        etiqueta: form.etiqueta.trim(),
        destino: "resena",
      });
      setAsignarForms((prev) => {
        const next = { ...prev };
        delete next[piezaId];
        return next;
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setAsignando(null);
    }
  }

  if (loading && inventario.length === 0) {
    return <p className="muted">Cargando inventario…</p>;
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Hardware</h1>
          <p className="muted">
            {inventario.length} piezas generadas · {libres.length} libres ·{" "}
            {autogestionadas.length} autogestionadas · {asignadas.length} asignadas
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <p className="section-label">Generar lote nuevo</p>
        <p className="muted">
          Genera códigos fijos (ej. <code>p-0001</code>) listos para imprimir — sin cliente
          asignado.
        </p>
        <form className="form hardware-lote-form" onSubmit={onGenerarLote}>
          <label>
            Cantidad
            <input
              type="number"
              min={1}
              max={500}
              required
              value={loteForm.cantidad}
              onChange={(e) => setLoteForm((f) => ({ ...f, cantidad: e.target.value }))}
            />
          </label>
          <label>
            Soporte físico
            <select
              value={loteForm.tipo}
              onChange={(e) => setLoteForm((f) => ({ ...f, tipo: e.target.value }))}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lote / pedido
            <input
              placeholder="china-2026-07"
              value={loteForm.lote}
              onChange={(e) => setLoteForm((f) => ({ ...f, lote: e.target.value }))}
            />
          </label>
          <div className="form-actions-end">
            <button type="submit" disabled={generando}>
              {generando ? "Generando…" : "Generar"}
            </button>
          </div>
        </form>
      </div>

      {libres.length > 0 && (
        <>
          <h2 className="section-title">Piezas libres ({libres.length})</h2>
          <p className="muted">
            Al asignar, el destino arranca en &ldquo;Reseña de Google&rdquo;.
          </p>
          <div className="qr-actions">
            <a href="/api/admin/hardware/qr-lote?estado=libre" className="btn-primary">
              Descargar todos los QR libres (.zip)
            </a>
            {lotes.map((l) => (
              <a
                key={l}
                href={`/api/admin/hardware/qr-lote?estado=libre&lote=${encodeURIComponent(l)}`}
                className="btn-secondary"
              >
                Solo lote &ldquo;{l}&rdquo;
              </a>
            ))}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Asignar a cliente</th>
                </tr>
              </thead>
              <tbody>
                {libres.map((p) => {
                  const form = getAsignarForm(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <code className="mono">{p.id}</code>
                        <div>
                          <a
                            href={`/api/admin/qr?linkId=${encodeURIComponent(p.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="small link"
                          >
                            ver QR
                          </a>
                        </div>
                      </td>
                      <td>{p.lote || "—"}</td>
                      <td>{LABEL_TIPO[p.tipo] ?? p.tipo}</td>
                      <td>
                        <div className="inline-form">
                          <select
                            value={form.comercioId}
                            onChange={(e) => setAsignarField(p.id, "comercioId", e.target.value)}
                          >
                            <option value="">Elegir cliente…</option>
                            {comercios.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="Mesa 4, mozo Juan…"
                            value={form.etiqueta}
                            onChange={(e) => setAsignarField(p.id, "etiqueta", e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-sm"
                            disabled={asignando === p.id}
                            onClick={() => onAsignar(p.id)}
                          >
                            {asignando === p.id ? "…" : "Asignar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {autogestionadas.length > 0 && (
        <>
          <h2 className="section-title">Autogestionadas ({autogestionadas.length})</h2>
          <p className="muted">
            Activadas por el comprador desde <code>/t/&lt;código&gt;</code> — sin cliente en el CRM.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Negocio</th>
                  <th>Destino actual</th>
                  <th>Taps</th>
                </tr>
              </thead>
              <tbody>
                {autogestionadas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code className="mono">{p.id}</code>
                    </td>
                    <td>{p.nombreNegocio || "—"}</td>
                    <td className="truncate">{p.urlDestino ?? "—"}</td>
                    <td>{fmtNum(p.taps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {asignadas.length > 0 && (
        <>
          <h2 className="section-title">Piezas asignadas ({asignadas.length})</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Etiqueta</th>
                  <th>Tipo</th>
                  <th>Taps</th>
                </tr>
              </thead>
              <tbody>
                {asignadas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code className="mono">{p.id}</code>
                    </td>
                    <td>
                      {p.comercioId && (
                        <Link to={`/admin/clientes/${p.comercioId}`}>
                          {p.clienteNombre ?? p.comercioId}
                        </Link>
                      )}
                    </td>
                    <td>{p.etiqueta}</td>
                    <td>{LABEL_TIPO[p.tipo] ?? p.tipo}</td>
                    <td>{fmtNum(p.taps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {inventario.length === 0 && !loading && (
        <div className="card">
          <p className="muted">Todavía no generaste ningún lote — usá el formulario de arriba.</p>
        </div>
      )}
    </div>
  );
}
