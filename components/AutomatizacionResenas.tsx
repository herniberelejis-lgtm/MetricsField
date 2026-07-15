"use client";

import { useState, useTransition } from "react";
import type { ResenaCRM } from "@/lib/types";
import { accionActualizarAutomatizacionResenasPortal } from "@/app/portal/actions";
import { IconCheck, IconClock, IconZap } from "@/components/ui";

// Automatización de reseñas positivas: la mitad del trabajo de "gestión de
// reseñas" que el dueño NO tiene que hacer. Ya está construida de punta a
// punta contra la Reviews API real de Google (lib/google-reviews.ts) — lo
// único que falta es que Google apruebe el acceso (hoy exige una revisión
// aparte) y que alguien cargue esa aprobación como GOOGLE_REVIEWS_API_ENABLED.
// Mientras tanto el toggle de acá abajo ya guarda la preferencia del cliente,
// para que el día que se prenda el flag, ya arranque respetándola.

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

export default function AutomatizacionResenas({
  codigo,
  activa,
  umbral,
  apiHabilitada,
  resenasAutomaticas,
}: {
  codigo: string;
  activa: boolean;
  umbral: 4 | 5;
  apiHabilitada: boolean;
  resenasAutomaticas: ResenaCRM[];
}) {
  const [activaLocal, setActivaLocal] = useState(activa);
  const [umbralLocal, setUmbralLocal] = useState<4 | 5>(umbral);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function guardar(siguienteActiva: boolean, siguienteUmbral: 4 | 5) {
    const fd = new FormData();
    fd.set("codigo", codigo);
    if (siguienteActiva) fd.set("autoResponderPositivas", "on");
    fd.set("autoResponderUmbral", String(siguienteUmbral));
    startTransition(async () => {
      await accionActualizarAutomatizacionResenasPortal(fd);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Respuestas automáticas a reseñas positivas</p>

      {apiHabilitada ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
          <IconCheck size={13} className="shrink-0" />
          Activo: en cuanto llega una reseña de {umbralLocal}★ o más, se responde sola.
        </p>
      ) : (
        <p className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <IconClock size={14} className="mt-0.5 shrink-0" />
          <span>
            Esta función ya está lista, pero en pausa: todavía estamos esperando que
            Google apruebe el acceso a la API que permite publicar respuestas
            automáticamente (es una revisión aparte que pidió Taply, no depende de vos).
            Guardá tu preferencia igual — en cuanto la aprobación llegue, arranca
            respetándola sin que tengas que hacer nada.
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activaLocal}
            onChange={(e) => {
              setActivaLocal(e.target.checked);
              guardar(e.target.checked, umbralLocal);
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          Responder solas mis reseñas positivas
        </label>
        <select
          value={umbralLocal}
          disabled={!activaLocal}
          onChange={(e) => {
            const v = Number(e.target.value) === 5 ? 5 : 4;
            setUmbralLocal(v);
            guardar(activaLocal, v);
          }}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50"
        >
          <option value={4}>de 4★ para arriba</option>
          <option value={5}>solo 5★</option>
        </select>
        {(pendiente || guardado) && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            {pendiente ? "Guardando…" : <>Guardado <IconCheck size={12} className="text-emerald-600" /></>}
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Respondidas automáticamente
        </p>
        {resenasAutomaticas.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-400">
            Todavía no se respondió ninguna sola — van a aparecer acá apenas se active
            la publicación automática.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {resenasAutomaticas.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-medium text-slate-700">{r.autor}</span>
                  <span className="text-amber-400">{"★".repeat(r.estrellas)}</span>
                  <span>{fechaCorta(r.fecha)}</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    <IconZap size={11} /> respondida sola
                  </span>
                </div>
                {r.respuestaSugerida && (
                  <p className="mt-1 text-slate-600">{r.respuestaSugerida}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
