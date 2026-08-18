import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  actualizarAutomatizacionPortal,
  actualizarLinkPortal,
  aprobarResenaPortal,
  descartarResenaPortal,
  desconectarGooglePortal,
  getPortal,
  getTapsPorHoraPortal,
} from "../api/portal.js";
import BenchmarkCompetencia from "../components/BenchmarkCompetencia.jsx";
import Sparkline from "../components/charts/Sparkline.jsx";
import TendenciaResenasChart from "../components/charts/TendenciaResenasChart.jsx";
import TapsMiniChart from "../components/charts/TapsMiniChart.jsx";
import { citasIA, deltaKpi, fmtMes, fmtNum } from "../constants.js";

const MENSAJE_GOOGLE = {
  conectado: { texto: "Conectaste tu cuenta de Google. En un rato vas a ver visitas y llamadas acá.", tono: "ok" },
  error: { texto: "No se pudo conectar — probá de nuevo.", tono: "error" },
  cancelado: { texto: "Cancelaste la conexión con Google.", tono: "error" },
  "no-configurado": { texto: "Esta función todavía no está disponible.", tono: "error" },
};

const PANELS_BASE = [
  { id: "resumen", label: "Resumen" },
  { id: "resenas", label: "Reseñas" },
  { id: "sucursales", label: "Sucursales", cond: (d) => d.sucursalesCount > 0 },
  { id: "dispositivos", label: "Dispositivos" },
  { id: "escaneos", label: "Escaneos" },
  { id: "rating", label: "Google" },
  { id: "competidores", label: "Competidores", cond: (d) => (d.benchmark?.length ?? 0) > 0 },
  { id: "mes", label: "Resumen del mes" },
];

export default function Portal() {
  const { codigo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sucursal = searchParams.get("sucursal") || "";
  const google = searchParams.get("google") || "";

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [flashGoogle, setFlashGoogle] = useState(null);

  useEffect(() => {
    if (google && MENSAJE_GOOGLE[google]) {
      setFlashGoogle(MENSAJE_GOOGLE[google]);
      const next = new URLSearchParams(searchParams);
      next.delete("google");
      setSearchParams(next, { replace: true });
    }
  }, [google, searchParams, setSearchParams]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await getPortal(codigo, { sucursal: sucursal || undefined });
      setData(d);
    } catch (e) {
      setError(e.message || "Portal no encontrado");
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursal]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && PANELS_BASE.some((p) => p.id === hash)) setPanel(hash);
  }, []);

  const panelsVisibles = useMemo(() => {
    if (!data) return PANELS_BASE.filter((p) => !p.cond);
    return PANELS_BASE.filter((p) => !p.cond || p.cond(data));
  }, [data]);

  function irPanel(id) {
    setPanel(id);
    window.location.hash = id;
  }

  function cambiarSucursal(id) {
    const next = new URLSearchParams(searchParams);
    if (!id || id === data?.cuenta.id) next.delete("sucursal");
    else next.set("sucursal", id);
    setSearchParams(next);
  }

  if (loading && !data) return <p className="portal-center muted">Cargando portal…</p>;
  if (error) return <p className="portal-center error">{error}</p>;
  if (!data) return null;

  const waHref = data.whatsappNumber
    ? `https://wa.me/${data.whatsappNumber}?text=${encodeURIComponent(`Hola! Te escribo por mi panel de ${data.cuenta.nombre}`)}`
    : null;

  return (
    <div className="portal">
      <aside className="portal-side">
        <div className="portal-brand">
          <strong>MetricsField</strong>
          <span className="muted">{data.cuenta.nombre}</span>
          <span className="badge">{data.cuenta.plan}</span>
        </div>
        <p className="portal-sub muted">
          {data.activo.rubro} · {data.activo.zona}
          {data.sucursalesCount > 0 ? ` · ${data.activo.nombre}` : ""}
        </p>

        {data.ubicaciones.length > 1 && (
          <label className="portal-sucursal">
            <span className="muted small">Local</span>
            <select
              value={data.activo.id}
              onChange={(e) => cambiarSucursal(e.target.value)}
            >
              {data.ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <nav className="portal-nav">
          {panelsVisibles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={panel === p.id ? "portal-nav-btn active" : "portal-nav-btn"}
              onClick={() => irPanel(p.id)}
            >
              {p.label}
              {p.id === "resenas" && data.resenasPendientes > 0 && (
                <span className="nav-badge">{data.resenasPendientes}</span>
              )}
            </button>
          ))}
        </nav>

        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer" className="portal-wa">
            WhatsApp agencia
          </a>
        )}
      </aside>

      <main className="portal-main">
        {flashGoogle && (
          <div className={`portal-flash ${flashGoogle.tono}`}>{flashGoogle.texto}</div>
        )}
        {!flashGoogle && data.mensajeGoogle && (
          <div className={`portal-flash ${data.mensajeGoogle.tono}`}>{data.mensajeGoogle.texto}</div>
        )}

        {panel === "resumen" && <PanelResumen data={data} onNav={irPanel} />}
        {panel === "resenas" && (
          <PanelResenas data={data} codigo={codigo} onReload={cargar} />
        )}
        {panel === "sucursales" && (
          <PanelSucursales data={data} codigo={codigo} onCambiarSucursal={cambiarSucursal} />
        )}
        {panel === "dispositivos" && (
          <PanelDispositivos data={data} codigo={codigo} onReload={cargar} />
        )}
        {panel === "escaneos" && <PanelEscaneos data={data} codigo={codigo} />}
        {panel === "competidores" && (
          <PanelCompetidores benchmark={data.benchmark} crecimiento={data.crecimientoVsCompetencia} />
        )}
        {panel === "mes" && <PanelMes mes={data.mes} />}
        {panel === "rating" && (
          <PanelRating data={data} codigo={codigo} onReload={cargar} />
        )}
      </main>
    </div>
  );
}

