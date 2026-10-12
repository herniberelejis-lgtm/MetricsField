"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  accionAgregarCompetidorPortal,
  accionBuscarLugarPortal,
  accionQuitarCompetidorPortal,
  type LugarEncontrado,
} from "@/app/portal/actions";

// "Agregá un competidor" desde el portal: el dueño escribe el nombre del
// local como lo buscaría en Google Maps, ve los resultados mientras escribe
// y lo suma con un toque — sin Place IDs ni pedirle nada al equipo. La
// búsqueda y el alta corren en el servidor (app/portal/actions.ts), con el
// mismo control de acceso que el resto del portal.

const ESPERA_MS = 450;

export default function AgregarCompetidor({
  codigo,
  comercioId,
  cantidad,
  maximo,
  abiertoAlInicio = false,
}: {
  codigo: string;
  comercioId: string;
  /** Cuántos competidores tiene hoy este local. */
  cantidad: number;
  maximo: number;
  /** Sin ningún competidor, el buscador arranca abierto. */
  abiertoAlInicio?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  const [texto, setTexto] = useState("");
  const [lugares, setLugares] = useState<LugarEncontrado[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [agregando, setAgregando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const ultimaBusqueda = useRef(0);

  const lleno = cantidad >= maximo;

  useEffect(() => {
    if (abierto) input.current?.focus();
  }, [abierto]);

  // Busca solo mientras escribe, con una pausa corta para no gastar una
  // búsqueda (paga) por cada letra. Una respuesta vieja que llega tarde se
  // descarta.
  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 3) {
      setLugares(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const id = ++ultimaBusqueda.current;
    const t = setTimeout(async () => {
      const r = await accionBuscarLugarPortal(codigo, comercioId, consulta);
      if (id !== ultimaBusqueda.current) return;
      setBuscando(false);
      if (r.ok) {
        setLugares(r.lugares);
        setError(null);
      } else {
        setLugares(null);
        setError(r.error);
      }
    }, ESPERA_MS);
    return () => clearTimeout(t);
  }, [texto, codigo, comercioId]);

  async function agregar(l: LugarEncontrado) {
    setAgregando(l.placeId);
    setError(null);
    const r = await accionAgregarCompetidorPortal(codigo, comercioId, l.placeId, l.nombre);
    setAgregando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setListo(r.nombre);
    setTexto("");
    setLugares(null);
    startTransition(() => router.refresh());
  }

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setListo(null);
          }}
          disabled={lleno}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="text-base leading-none">+</span> Agregá un competidor
        </button>
        {lleno ? (
          <span className="text-xs text-slate-500">
            Llegaste a {maximo}. Quitá alguno para sumar otro.
          </span>
        ) : (
          listo && <span className="text-sm text-emerald-700">✓ Sumamos a {listo}.</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.18)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">¿A quién querés seguir?</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Escribí el nombre del local como lo buscarías en Google Maps.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setTexto("");
            setLugares(null);
            setError(null);
          }}
          className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          Cerrar
        </button>
      </div>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={input}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setListo(null);
          }}
          placeholder="Ej: Pizzería Popular Güemes"
          aria-label="Buscar un local en Google Maps"
          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-slate-900/10 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4"
        />
      </div>

      <div className="mt-2 min-h-[1.25rem] text-xs" aria-live="polite">
        {buscando ? (
          <span className="text-slate-500">Buscando…</span>
        ) : error ? (
          <span className="text-rose-600">{error}</span>
        ) : listo ? (
          <span className="text-emerald-700">✓ Sumamos a {listo}. ¿Agregás otro?</span>
        ) : texto.trim().length > 0 && texto.trim().length < 3 ? (
          <span className="text-slate-400">Seguí escribiendo…</span>
        ) : lugares === null ? (
          <span className="text-slate-400">Tip: sumá el barrio para encontrarlo más rápido.</span>
        ) : null}
      </div>

      {lugares && lugares.length === 0 && !buscando && (
        <p className="mt-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No encontramos ese local. Probá con otro nombre o agregá el barrio.
        </p>
      )}

      {lugares && lugares.length > 0 && (
        <ul className="mt-1 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {lugares.map((l) => (
            <li key={l.placeId} className="flex items-center gap-3 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-rose-500" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{l.nombre}</p>
                <p className="truncate text-xs text-slate-500">{l.direccion}</p>
              </div>
              {l.estado === "disponible" ? (
                <button
                  type="button"
                  onClick={() => agregar(l)}
                  disabled={agregando !== null || lleno}
                  className="shrink-0 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {agregando === l.placeId ? "Agregando…" : "Agregar"}
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                  {l.estado === "propio" ? "Es tu local" : "Ya lo seguís"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-400">
        {cantidad} de {maximo} competidores. Sus calificaciones se actualizan solas todos los días.
      </p>
    </div>
  );
}

/** Botón "Quitar" de cada competidor de la tabla. */
export function QuitarCompetidor({
  codigo,
  comercioId,
  competidorId,
  nombre,
}: {
  codigo: string;
  comercioId: string;
  competidorId: number;
  nombre: string;
}) {
  const router = useRouter();
  const [quitando, setQuitando] = useState(false);
  const [, startTransition] = useTransition();

  async function quitar() {
    if (!window.confirm(`¿Dejar de seguir a ${nombre}? Se borra también su historial de comparación.`)) return;
    setQuitando(true);
    const r = await accionQuitarCompetidorPortal(codigo, comercioId, competidorId);
    if (!r.ok) {
      setQuitando(false);
      window.alert(r.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={quitar}
      disabled={quitando}
      aria-label={`Quitar a ${nombre}`}
      className="rounded-full px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
    >
      {quitando ? "Quitando…" : "Quitar"}
    </button>
  );
}
