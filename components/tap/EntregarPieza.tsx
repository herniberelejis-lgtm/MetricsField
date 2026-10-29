"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { entregarPieza, sumarPieza } from "@/app/t/actions";
import { olvidarPiezaMia } from "@/lib/piezas-mias";
import { BOTON_PRINCIPAL, BOTON_SECUNDARIO, BRAND, FONDO, INK, INK_SOFT, LINE, SOMBRA, TARJETA } from "./estilo";

// Darle la pieza a otro negocio (el revendedor que la vende, o un dueño que
// la regala): PIN nuevo solo para el dueño nuevo, este celular deja de
// manejarla y se arma el mensaje para mandárselo por WhatsApp. Si fue un
// error, "volver a sumarla" con el PIN nuevo la recupera.
export default function EntregarPieza({ slug, nombre }: { slug: string; nombre: string }) {
  const [elegirPin, setElegirPin] = useState(false);
  const [pinElegido, setPinElegido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ pin: string; nombre: string } | null>(null);
  const [recuperada, setRecuperada] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [origen, setOrigen] = useState("");
  const [pendiente, startTransition] = useTransition();
  useEffect(() => setOrigen(window.location.origin), []);

  const negocio = nombre || "tu negocio";

  function entregar() {
    setError(null);
    if (elegirPin && pinElegido.length < 4) {
      setError("El PIN tiene que ser de 4 a 8 números.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await entregarPieza(slug, elegirPin ? pinElegido : undefined);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        olvidarPiezaMia(slug);
        await fetch("/t/llavero", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "quitar", codigo: slug }),
        }).catch(() => {});
        setHecho({ pin: r.pin, nombre: r.nombre || negocio });
      } catch {
        setError("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
      }
    });
  }

  function recuperar() {
    if (!hecho) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await sumarPieza(slug, hecho.pin);
        if (r.ok) setRecuperada(true);
        else setError(r.error ?? "No se pudo.");
      } catch {
        setError("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
      }
    });
  }

  if (hecho) {
    const mensaje =
      `¡Hola! Tu pieza de MetricsField ya está lista: cada cliente que la escanee va directo a dejarle una reseña a ${hecho.nombre} en Google.\n\n` +
      `Si algún día la querés cambiar, entrá a ${origen.replace(/^https?:\/\//, "")}/t/${slug}/editar y poné este PIN: ${hecho.pin}\n\n` +
      `Guardá este mensaje.`;
    async function copiar() {
      try {
        await navigator.clipboard.writeText(mensaje);
        setCopiado(true);
      } catch {
        // el mensaje queda a la vista
      }
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: FONDO }}>
        <div className={`${TARJETA} text-center`} style={SOMBRA}>
          {recuperada ? (
            <>
              <h1 className="text-[20px] font-semibold" style={{ color: INK }}>
                La recuperaste
              </h1>
              <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
                Volvió a tus piezas. Su PIN ahora es <b className="font-mono">{hecho.pin}</b>.
              </p>
              <Link href="/t/mis-piezas" className={`mt-6 ${BOTON_PRINCIPAL}`} style={{ backgroundColor: BRAND }}>
                Ir a mis piezas
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold" style={{ color: INK }}>
                ¡Entregada!
              </h1>
              <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
                Ahora es de <b style={{ color: INK }}>{hecho.nombre}</b>. Su PIN nuevo es:
              </p>
              <p className="mt-3 font-mono text-[34px] font-bold tracking-[0.25em]" style={{ color: INK }}>
                {hecho.pin}
              </p>
              <p className="mt-2 text-[13px]" style={{ color: INK_SOFT }}>
                Mandale este mensaje al dueño: con eso la puede cambiar si algún día lo necesita.
              </p>
              <pre
                className="mt-3 whitespace-pre-wrap rounded-xl px-3.5 py-3 text-left font-sans text-[12.5px] leading-snug"
                style={{ background: "#f1f5fb", color: INK }}
              >
                {mensaje}
              </pre>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noopener"
                className={`mt-4 ${BOTON_PRINCIPAL}`}
                style={{ backgroundColor: "#1a8d48" }}
              >
                Mandar por WhatsApp
              </a>
              <button type="button" onClick={copiar} className={`mt-2.5 ${BOTON_SECUNDARIO}`} style={{ borderColor: LINE, color: INK }}>
                {copiado ? "¡Mensaje copiado!" : "Copiar mensaje"}
              </button>
              <Link href="/t/mis-piezas" className="mt-5 inline-block text-[14px] font-medium underline" style={{ color: BRAND }}>
                Volver a mis piezas
              </Link>
              <button
                type="button"
                onClick={recuperar}
                disabled={pendiente}
                className="mt-3 block w-full text-[12.5px] underline"
                style={{ color: INK_SOFT }}
              >
                {pendiente ? "Recuperando…" : "Me equivoqué: volver a sumarla a mis piezas"}
              </button>
            </>
          )}
          {error && (
            <p className="mt-3 rounded-lg px-3 py-2 text-[13.5px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: FONDO }}>
      <div className={TARJETA} style={SOMBRA}>
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
            MetricsField
          </div>
          <h1 className="mt-1 text-[20px] font-semibold" style={{ color: INK }}>
            Entregársela a otro negocio
          </h1>
        </div>

        <div className="mt-5 rounded-xl px-4 py-3" style={{ background: "#f1f5fb" }}>
          <span className="text-[12px]" style={{ color: INK_SOFT }}>
            Hoy lleva a dejar una reseña a
          </span>
          <p className="text-[15px] font-medium" style={{ color: INK }}>
            {negocio}
          </p>
          <a href={`/t/${slug}/editar`} className="mt-1 inline-block text-[12.5px] underline" style={{ color: BRAND }}>
            ¿No es el negocio que la recibe? Cambiala primero
          </a>
        </div>

        <p className="mt-5 text-[14px] font-medium" style={{ color: INK }}>
          Al entregarla:
        </p>
        <ul className="mt-2 space-y-1.5 text-[13.5px] leading-snug" style={{ color: INK_SOFT }}>
          <li>✓ Le ponemos un PIN nuevo, solo para el dueño, y te armamos el mensaje para mandárselo.</li>
          <li>✓ Sale de tus piezas: este celular ya no la puede cambiar.</li>
          <li>✓ Sigue funcionando igual: nada que reimprimir ni volver a grabar.</li>
        </ul>

        <label className="mt-4 flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={elegirPin}
            onChange={(e) => setElegirPin(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#2563eb]"
          />
          <span className="text-[13px]" style={{ color: INK }}>
            Quiero elegir yo el PIN nuevo
          </span>
        </label>
        {elegirPin && (
          <input
            value={pinElegido}
            onChange={(e) => setPinElegido(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN nuevo, ej: 2580"
            aria-label="PIN nuevo"
            className="mt-2.5 w-full rounded-xl border px-3.5 py-3 text-center text-[18px] tracking-[0.2em] outline-none"
            style={{ borderColor: LINE, color: INK }}
          />
        )}

        {error && (
          <p className="mt-4 rounded-lg px-3 py-2 text-[13.5px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={entregar}
          disabled={pendiente}
          className={`mt-6 ${BOTON_PRINCIPAL}`}
          style={{ backgroundColor: BRAND }}
        >
          {pendiente ? "Entregando…" : `Entregar a ${negocio}`}
        </button>
        <Link href="/t/mis-piezas" className={`mt-2.5 ${BOTON_SECUNDARIO}`} style={{ borderColor: LINE, color: INK }}>
          Cancelar
        </Link>
      </div>
    </div>
  );
}
