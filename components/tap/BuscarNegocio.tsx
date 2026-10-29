"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buscarNegocio, sugerirNegocio } from "@/app/t/actions";
import type { LugarParaResena } from "@/lib/places";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

function nuevoToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

// El paso más difícil de activar una pieza era conseguir el link de reseña
// de Google. Acá el comprador escribe el nombre (o la calle) de su negocio y
// mientras escribe le aparecen sugerencias, como en Google Maps; lo elige de
// la lista y el link lo trae el servidor desde Google (lib/places.ts). El
// botón Buscar hace una búsqueda más amplia por si no aparece en las
// sugerencias.
export default function BuscarNegocio({
  slug,
  elegido,
  onElegir,
}: {
  slug: string;
  elegido: LugarParaResena | null;
  /** `sesionToken` viene solo si el lugar salió de las sugerencias. */
  onElegir: (lugar: LugarParaResena | null, sesionToken?: string) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [lugares, setLugares] = useState<LugarParaResena[] | null>(null);
  const [deSugerencias, setDeSugerencias] = useState(false);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscando, startTransition] = useTransition();
  const token = useRef<string>("");
  const ultimaConsulta = useRef(0);

  // Sugerencias con una pausa corta al tipear: no una consulta por letra.
  useEffect(() => {
    const q = consulta.trim();
    if (q.length < 3) {
      ultimaConsulta.current++;
      setSugiriendo(false);
      setLugares(null);
      return;
    }
    if (!token.current) token.current = nuevoToken();
    const n = ++ultimaConsulta.current;
    const t = setTimeout(async () => {
      setSugiriendo(true);
      try {
        const r = await sugerirNegocio(slug, q, token.current);
        if (n !== ultimaConsulta.current) return;
        if (r.ok) {
          // Sin sugerencias para lo que escribió: no dejar a la vista la
          // lista de una búsqueda anterior (llevaría a tocar otro negocio).
          setLugares(r.lugares.length > 0 ? r.lugares : null);
          setDeSugerencias(r.lugares.length > 0);
          setError(null);
        } else {
          setError(r.error);
        }
      } catch {
        // Sin conexión o similar: queda el botón Buscar.
      } finally {
        if (n === ultimaConsulta.current) setSugiriendo(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [consulta, slug]);

  function buscar() {
    setError(null);
    ultimaConsulta.current++;
    setSugiriendo(false);
    startTransition(async () => {
      try {
        const r = await buscarNegocio(slug, consulta);
        if (r.ok) {
          setLugares(r.lugares);
          setDeSugerencias(false);
          if (r.lugares.length === 0) {
            setError("No encontramos nada. Probá con el nombre y la calle, o el nombre y el barrio.");
          }
        } else {
          setLugares(null);
          setError(r.error);
        }
      } catch {
        setError("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
      }
    });
  }

  function elegir(l: LugarParaResena) {
    onElegir(l, deSugerencias ? token.current : undefined);
    // La sesión de sugerencias termina al elegir: si toca "Cambiar", empieza otra.
    token.current = "";
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
          placeholder="Nombre o calle de tu negocio"
          aria-label="Nombre o calle de tu negocio"
          autoComplete="off"
          enterKeyHint="search"
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
      {!lugares && !error && (
        <p className="mt-1.5 text-[11.5px]" style={{ color: INK_SOFT }}>
          {sugiriendo ? "Buscando en Google…" : "Ej: Barbería Güemes, o Obispo Trejo 250. Te vamos mostrando opciones mientras escribís."}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[12.5px]" style={{ color: "#c5221f" }}>
          {error}
        </p>
      )}
      {lugares && lugares.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border" style={{ borderColor: LINE }}>
          {lugares.map((l) => (
            <li key={l.placeId} className="border-b last:border-0" style={{ borderColor: LINE }}>
              <button type="button" onClick={() => elegir(l)} className="w-full px-3.5 py-3 text-left active:bg-slate-50">
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
          Tocá tu negocio. ¿No está? Agregá la calle o el barrio, o tocá <b>Buscar</b>.
        </p>
      )}
    </div>
  );
}
