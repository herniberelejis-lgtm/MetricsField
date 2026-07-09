"use client";

import { useState, useTransition } from "react";
import { editarCartel } from "@/app/t/actions";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// Reconfigurar una pieza autogestionada — el dueño necesita el PIN que
// eligió al activarla. Todo en un solo paso (PIN + cambios juntos) para no
// tener que armar un flujo de dos pantallas con estado de sesión temporal.
export default function EditarCartel({
  slug,
  nombreActual,
  urlActual,
}: {
  slug: string;
  nombreActual: string;
  urlActual: string;
}) {
  const [nombre, setNombre] = useState(nombreActual);
  const [url, setUrl] = useState(urlActual);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await editarCartel(slug, pin, nombre, url);
      if (res.ok) {
        setGuardado(true);
        setPin("");
      } else {
        setError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10" style={{ background: "#f8f9fa" }}>
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-2xl bg-white px-7 py-8"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
      >
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
            Taply
          </div>
          <p className="mt-1 text-[17px] font-medium" style={{ color: INK }}>
            Editar tu cartel
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: INK_SOFT }}>
            Cambiá lo que necesites y confirmá con tu PIN.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Nombre de tu negocio
            </span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Link de tu reseña de Google
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Tu PIN
            </span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
              inputMode="numeric"
              placeholder="El que elegiste al activarlo"
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
            {error}
          </p>
        )}
        {guardado && (
          <p className="mt-4 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#e6f4ea", color: "#1e8e3e" }}>
            Guardado — ya está actualizado.
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente}
          className="mt-5 w-full rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
