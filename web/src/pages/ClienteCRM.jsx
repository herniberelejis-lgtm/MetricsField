import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { crearResenaCliente, getResenasCliente, actualizarResenaCliente } from "../api.js";
import { generarRespuestaSugerida } from "../respuestas.js";

const ESTADOS = ["nueva", "respondida", "escalada", "resuelta"];

const COLOR_ESTADO = {
  nueva: "estado-nueva",
  respondida: "estado-respondida",
  escalada: "estado-escalada",
  resuelta: "estado-resuelta",
};

function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} estrellas`}>
      {"★".repeat(rating)}
      <span className="stars-empty">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function fechaCorta(v) {
  return new Date(v).toLocaleDateString("es-AR");
}

function ResenaCard({ resena, tonoMarca, comercioId, onGuardado }) {
  const sugerenciaInicial =
    resena.respuestaSugerida ??
    generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca);

  const [respuesta, setRespuesta] = useState(sugerenciaInicial);
  const [estado, setEstado] = useState(resena.estado);
  const [responsable, setResponsable] = useState(resena.responsable ?? "");
  const [publicada, setPublicada] = useState(resena.respuestaPublicada);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await actualizarResenaCliente(comercioId, resena.id, {
        estado,
        respuestaSugerida: respuesta,
        respuestaPublicada: publicada,
        responsable,
      });
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card resena-crm">
      <div className="resena-top">
        <div>
          <strong>{resena.autor}</strong> <Stars rating={resena.estrellas} />
          <span className={`estado-badge ${COLOR_ESTADO[resena.estado] ?? ""}`}>{resena.estado}</span>
        </div>
      </div>
      <p>{resena.texto}</p>
      <p className="muted small">
        {resena.plataforma} · {fechaCorta(resena.fecha)}
      </p>

      <form className="form resena-form" onSubmit={onSubmit}>
        {error && <p className="error">{error}</p>}
        <label>
          Respuesta sugerida
          <span className="muted small"> — plantilla por tono de marca; editá antes de publicar en Google.</span>
          <textarea rows={3} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Responsable
            <input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Quién la gestiona"
            />
          </label>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} />
          Ya publiqué esta respuesta en Google (copy-paste)
        </label>
        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}

export default function ClienteCRM() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  const [autor, setAutor] = useState("");
  const [estrellas, setEstrellas] = useState(5);
  const [texto, setTexto] = useState("");
  const [plataforma, setPlataforma] = useState("google");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("");

  async function cargar() {
    setLoading(true);
    const d = await getResenasCliente(id);
    setCliente(d.cliente);
    setResenas(d.resenas);
    setLoading(false);
  }

  useEffect(() => {
    cargar().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [id]);

  async function onCrear(e) {
    e.preventDefault();
    setCreando(true);
    setError("");
    try {
      await crearResenaCliente(id, { autor, estrellas, texto, plataforma, fecha, hora: hora || undefined });
      setAutor("");
      setTexto("");
      setHora("");
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  if (loading && !cliente) return <p className="muted">Cargando…</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to={`/admin/clientes/${id}`}>← {cliente?.nombre ?? "Cliente"}</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>CRM de reseñas</h1>
          <p className="muted">
            {cliente?.nombre} · {resenas.length} reseña{resenas.length === 1 ? "" : "s"} cargadas
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <h2 className="section-title">Cargar reseña</h2>
      <form className="card form" onSubmit={onCrear}>
        <div className="form-row">
          <label>
            Autor
            <input required value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Nombre del cliente" />
          </label>
          <label>
            Estrellas
            <select value={estrellas} onChange={(e) => setEstrellas(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} estrella{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Texto de la reseña
          <textarea required rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Plataforma
            <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
              <option value="google">Google</option>
              <option value="otra">Otra</option>
            </select>
          </label>
          <label>
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
        <label>
          Hora <span className="muted small">(opcional)</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
        <button type="submit" disabled={creando}>
          {creando ? "Cargando…" : "Cargar reseña"}
        </button>
      </form>

      {resenas.length > 0 && (
        <>
          <h2 className="section-title">Reseñas</h2>
          <div className="resenas-stack">
            {resenas.map((r) => (
              <ResenaCard
                key={r.id}
                resena={r}
                tonoMarca={cliente.tonoMarca}
                comercioId={id}
                onGuardado={cargar}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
