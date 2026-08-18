import { useState } from "react";

export default function GooglePlaceIdField({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  async function buscar() {
    if (query.trim().length < 3) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch(`/api/places-search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo buscar.");
        setResultados(null);
      } else {
        setResultados(data.resultados);
      }
    } catch {
      setError("No se pudo conectar con el buscador.");
    }
    setBuscando(false);
  }

  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ChIJu4gNLQCjMpQRKW0UbexmsHE"
      />

      <div className="place-search-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          placeholder="O buscá por nombre: 'Nemo Cafe, Alberdi, Córdoba'"
          className="small"
        />
        <button
          type="button"
          className="btn-sm"
          onClick={buscar}
          disabled={buscando || query.trim().length < 3}
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && <p className="error small">{error}</p>}

      {resultados && resultados.length === 0 && (
        <p className="muted small">Sin resultados.</p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="place-results">
          {resultados.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                className="place-result-btn"
                onClick={() => {
                  onChange(r.placeId);
                  setResultados(null);
                }}
              >
                <strong>{r.nombre}</strong>
                <span className="muted small">{r.direccion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
