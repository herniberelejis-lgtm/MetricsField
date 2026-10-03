"use client";

import { useState } from "react";
import type { TonoMarca } from "@/lib/types";
import type { ResenaGooglePublica } from "@/lib/places";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { btnSecondary } from "@/components/ui";

// Reseñas públicas de Google (hasta 5 por local, las que elige Google — ver
// fetchResenasGooglePublicas en lib/places.ts) con una respuesta sugerida
// para copiar y pegar en Google. Es lo que se puede ofrecer automático
// mientras Google no apruebe la API de reseñas de Business Profile: con esa
// API la pestaña pasa sola a la gestión completa (todas las reseñas, y
// "aprobar" publica la respuesta directo).

const COLOR_BADGE: Record<number, string> = {
  1: "bg-slate-100 text-slate-500",
  2: "bg-slate-100 text-slate-500",
  3: "bg-slate-200 text-slate-700",
  4: "bg-slate-900 text-white",
  5: "bg-slate-900 text-white",
};

export interface LocalConResenasGoogle {
  comercioId: string;
  nombre: string;
  resenas: ResenaGooglePublica[];
  urlFicha: string | null;
}

function TarjetaResenaGoogle({ resena, tonoMarca }: { resena: ResenaGooglePublica; tonoMarca: TonoMarca }) {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(() =>
    generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, 0),
  );
  const [copiado, setCopiado] = useState(false);

  function regenerar() {
    const siguiente = intento + 1;
    setIntento(siguiente);
    setRespuesta(generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, siguiente));
  }

  function copiar() {
    navigator.clipboard
      .writeText(respuesta)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div className="rounded-3xl border border-white/60 bg-white/65 p-5 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {(resena.autor || "?").trim().slice(0, 1).toUpperCase()}
          </div>
          <div>
            {/* Atribución al autor: la piden los términos de Google. */}
            {resena.autorUrl ? (
              <a
                href={resena.autorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {resena.autor}
              </a>
            ) : (
              <div className="text-sm font-medium text-slate-900">{resena.autor}</div>
            )}
            {resena.haceCuanto && <div className="text-xs text-slate-400">{resena.haceCuanto}</div>}
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[resena.estrellas]}`}>
          {"★".repeat(resena.estrellas)}
          {/* Estrellas vacías visibles también sobre el fondo oscuro (4★ se veía como 5★). */}
          <span className={resena.estrellas >= 4 ? "text-slate-500" : "text-slate-300"}>
            {"★".repeat(5 - resena.estrellas)}
          </span>
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {resena.texto || <span className="text-slate-400">(sin comentario, solo estrellas)</span>}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Respuesta sugerida — editala si querés
          </span>
          <button type="button" onClick={regenerar} className="text-[11px] font-medium text-brand-fg hover:underline">
            Regenerar
          </button>
        </div>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={copiar} className={`${btnSecondary} !px-3.5 !py-1.5 !text-xs`}>
          {copiado ? "¡Copiada!" : "Copiar respuesta"}
        </button>
        {resena.urlResena && (
          <a
            href={resena.urlResena}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand-fg hover:underline"
          >
            Responder en Google →
          </a>
        )}
      </div>
    </div>
  );
}

export default function ResenasGoogle({
  locales,
  tonoMarca,
}: {
  locales: LocalConResenasGoogle[];
  tonoMarca: TonoMarca;
}) {
  const varios = locales.length > 1;
  const total = locales.reduce((acc, l) => acc + l.resenas.length, 0);

  return (
    <div className="space-y-5">
      {total === 0 && (
        <p className="text-sm text-slate-500">Google todavía no muestra reseñas para tu ficha.</p>
      )}
      {locales.map((local) => (
        <div key={local.comercioId}>
          {varios && <p className="mb-2 text-sm font-semibold text-slate-800">{local.nombre}</p>}
          <div className="space-y-3">
            {local.resenas.map((r, i) => (
              <TarjetaResenaGoogle key={`${r.autor}-${r.fecha ?? i}`} resena={r} tonoMarca={tonoMarca} />
            ))}
          </div>
          {local.urlFicha && (
            <a
              href={local.urlFicha}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-brand-fg transition hover:border-slate-300 hover:bg-white"
            >
              Ver todas las reseñas{varios ? ` de ${local.nombre}` : ""} en Google →
            </a>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-400">Reseñas de Google.</p>
    </div>
  );
}
