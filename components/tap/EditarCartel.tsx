"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarCartel } from "@/app/t/actions";
import type { LugarParaResena } from "@/lib/places";
import { Paso } from "./ActivarCartel";
import BuscarNegocio from "./BuscarNegocio";
import ComoConseguirLink from "./ComoConseguirLink";
import GrabarChip from "./GrabarChip";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// Cambiar a dónde lleva una pieza autogestionada, las veces que haga falta,
// desde un celular que ya la maneja (el PIN se pidió una sola vez, ver
// PuertaPin): buscar el negocio, tocarlo, guardar. Pensado también para el
// revendedor que la muestra en cada local.
export default function EditarCartel({
  slug,
  nombreActual,
  urlActual,
}: {
  slug: string;
  nombreActual: string;
  urlActual: string;
}) {
  const [lugar, setLugar] = useState<LugarParaResena | null>(null);
  const [sesionToken, setSesionToken] = useState<string | undefined>();
  const [aMano, setAMano] = useState(false);
  const [nombre, setNombre] = useState(nombreActual);
  const [url, setUrl] = useState(urlActual);
  const [cambiarPin, setCambiarPin] = useState(false);
  const [pinNuevo, setPinNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actual, setActual] = useState(nombreActual);
  const [guardado, setGuardado] = useState<{ nombre: string; pinNuevo: string } | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lugar && !aMano) {
      setError("Buscá y elegí el negocio (paso 1).");
      return;
    }
    if (cambiarPin && pinNuevo.length < 4) {
      setError("El PIN nuevo tiene que ser de 4 a 8 números.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await editarCartel(slug, "", {
          nombre: lugar ? lugar.nombre : nombre,
          placeId: lugar?.placeId ?? null,
          sesionToken: lugar ? sesionToken : undefined,
          url: lugar ? "" : url,
          pinNuevo: cambiarPin ? pinNuevo : undefined,
        });
        if (!res.ok) {
          setError(res.error ?? "No se pudo guardar.");
          // Ya no la maneja (cambiaron el PIN, venció la sesión de Google):
          // la página vuelve a pedir el PIN.
          if (res.sinAcceso) router.refresh();
          return;
        }
        const nombreFinal = res.nombre || (lugar ? lugar.nombre : nombre);
        setActual(nombreFinal);
        setGuardado({ nombre: nombreFinal, pinNuevo: cambiarPin ? pinNuevo : "" });
      } catch {
        setError("No pudimos conectarnos. Revisá tu internet y probá de nuevo.");
      }
    });
  }

  function otraVez() {
    setGuardado(null);
    setLugar(null);
    setSesionToken(undefined);
    setAMano(false);
    setCambiarPin(false);
    setPinNuevo("");
  }

  const tarjeta = "w-full max-w-md rounded-2xl bg-white px-5 py-7 sm:px-7";
  const sombra = { boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" };

  if (guardado) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-5 px-4 py-8" style={{ background: "#f8f9fa" }}>
        <div className={`${tarjeta} text-center`} style={sombra}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#e6f4ea" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="#1e8e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-3 text-[20px] font-semibold" style={{ color: INK }}>
            ¡Listo! Ya está cambiada
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
            Desde ahora, quien la toque o la escanee va a dejarle una reseña a{" "}
            <b style={{ color: INK }}>{guardado.nombre}</b>. No hace falta volver a grabar el chip.
          </p>
          {guardado.pinNuevo && (
            <p className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#fff8e6", color: "#7a5200" }}>
              El PIN nuevo es <b className="font-mono text-[14px]">{guardado.pinNuevo}</b>. Pasáselo a quien se quede con la
              pieza.
            </p>
          )}
          <div className="mt-5 rounded-xl px-4 py-3.5 text-left" style={{ background: "#eef4ff" }}>
            <p className="text-[14px] font-medium" style={{ color: INK }}>
              Probala
            </p>
            <p className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
              Escaneala con otro celular (por ejemplo el del dueño del local): se abre la reseña del negocio. Desde
              este celular te pregunta qué querés hacer.
            </p>
          </div>
          <button
            type="button"
            onClick={otraVez}
            className="mt-5 w-full rounded-full border px-6 py-3 text-[14.5px] font-medium"
            style={{ borderColor: LINE, color: INK }}
          >
            Cambiarla otra vez
          </button>
          <Link href="/t/mis-piezas" className="mt-4 inline-block text-[14px] font-medium underline" style={{ color: BRAND }}>
            Ver todas mis piezas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 px-4 py-8" style={{ background: "#f8f9fa" }}>
      <form onSubmit={enviar} className={tarjeta} style={sombra}>
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
            MetricsField
          </div>
          <h1 className="mt-1 text-[20px] font-semibold" style={{ color: INK }}>
            Cambiá a dónde lleva tu pieza
          </h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: INK_SOFT }}>
            Las veces que quieras, sin PIN desde este celular. El QR y el chip siguen siendo los mismos.
          </p>
        </div>

        {actual && (
          <div className="mt-5 rounded-xl px-4 py-3" style={{ background: "#f1f5fb" }}>
            <span className="text-[12px]" style={{ color: INK_SOFT }}>
              Hoy lleva a dejar una reseña a
            </span>
            <p className="text-[15px] font-medium" style={{ color: INK }}>
              {actual}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <Paso n={1} titulo="Buscá el negocio nuevo y tocalo">
            {!aMano ? (
              <>
                <BuscarNegocio
                  slug={slug}
                  elegido={lugar}
                  onElegir={(l, token) => {
                    setLugar(l);
                    setSesionToken(token);
                  }}
                />
                {!lugar && (
                  <button
                    type="button"
                    onClick={() => setAMano(true)}
                    className="mt-2 text-[12.5px] underline"
                    style={{ color: INK_SOFT }}
                  >
                    ¿No aparece? Pegá el link de reseña a mano
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del negocio"
                  aria-label="Nombre del negocio"
                  className="w-full rounded-xl border px-3.5 py-3 text-[16px] outline-none"
                  style={{ borderColor: LINE, color: INK }}
                />
                <div>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    type="url"
                    placeholder="https://g.page/r/..."
                    aria-label="Link de reseña de Google"
                    className="w-full rounded-xl border px-3.5 py-3 text-[16px] outline-none"
                    style={{ borderColor: LINE, color: INK }}
                  />
                  <ComoConseguirLink abierto />
                </div>
                <button
                  type="button"
                  onClick={() => setAMano(false)}
                  className="text-[12.5px] underline"
                  style={{ color: INK_SOFT }}
                >
                  Volver a buscar el negocio
                </button>
              </div>
            )}
          </Paso>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={cambiarPin}
              onChange={(e) => setCambiarPin(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#2563eb]"
            />
            <span className="text-[13px] leading-snug" style={{ color: INK }}>
              Cambiar también el PIN
              <span className="block text-[12px]" style={{ color: INK_SOFT }}>
                Solo hace falta si alguien más lo sabe. Para dársela a otro negocio usá &ldquo;Entregar&rdquo;.
              </span>
            </span>
          </label>
          {cambiarPin && (
            <input
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="PIN nuevo (4 a 8 números)"
              aria-label="PIN nuevo"
              className="-mt-3 w-full rounded-xl border px-3.5 py-3 text-center text-[18px] tracking-[0.2em] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-lg px-3 py-2 text-[13.5px]" style={{ background: "#fce8e6", color: "#c5221f" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente}
          className="mt-6 w-full rounded-full px-6 py-4 text-[16px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>

        <div className="mt-4 flex justify-center gap-5 text-[13.5px]">
          <a href={`/t/${slug}/entregar`} className="underline" style={{ color: INK_SOFT }}>
            Entregársela a otro negocio
          </a>
          <Link href="/t/mis-piezas" className="underline" style={{ color: INK_SOFT }}>
            Mis piezas
          </Link>
        </div>
      </form>

      {/* Por si nunca grabó el chip: el link de la pieza no cambia al editarla. */}
      <GrabarChip slug={slug} titulo="Grabar el chip NFC" />
    </div>
  );
}
