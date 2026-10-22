"use client";

import { useState } from "react";

export type Prioridad = { texto: string; href: string; tono: "urgente" | "atencion" | "info" };

const COLOR_TONO: Record<Prioridad["tono"], string> = {
  // "Para mejorar" (durazno) solo para lo urgente; el resto, tonos de dato.
  urgente: "bg-[#F4B886]",
  atencion: "bg-[#A9C5E6]",
  info: "bg-[#D3D9E2]",
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
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#E4E6EA] bg-white">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F7F9FC]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_TONO[masUrgente.tono]}`} aria-hidden />
          <span className="text-[13px] font-semibold text-slate-800">Necesita tu atención</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#FFF4E8] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#8A3F00]">
            {prioridades.length}
          </span>
          <IconChevronDown className={`text-slate-600 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </span>
      </button>
      {abierto && (
        <div className="divide-y divide-[#EEF0F3] border-t border-[#EEF0F3]">
          {prioridades.map((p) => (
            <a
              key={p.href + p.texto}
              href={p.href}
              className="flex min-h-[44px] items-center gap-3 px-4 py-2.5 text-[13px] leading-snug text-slate-700 transition hover:bg-[#F7F9FC]"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_TONO[p.tono]}`} aria-hidden />
              <span className="flex-1">{p.texto}</span>
              <span className="text-slate-600" aria-hidden>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
