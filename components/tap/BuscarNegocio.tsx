"use client";

import { useState, useTransition } from "react";
import { buscarNegocio } from "@/app/t/actions";
import type { LugarParaResena } from "@/lib/places";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// El paso más difícil de activar una pieza era conseguir el link de reseña
// de Google. Acá el comprador escribe el nombre de su negocio y lo elige de
// una lista: el link lo trae el servidor desde Google (lib/places.ts).
export default function BuscarNegocio({
  slug,
  elegido,
  onElegir,
}: {
  slug: string;
  elegido: LugarParaResena | null;
  onElegir: (lugar: LugarParaResena | null) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [lugares, setLugares] = useState<LugarParaResena[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, startTransition] = useTransition();

  function buscar() {
    setError(null);
    startTransition(async () => {
      const r = await buscarNegocio(slug, consulta);
      if (r.ok) {
        setLugares(r.lugares);
        if (r.lugares.length === 0) setError("No encontramos nada con ese nombre. Probá agregando la ciudad o el barrio.");
      } else {
        setLugares(null);
        setError(r.error);
      }
    });
  }

  if (elegido) {
    return (
      <div className="flex items-start gap-3 rounded-xl border-2 px-3.5 py-3" style={{ borderColor: "#1e8e3e", background: "#f3faf5" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="11" fill="#1e8e3e" />
          <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium" style={{ color: INK }}>
            {elegido.nombre}
          </p>
          <p className="text-[12px]" style={{ color: INK_SOFT }}>
            {elegido.direccion}
          </p>
        </div>
        <button type="button" onClick={() => onElegir(null)} className="shrink-0 text-[12.5px] font-medium" style={{ color: BRAND }}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          placeholder="Ej: Barbería Güemes Córdoba"
          aria-label="Nombre de tu negocio"
          className="min-w-0 flex-1 rounded-xl border px-3.5 py-3 text-[16px] outline-none"
          style={{ borderColor: LINE, color: INK }}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={buscando}
          className="shrink-0 rounded-xl px-4 text-[15px] font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {buscando ? "…" : "Buscar"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12.5px]" style={{ color: "#c5221f" }}>
          {error}
        </p>
      )}
      {lugares && lugares.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border" style={{ borderColor: LINE }}>
          {lugares.map((l) => (
            <li key={l.placeId} className="border-b last:border-0" style={{ borderColor: LINE }}>
              <button type="button" onClick={() => onElegir(l)} className="w-full px-3.5 py-3 text-left active:bg-slate-50">
                <span className="block text-[14.5px] font-medium" style={{ color: INK }}>
                  {l.nombre}
                </span>
                <span className="block text-[12px]" style={{ color: INK_SOFT }}>
                  {l.direccion}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {lugares && lugares.length > 0 && (
        <p className="mt-1.5 text-[11.5px]" style={{ color: INK_SOFT }}>
          Tocá tu negocio.
        </p>
      )}
    </div>
  );
}
