"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sumarPieza } from "@/app/t/actions";
import { recordarPiezaMia } from "@/lib/piezas-mias";
import { BotonWhatsapp } from "./AyudaActivacion";
import { BOTON_PRINCIPAL, BRAND, FONDO, INK, INK_SOFT, LINE, SOMBRA, TARJETA } from "./estilo";

// El PIN se pide una sola vez por celular: al ponerlo bien, la pieza queda
// en el llavero de este navegador y todo lo demás (cambiarla, entregarla)
// ya no lo pide. Se usa en /editar y /entregar sin autorización, y al
// escanear una pieza en modo "sumar".
export default function PuertaPin({
  slug,
  nombre,
  titulo,
  bajada,
  luego,
}: {
  slug: string;
  nombre: string;
  titulo: string;
  bajada: string;
  /** A dónde ir después; sin esto, recarga la misma página (ya autorizada). */
  luego?: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const r = await sumarPieza(slug, pin);
        if (!r.ok) {
          setError(r.error ?? "No se pudo.");
          return;
        }
        recordarPiezaMia(slug);
        if (luego) router.push(luego);
        else router.refresh();
      } catch {
        setError("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: FONDO }}>
      <form onSubmit={enviar} className={`${TARJETA} text-center`} style={SOMBRA}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
          MetricsField
        </div>
        <h1 className="mt-1 text-[20px] font-semibold" style={{ color: INK }}>
          {titulo}
        </h1>
        {nombre && (
          <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
            Hoy lleva a dejar una reseña a <b style={{ color: INK }}>{nombre}</b>.
          </p>
        )}
        <p className="mt-3 text-[13.5px] leading-snug" style={{ color: INK_SOFT }}>
          {bajada}
        </p>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          required
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="PIN"
          aria-label="PIN de la pieza"
          className="mt-5 w-full rounded-xl border px-3.5 py-3 text-center text-[22px] tracking-[0.3em] outline-none"
          style={{ borderColor: LINE, color: INK }}
        />
        {error && (
          <p className="mt-3 rounded-lg px-3 py-2 text-[13.5px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pendiente || pin.length < 4}
          className={`mt-4 ${BOTON_PRINCIPAL}`}
          style={{ backgroundColor: BRAND }}
        >
          {pendiente ? "Revisando…" : "Seguir"}
        </button>
        <details className="mt-4 text-[13px]" style={{ color: INK_SOFT }}>
          <summary className="cursor-pointer underline">¿No tenés el PIN?</summary>
          <p className="mt-2 leading-snug">
            Escribinos por WhatsApp con el código de la pieza (<span className="font-mono">{slug}</span>) y te damos uno
            nuevo.
          </p>
          <BotonWhatsapp mensaje={`Hola, necesito el PIN de mi pieza de MetricsField ${slug}. ¿Me ayudan?`}>
            Pedir un PIN nuevo
          </BotonWhatsapp>
        </details>
      </form>
    </div>
  );
}
