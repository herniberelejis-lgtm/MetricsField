"use client";

import { useState } from "react";

export type Prioridad = { texto: string; href: string; tono: "urgente" | "atencion" | "info" };

const COLOR_TONO: Record<Prioridad["tono"], string> = {
  urgente: "bg-slate-900",
  atencion: "bg-slate-600",
  info: "bg-slate-300",
};

function IconChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// "Necesita tu atención" arranca colapsado como un botón — el dueño ve de
// entrada cuántos pendientes tiene sin que el panel le ocupe media pantalla
// al abrir el portal, y despliega la lista completa cuando quiere resolverlos.
export default function PrioridadesPanel({ prioridades }: { prioridades: Prioridad[] }) {
  const [abierto, setAbierto] = useState(false);

  if (prioridades.length === 0) return null;
  const masUrgente = prioridades[0];

  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-white/60 bg-white/65 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/50"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_TONO[masUrgente.tono]}`} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Necesita tu atención</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            {prioridades.length}
          </span>
          <IconChevronDown className={`text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </span>
      </button>
      {abierto && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {prioridades.map((p) => (
            <a
              key={p.href + p.texto}
              href={p.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_TONO[p.tono]}`} aria-hidden />
              <span className="flex-1">{p.texto}</span>
              <span className="text-slate-300" aria-hidden>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
