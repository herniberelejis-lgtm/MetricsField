"use client";

import { useState, useTransition } from "react";
import type { ResenaCRM, TonoMarca } from "@/lib/types";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { accionAprobarResenaPortal, accionDescartarResenaPortal } from "@/app/portal/actions";
import { btnSuccess, btnSecondary, btnGhost, IconCheck } from "@/components/ui";

// Gestión de reseñas desde el portal del cliente: el dueño ve sus reseñas
// pendientes, edita/regenera la respuesta sugerida (gratis, sin IA paga —
// mismo generador por reglas que usa el equipo interno) y la aprueba. Como
// todavía no hay API de Google para publicar solo, "aprobar" guarda la
// respuesta final acá y le pide que la copie y pegue en Google — nunca se
// promete una publicación automática que hoy no existe.

const COLOR_BADGE: Record<number, string> = {
  1: "bg-rose-50 text-rose-700",
  2: "bg-rose-50 text-rose-700",
  3: "bg-amber-50 text-amber-700",
  4: "bg-emerald-50 text-emerald-700",
  5: "bg-emerald-50 text-emerald-700",
};

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

/** Fecha + hora cuando se conoce la hora exacta (creadoEn) — si no, solo la
 * fecha, sin inventar una hora que no tenemos. */
function fechaConHora(resena: ResenaCRM): string {
  if (!resena.creadoEn) return fechaCorta(resena.fecha);
  const d = new Date(resena.creadoEn);
  return `${d.toLocaleDateString("es-AR")}, ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

function iniciales(nombre: string): string {
  return (nombre || "?").trim().slice(0, 1).toUpperCase();
}

function TarjetaResena({
  resena,
  tonoMarca,
  codigo,
  onResuelta,
}: {
  resena: ResenaCRM;
  tonoMarca: TonoMarca;
  codigo: string;
  onResuelta: (id: number) => void;
}) {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(
    resena.respuestaSugerida || generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, 0),
  );
  const [saliendo, setSaliendo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function regenerar() {
    const siguiente = intento + 1;
    setIntento(siguiente);
    setRespuesta(generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, siguiente));
  }

  function copiar() {
    navigator.clipboard.writeText(respuesta).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function aprobar() {
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("id", String(resena.id));
    fd.set("respuesta", respuesta);
    startTransition(async () => {
      await accionAprobarResenaPortal(fd);
      setSaliendo(true);
      setTimeout(() => onResuelta(resena.id), 300);
    });
  }

  function descartar() {
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("id", String(resena.id));
    startTransition(async () => {
      await accionDescartarResenaPortal(fd);
      setSaliendo(true);
      setTimeout(() => onResuelta(resena.id), 300);
    });
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 transition-all duration-300 ${
        saliendo ? "-translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {iniciales(resena.autor)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{resena.autor}</div>
            <div className="text-xs text-slate-400">{fechaConHora(resena)}</div>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[resena.estrellas]}`}>
          {"★".repeat(resena.estrellas)}
          <span className="text-slate-200">{"★".repeat(5 - resena.estrellas)}</span>
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{resena.texto}</p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Respuesta sugerida — editala si querés
          </span>
          <button
            type="button"
            onClick={regenerar}
            className="text-[11px] font-medium text-brand-fg hover:underline"
          >
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
        <button type="button" disabled={pendiente} onClick={aprobar} className={`${btnSuccess} !px-3.5 !py-1.5 !text-xs`}>
          <IconCheck size={13} /> Aprobar respuesta
        </button>
        <button type="button" onClick={copiar} className={`${btnSecondary} !px-3.5 !py-1.5 !text-xs`}>
          {copiado ? "¡Copiada!" : "Copiar texto"}
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={descartar}
          className={`${btnGhost} ml-auto !text-xs hover:!text-rose-600`}
        >
          Descartar
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Al aprobar, guardamos esta respuesta acá. Todavía no podemos publicarla sola en Google —
        copiala y pegala vos como respuesta de la reseña.
      </p>
    </div>
  );
}

export default function GestionResenas({
  resenasIniciales,
  tonoMarca,
  codigo,
}: {
  resenasIniciales: ResenaCRM[];
  tonoMarca: TonoMarca;
  codigo: string;
}) {
  const [pendientes, setPendientes] = useState(resenasIniciales);

  if (pendientes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No tenés reseñas pendientes de responder por ahora.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {pendientes.length} reseña{pendientes.length === 1 ? "" : "s"} esperando respuesta.
      </p>
      <div className="space-y-3">
        {pendientes.map((r) => (
          <TarjetaResena
            key={r.id}
            resena={r}
            tonoMarca={tonoMarca}
            codigo={codigo}
            onResuelta={(id) => setPendientes((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