function PanelResumen({ data, onNav }) {
  const { hero, metrica: m, prioridades, taps, resenas } = data;
  const historico = data.mes?.historico ?? [];

  return (
    <div>
      <h1 className="portal-h1">Resumen</h1>

      {prioridades.length > 0 && (
        <div className="card stack portal-prioridades">
          <p className="section-label">Prioridades</p>
          {prioridades.map((p) => (
            <button
              key={p.texto}
              type="button"
              className={`prioridad prioridad-${p.tono}`}
              onClick={() => onNav(p.panel)}
            >
              {p.texto}
            </button>
          ))}
        </div>
      )}

      <div className="stat-chips">
        <button type="button" className="stat-chip" onClick={() => onNav("escaneos")}>
          <span className="stat-chip-value">{fmtNum(taps.totalHistorico)}</span>
          <span className="stat-chip-label">Taps del cartel</span>
        </button>
        <button type="button" className="stat-chip" onClick={() => onNav("resenas")}>
          <span className="stat-chip-value">{fmtNum(data.resenasHoy)}</span>
          <span className="stat-chip-label">Reseñas hoy</span>
        </button>
        <button type="button" className="stat-chip" onClick={() => onNav("mes")}>
          <span className="stat-chip-value">{fmtNum(m?.resenasNuevas ?? 0)}</span>
          <span className="stat-chip-label">Reseñas nuevas (mes)</span>
        </button>
        <button type="button" className="stat-chip" onClick={() => onNav("mes")}>
          <span className="stat-chip-value">{fmtNum(m?.visitasPerfil ?? 0)}</span>
          <span className="stat-chip-label">Visitas al perfil</span>
        </button>
        <div className="stat-chip static">
          <span className="stat-chip-value">
            {hero.rating != null ? `${hero.rating.toFixed(1)}★` : "—"}
          </span>
          <span className="stat-chip-label">
            Rating · {fmtNum(hero.totalResenas)} reseñas
            {hero.deltaResenas != null && hero.deltaResenas !== 0 && (
              <span className={hero.deltaResenas > 0 ? "delta-up" : "delta-down"}>
                {" "}
                ({hero.deltaResenas > 0 ? "+" : ""}
                {hero.deltaResenas})
              </span>
            )}
          </span>
        </div>
      </div>

      {data.ubicaciones.length > 1 && (
        <div className="card">
          <p className="section-label">Tus locales ({data.ubicaciones.length})</p>
          <div className="locales-row">
            {data.ubicaciones.map((u) => (
              <button
                key={u.id}
                type="button"
                className={u.id === data.activo.id ? "local-pill active" : "local-pill"}
                onClick={() => onNav("sucursales")}
              >
                {u.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {taps.diasConTaps.length > 0 && (
        <div className="card">
          <p className="section-label">Escaneos — últimos 14 días</p>
          <TapsMiniChart
            labels={taps.labelsTaps}
            nfcPorDia={taps.nfcPorDia}
            qrPorDia={taps.qrPorDia}
            tieneSoporteQr={taps.tieneSoporteQr}
          />
        </div>
      )}

      {historico.length >= 2 && (
        <div className="chart-row">
          <div className="card chart-half">
            <p className="section-label">Reseñas acumuladas</p>
            <Sparkline values={historico.map((h) => h.resenasTotal)} mono />
          </div>
          <div className="card chart-half">
            <p className="section-label">Visitas al perfil</p>
            <Sparkline values={historico.map((h) => h.visitasPerfil)} mono />
          </div>
        </div>
      )}

      {resenas.length > 0 && (
        <div className="card">
          <p className="section-label">Últimas reseñas</p>
          {resenas.slice(0, 3).map((r) => (
            <div key={r.id} className="resena-mini">
              <strong>{r.autor}</strong> · {r.estrellas}★ · {r.fecha}
              <p className="muted">{r.texto || "Sin texto"}</p>
            </div>
          ))}
          <button type="button" className="btn-sm ghost" onClick={() => onNav("resenas")}>
            Ver todas →
          </button>
        </div>
      )}

      {data.resumenResenas?.temasRecurrentes?.length > 0 && (
        <div className="card sugerencias-box">
          <p className="section-label">Lo que se repite en las quejas</p>
          <div className="tag-row">
            {data.resumenResenas.temasRecurrentes.map((t) => (
              <span key={t.termino} className="tag">
                {t.termino} <em>{t.conteo}</em>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelSucursales({ data, codigo, onCambiarSucursal }) {
  if (data.sucursalesCount === 0) {
    return (
      <div className="portal-center card">
        <h1 className="portal-h1">Sucursales</h1>
        <p className="muted">Tu cuenta gestiona un solo local por ahora.</p>
      </div>
    );
  }

  const hero = data.hero;
  return (
    <div>
      <h1 className="portal-h1">Tus locales</h1>
      <p className="muted">Elegí un local para ver sus datos en el resto del portal.</p>

      <div className="sucursales-grid">
        {data.ubicaciones.map((u) => (
          <button
            key={u.id}
            type="button"
            className={u.id === data.activo.id ? "card sucursal-card active" : "card sucursal-card"}
            onClick={() => onCambiarSucursal(u.id === data.cuentaId ? "" : u.id)}
          >
            <strong>{u.nombre}</strong>
            <span className="muted small">
              {u.rating != null ? `${u.rating.toFixed(1)}★` : "—"} · {fmtNum(u.totalResenas)} reseñas
            </span>
          </button>
        ))}
      </div>

      <div className="card stack">
        <p className="section-label">Local activo</p>
        <p>
          <strong>{data.activo.nombre}</strong> · {data.activo.rubro} · {data.activo.zona}
        </p>
        <p className="muted">
          Rating: {hero.rating != null ? `${hero.rating.toFixed(1)}★` : "—"} · {fmtNum(hero.totalResenas)}{" "}
          reseñas
        </p>
      </div>
    </div>
  );
}

function PanelMes({ mes }) {
  const [mesSel, setMesSel] = useState(null);
  const m = mes.metrica;
  const prev = mes.metricaAnterior;

  if (!m) {
    return (
      <div>
        <h1 className="portal-h1">Resumen del mes</h1>
        <div className="card">
          <p className="muted">
            Todavía no cargamos las métricas de este mes. Se actualiza una vez al mes — mientras tanto, en
            Escaneos ya ves lo que pasa con tu cartel día a día.
          </p>
        </div>
      </div>
    );
  }

  const dResenas = deltaKpi(m.resenasNuevas, prev?.resenasNuevas ?? 0);
  const dCitas = deltaKpi(mes.citasIA, citasIA(prev));

  return (
    <div>
      <h1 className="portal-h1">Resumen del mes</h1>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Reseñas nuevas</span>
          <span className="kpi-value">{fmtNum(m.resenasNuevas)}</span>
          {prev && (
            <span className="muted small">
              {dResenas.valor >= 0 ? "+" : ""}
              {dResenas.valor} vs mes previo
            </span>
          )}
        </div>
        <div className="kpi">
          <span className="kpi-label">Visitas al perfil</span>
          <span className="kpi-value">{fmtNum(m.visitasPerfil)}</span>
          <span className="muted small">{fmtNum(m.llamadas)} llamadas</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{mes.esPremium ? "Citaciones en IA" : "Clics cómo llegar"}</span>
          <span className="kpi-value">{fmtNum(mes.esPremium ? mes.citasIA : m.clicsComoLlegar)}</span>
          {mes.esPremium && prev && (
            <span className="muted small">
              {dCitas.valor >= 0 ? "+" : ""}
              {dCitas.valor} vs mes previo
            </span>
          )}
        </div>
      </div>

      {mes.historico.length >= 2 && (
        <TendenciaResenasChart
          labels={mes.historico.map((h) => fmtMes(h.mes))}
          totales={mes.historico.map((h) => h.resenasTotal)}
          ratings={mes.historico.map((h) => h.ratingPromedio)}
        />
      )}

      <div className="chart-row">
        {mes.historico.length > 0 && (
          <div className="card chart-half">
            <div className="benchmark-header">
              <p className="section-label">Reseñas acumuladas</p>
              <span className="muted small">{m.ratingPromedio.toFixed(1)}★</span>
            </div>
            <Sparkline values={mes.historico.map((h) => h.resenasTotal)} />
          </div>
        )}
        {mes.historico.length > 0 && (
          <div className="card chart-half">
            <p className="section-label">Visitas al perfil</p>
            <Sparkline values={mes.historico.map((h) => h.visitasPerfil)} mono />
          </div>
        )}
      </div>

      {mes.esPremium && (
        <div className="card stack">
          <p className="section-label">Tu negocio en la IA este mes</p>
          <p className="muted small">ChatGPT: {fmtNum(m.citasChatGPT ?? 0)} · Copilot: {fmtNum(m.citasCopilot ?? 0)} · Perplexity: {fmtNum(m.citasPerplexity ?? 0)}</p>
          {mes.ultimosAudits.length > 0 && (
            <ul className="simple-list">
              {mes.ultimosAudits.map((a) => (
                <li key={a.id} className="small">
                  {a.aparece ? "✓" : "✗"} &ldquo;{a.pregunta}&rdquo; <span className="muted">· {a.plataforma}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mes.checklist.length > 0 && (
        <div className="card">
          <div className="benchmark-header">
            <p className="section-label">Ficha de Google optimizada</p>
            <strong>{mes.checklistPct}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${mes.checklistPct}%` }} />
          </div>
          <p className="muted small">
            {mes.checklistHechos} de {mes.checklist.length} tareas de SEO local completadas
          </p>
        </div>
      )}

      {mes.recomendacion && (
        <div className="card benchmark-highlight">
          <p className="section-label">Recomendación para el mes que viene</p>
          <p>{mes.recomendacion}</p>
        </div>
      )}

      {mes.historico.length > 0 && (
        <div className="card">
          <p className="section-label">
            Evolución mes a mes · promedio {mes.promedioResenasMensual.toFixed(1)} reseñas nuevas/mes
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Nuevas</th>
                  <th>Total</th>
                  <th>Rating</th>
                  <th>Visitas</th>
                </tr>
              </thead>
              <tbody>
                {[...mes.historico].reverse().map((h) => (
                  <tr
                    key={h.mes}
                    className={mesSel === h.mes ? "row-highlight" : ""}
                    onClick={() => setMesSel(mesSel === h.mes ? null : h.mes)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{fmtMes(h.mes)}</td>
                    <td>+{fmtNum(h.resenasNuevas)}</td>
                    <td>{fmtNum(h.resenasTotal)}</td>
                    <td>{h.ratingPromedio.toFixed(1)}</td>
                    <td>{fmtNum(h.visitasPerfil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mesSel && mes.detalleMensual[mesSel] && (
            <div className="mes-detalle">
              <p className="muted small">
                {mes.detalleMensual[mesSel].nResenasTexto} reseñas con texto en {fmtMes(mesSel)}
              </p>
              {mes.detalleMensual[mesSel].terminos.length > 0 && (
                <p className="small">
                  Temas: {mes.detalleMensual[mesSel].terminos.map((t) => `${t.termino} (${t.conteo})`).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PanelResenas({ data, codigo, onReload }) {
  const [editando, setEditando] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");
  const pendientes = useMemo(() => data.resenas.filter((r) => r.estado === "nueva"), [data.resenas]);

  async function aprobar(id) {
    setError("");
    try {
      await aprobarResenaPortal(codigo, id, {
        comercioId: data.activo.id,
        respuesta: respuesta || data.resenas.find((r) => r.id === id)?.respuestaSugerida || "",
      });
      setEditando(null);
      setRespuesta("");
      onReload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function descartar(id) {
    setError("");
    try {
      await descartarResenaPortal(codigo, id, { comercioId: data.activo.id });
      onReload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className="portal-h1">Reseñas</h1>
      {error && <p className="error">{error}</p>}

      {data.resumenResenas?.total > 0 && (
        <div className="card kpi-grid">
          <div className="kpi">
            <span className="kpi-label">Total</span>
            <span className="kpi-value">{data.resumenResenas.total}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Promedio</span>
            <span className="kpi-value">
              {data.resumenResenas.promedio != null ? `${data.resumenResenas.promedio.toFixed(1)}★` : "—"}
            </span>
          </div>
          {data.resumenResenas.tendencia && (
            <div className="kpi">
              <span className="kpi-label">Tendencia</span>
              <span className="kpi-value small">{data.resumenResenas.tendencia.texto}</span>
            </div>
          )}
        </div>
      )}

      {data.personalEmpleados?.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p className="section-label">Personal (menciones en reseñas)</p>
          {data.personalEmpleados.map((e) => (
            <div key={e.nombre} className="empleado-row">
              <strong>{e.nombre}</strong>
              <span className="muted small">
                {e.menciones} menciones · {fmtNum(e.taps)} taps NFC
                {e.menciones > 0 && ` · ${e.ratingPromedio.toFixed(1)}★ promedio`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card form">
        <p className="section-label">Automatización</p>
        <label className="check-row">
          <input
            type="checkbox"
            defaultChecked={data.activo.autoResponderPositivas}
            onChange={async (e) => {
              await actualizarAutomatizacionPortal(codigo, {
                comercioId: data.activo.id,
                autoResponderPositivas: e.target.checked,
                autoResponderUmbral: data.activo.autoResponderUmbral,
              });
              onReload();
            }}
          />
          Responder automáticamente reseñas positivas
        </label>
      </div>

      {pendientes.length === 0 ? (
        <p className="muted">No hay reseñas pendientes de respuesta.</p>
      ) : (
        pendientes.map((r) => (
          <div key={r.id} className="card resena-card">
            <div className="resena-top">
              <strong>{r.autor}</strong>
              <span>{r.estrellas}★ · {r.fecha}</span>
            </div>
            <p>{r.texto || <em className="muted">Sin texto</em>}</p>
            {editando === r.id ? (
              <textarea
                rows={3}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder={r.respuestaSugerida || "Tu respuesta pública…"}
              />
            ) : (
              r.respuestaSugerida && (
                <p className="muted small">Sugerida: {r.respuestaSugerida}</p>
              )
            )}
            <div className="form-actions">
              {editando === r.id ? (
                <>
                  <button type="button" className="ghost" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => aprobar(r.id)}>
                    Publicar respuesta
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(r.id);
                      setRespuesta(r.respuestaSugerida || "");
                    }}
                  >
                    Responder
                  </button>
                  <button type="button" className="ghost" onClick={() => descartar(r.id)}>
                    Escalar al equipo
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      <h2 className="section-title">Historial ({data.resenas.length})</h2>
      {data.resenas.slice(0, 20).map((r) => (
        <div key={`h-${r.id}`} className="resena-mini">
          <strong>{r.autor}</strong> · {r.estrellas}★ · {r.estado}
          <p className="muted">{r.texto?.slice(0, 120) || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function PanelDispositivos({ data, codigo, onReload }) {
  const [editId, setEditId] = useState(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  async function guardar(linkId) {
    setError("");
    try {
      await actualizarLinkPortal(codigo, linkId, {
        comercioId: data.activo.id,
        urlDestino: url,
      });
      setEditId(null);
      onReload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className="portal-h1">Dispositivos</h1>
      <p className="muted">{data.links.length} piezas · {fmtNum(data.taps.totalHistorico)} escaneos totales</p>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Etiqueta</th>
              <th>Tipo</th>
              <th>Taps</th>
              <th>Destino</th>
            </tr>
          </thead>
          <tbody>
            {data.links.map((l) => (
              <tr key={l.id}>
                <td>{l.etiqueta || l.id}</td>
                <td>{l.tipo}</td>
                <td>{fmtNum(l.taps)}</td>
                <td>
                  {editId === l.id ? (
                    <div className="inline-form">
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://… o vacío = reseña Google"
                      />
                      <button type="button" className="btn-sm" onClick={() => guardar(l.id)}>
                        Guardar
                      </button>
                      <button type="button" className="btn-sm ghost" onClick={() => setEditId(null)}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate">{l.urlDestino || "Reseña Google (default)"}</span>{" "}
                      <button
                        type="button"
                        className="btn-sm ghost"
                        onClick={() => {
                          setEditId(l.id);
                          setUrl(l.urlDestino || "");
                        }}
                      >
                        Editar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PanelCompetidores({ benchmark, crecimiento }) {
  return (
    <div>
      <h1 className="portal-h1">Competidores</h1>
      <p className="muted">
        Cómo estás parado frente a los locales de tu zona — se actualiza solo, todos los días.
      </p>
      <BenchmarkCompetencia meses={benchmark} crecimiento={crecimiento} />
    </div>
  );
}

function PanelEscaneos({ data, codigo }) {
  const { taps } = data;
  const max = Math.max(1, ...taps.nfcPorDia, ...taps.qrPorDia);
  const [fechaSel, setFechaSel] = useState(() => taps.diasConTaps[taps.diasConTaps.length - 1] ?? "");
  const [porHora, setPorHora] = useState(null);
  const [cargandoHora, setCargandoHora] = useState(false);

  useEffect(() => {
    if (!fechaSel) {
      setPorHora(null);
      return;
    }
    setCargandoHora(true);
    getTapsPorHoraPortal(codigo, { fecha: fechaSel, comercioId: data.activo.id })
      .then((d) => setPorHora(d.porHora))
      .catch(() => setPorHora(null))
      .finally(() => setCargandoHora(false));
  }, [fechaSel, codigo, data.activo.id]);

  return (
    <div>
      <h1 className="portal-h1">Escaneos</h1>
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Total histórico</span>
          <span className="kpi-value">{fmtNum(taps.totalHistorico)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">NFC</span>
          <span className="kpi-value">{fmtNum(taps.totalNfc)}</span>
        </div>
        {taps.tieneSoporteQr && (
          <div className="kpi">
            <span className="kpi-label">QR</span>
            <span className="kpi-value">{fmtNum(taps.totalQr)}</span>
          </div>
        )}
      </div>

      <div className="card">
        <p className="section-label">Últimos 14 días</p>
        {taps.diasConTaps.length === 0 ? (
          <p className="muted">Todavía no hay escaneos registrados.</p>
        ) : (
          taps.diasConTaps.map((d, i) => {
            const nfc = taps.nfcPorDia[i];
            const qr = taps.qrPorDia[i];
            const total = nfc + qr;
            return (
              <div key={d} className="bar-row">
                <span className="bar-label">{taps.labelsTaps[i]}</span>
                <div className="bar-track">
                  <div className="bar-fill pos" style={{ width: `${(total / max) * 100}%` }} />
                </div>
                <span className="bar-num">{total}</span>
              </div>
            );
          })
        )}
      </div>

      {taps.diasConTaps.length > 0 && (
        <div className="card">
          <p className="section-label">Detalle por hora</p>
          <label className="portal-sucursal">
            <span className="muted small">Día</span>
            <select value={fechaSel} onChange={(e) => setFechaSel(e.target.value)}>
              {taps.diasConTaps.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {cargandoHora ? (
            <p className="muted small">Cargando…</p>
          ) : porHora ? (
            porHora
              .filter((h) => h.taps > 0)
              .map((h) => (
                <div key={h.hora} className="bar-row">
                  <span className="bar-label">{String(h.hora).padStart(2, "0")}:00</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill pos"
                      style={{
                        width: `${(h.taps / Math.max(1, ...porHora.map((x) => x.taps))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="bar-num">{h.taps}</span>
                </div>
              ))
          ) : (
            <p className="muted small">Sin datos para ese día.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PanelRating({ data, codigo, onReload }) {
  const [error, setError] = useState("");
  const { hero, google, activo } = data;

  async function desconectar() {
    if (!confirm("¿Desconectar Google Business Profile de este local?")) return;
    setError("");
    try {
      await desconectarGooglePortal(codigo, { comercioId: activo.id });
      onReload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className="portal-h1">Mi rating en Google</h1>
      {error && <p className="error">{error}</p>}

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Rating</span>
          <span className="kpi-value">{hero.rating != null ? `${hero.rating.toFixed(1)}★` : "—"}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Reseñas</span>
          <span className="kpi-value">{fmtNum(hero.totalResenas)}</span>
        </div>
      </div>

      <div className="card stack">
        {google.conectado ? (
          <>
            <p>
              <strong>Google Business Profile:</strong> conectado
              {google.diasConectado != null && ` (hace ${google.diasConectado} días)`}
            </p>
            {activo.googleSyncEn && (
              <p className="muted small">Última sync: {new Date(activo.googleSyncEn).toLocaleString("es-AR")}</p>
            )}
            <button type="button" className="ghost btn-danger" onClick={desconectar}>
              Desconectar Google
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Conectá tu cuenta de Google para traer visitas al perfil, llamadas y más métricas automáticamente.
            </p>
            <a href={google.conectarHref} className="btn-primary">
              Conectar Google Business Profile
            </a>
          </>
        )}
      </div>
    </div>
  );
}
