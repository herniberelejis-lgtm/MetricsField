"use client";

import { useState } from "react";
import type { TonoMarca } from "@/lib/types";
import type { ResenaGooglePublica } from "@/lib/places";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { btnPortal, btnPortalSec } from "@/components/ui";

// Reseñas públicas de Google (hasta 5 por local, las que elige Google — ver
// fetchResenasGooglePublicas en lib/places.ts) con una respuesta sugerida
// para copiar y pegar en Google. Es lo que se puede ofrecer automático
// mientras Google no apruebe la API de reseñas de Business Profile: con esa
// API la pestaña pasa sola a la gestión completa (todas las reseñas, y
// "aprobar" publica la respuesta directo).

const COLOR_BADGE: Record<number, string> = {
  1: "bg-[#FFF4E8] text-[#8A3F00]",
  2: "bg-[#FFF4E8] text-[#8A3F00]",
  3: "bg-slate-100 text-slate-700",
  4: "bg-[#EAF7F0] text-[#0B5E40]",
  5: "bg-[#EAF7F0] text-[#0B5E40]",
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
    <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEF4FB] text-sm font-semibold text-[#1F4E80]">
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
            {resena.haceCuanto && <div className="text-xs text-slate-600">{resena.haceCuanto}</div>}
          </div>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[resena.estrellas]}`}
          aria-label={`${resena.estrellas} de 5 estrellas`}
        >
          {"★".repeat(resena.estrellas)}
          <span className="opacity-30">{"★".repeat(5 - resena.estrellas)}</span>
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-[#F7F9FC] px-3 py-2 text-sm leading-relaxed text-slate-800">
        {resena.texto || <span className="text-slate-600">(sin comentario, solo estrellas)</span>}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600">
            Respuesta sugerida — editala si querés
          </span>
          <button type="button" onClick={regenerar} className="min-h-[32px] px-1 text-xs font-medium text-[#1F4E80] hover:underline">
            Regenerar
          </button>
        </div>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm leading-relaxed text-slate-800 focus:border-[#4F7AA8] focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={copiar} className={btnPortal}>
          {copiado ? "¡Copiada!" : "Copiar respuesta"}
        </button>
        {resena.urlResena && (
          <a
            href={resena.urlResena}
            target="_blank"
            rel="noopener noreferrer"
            className={btnPortalSec}
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
        <p className="text-sm text-slate-600">Google todavía no muestra reseñas para tu ficha.</p>
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
              className="mt-3 flex min-h-[44px] items-center rounded-2xl border border-[#E4E6EA] bg-white px-4 py-2.5 text-sm font-medium text-[#1F4E80] transition hover:border-[#A9C5E6] hover:bg-[#F7F9FC]"
            >
              Ver todas las reseñas{varios ? ` de ${local.nombre}` : ""} en Google →
            </a>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-600">Reseñas de Google.</p>
    </div>
  );
}
