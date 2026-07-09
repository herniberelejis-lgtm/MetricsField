"use client";

import { useState, useTransition } from "react";
import { activarCartel } from "@/app/t/actions";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// Primera vez que se escanea una pieza de hardware que nadie configuró
// todavía (canal Mercado Libre: se vende suelta, sin agencia de por medio).
// Quien la compró carga acá los datos de su negocio — nada de esto pasa
// por el CRM ni el panel interno, es autosuficiente en la propia fila de
// links_nfc (ver lib/db.ts: activarAutogestion).
export default function ActivarCartel({ slug }: { slug: string }) {
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin !== pinConfirmar) {
      setError("Los dos PIN no coinciden.");
      return;
    }
    startTransition(async () => {
      const res = await activarCartel(slug, nombre, url, pin);
      if (res.ok) setListo(true);
      else setError(res.error ?? "No se pudo activar.");
    });
  }

  if (listo) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-5 py-10"
        style={{ background: "#f8f9fa" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white px-7 py-8 text-center"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
        >
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "#e6f4ea" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#1e8e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-3 text-[17px] font-medium" style={{ color: INK }}>
            ¡Listo, tu cartel ya está activo!
          </p>
          <p className="mt-2 text-[13px]" style={{ color: INK_SOFT }}>
            Desde ahora, cualquiera que lo toque o escanee va directo a dejarte una reseña en Google.
          </p>
          <div className="mt-5 rounded-xl px-3.5 py-3 text-left text-[12.5px]" style={{ background: "#f8f9fa", color: INK_SOFT }}>
            Guardá esto para más adelante, por si cambiás el link de reseña:
            <div className="mt-1 break-all font-mono text-[11.5px]" style={{ color: INK }}>
              taply.app/t/{slug}/editar
            </div>
            Te va a pedir el PIN que elegiste recién.
          </div>
        </div>
      </div>
    );
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
            Activá tu cartel
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: INK_SOFT }}>
            Este QR/NFC todavía no está configurado. Completá esto una vez y queda listo.
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
              placeholder="Ej: Barbería Güemes"
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
              placeholder="https://g.page/r/..."
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
            <span className="mt-1.5 block text-[11.5px]" style={{ color: INK_SOFT }}>
              En Google Maps: buscá tu negocio → "Escribir una reseña" → copiá el link de esa página.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-medium" style={{ color: INK }}>
                Elegí un PIN
              </span>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
                inputMode="numeric"
                placeholder="4 a 8 números"
                className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
                style={{ borderColor: LINE, color: INK }}
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium" style={{ color: INK }}>
                Repetilo
              </span>
              <input
                value={pinConfirmar}
                onChange={(e) => setPinConfirmar(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
                inputMode="numeric"
                placeholder="De nuevo"
                className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
                style={{ borderColor: LINE, color: INK }}
              />
            </label>
          </div>
          <p className="text-[11.5px]" style={{ color: INK_SOFT }}>
            Con este PIN vas a poder cambiar el link más adelante, si hace falta.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente}
          className="mt-5 w-full rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {pendiente ? "Activando…" : "Activar mi cartel"}
        </button>
      </form>
    </div>
  );
}
