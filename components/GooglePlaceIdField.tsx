"use client";

import { useState } from "react";
import { inputCls } from "@/components/forms";

interface Resultado {
  placeId: string;
  nombre: string;
  direccion: string;
}

// Reemplaza el input plano de "Google Place ID": además de poder pegarlo
// a mano, tiene un buscador que consulta /api/places-search (Google
// Places API del lado del servidor) para encontrarlo por nombre — así no
// hay que salir del panel ni pelearse con la herramienta de Google.
export default function GooglePlaceIdField({ defaultValue }: { defaultValue?: string }) {
  const [placeId, setPlaceId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (query.trim().length < 3) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch(`/api/places-search?q=${encodeURIComponent(query)}`);
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
        name="googlePlaceId"
        value={placeId}
        onChange={(e) => setPlaceId(e.target.value)}
        placeholder="ChIJu4gNLQCjMpQRKW0UbexmsHE"
        className={inputCls}
      />

      <div className="mt-2 flex gap-2">
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
          className={`${inputCls} text-xs`}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={buscando || query.trim().length < 3}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

      {resultados && resultados.length === 0 && (
        <p className="mt-1.5 text-xs text-slate-500">Sin resultados.</p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {resultados.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                onClick={() => {
                  setPlaceId(r.placeId);
                  setResultados(null);
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <div className="font-medium text-slate-800">{r.nombre}</div>
                <div className="text-slate-500">{r.direccion}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
