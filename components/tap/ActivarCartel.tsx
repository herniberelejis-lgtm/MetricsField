"use client";

import { useEffect, useState, useTransition } from "react";
import { activarCartel } from "@/app/t/actions";
import type { LugarParaResena } from "@/lib/places";
import { USOS_PIEZAS } from "@/lib/onboarding";
import AyudaActivacion from "./AyudaActivacion";
import BuscarNegocio from "./BuscarNegocio";
import ComoConseguirLink from "./ComoConseguirLink";
import GrabarChip from "./GrabarChip";
import OfertaPrueba from "./OfertaPrueba";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// Primera vez que se escanea una pieza de hardware que nadie configuró
// todavía (canal Mercado Libre: se vende suelta, sin agencia de por medio).
// Quien la compró la activa acá en tres pasos: elige su negocio de una lista
// (el link de reseña lo trae Google), elige un PIN y, si quiere, deja un
// contacto para el aviso semanal gratis. Nada de esto pasa por el CRM: vive
// en la propia fila de links_nfc (ver lib/db/links.ts: activarAutogestion).
//
// Quien compró varias piezas las activa desde el mismo celular: lo que cargó
// en la primera queda guardado en este navegador y la siguiente ofrece usar
// los mismos datos (el PIN no se guarda).

const CLAVE_RECUERDO = "mf-activacion";

interface Recuerdo {
  nombre: string;
  lugar: LugarParaResena | null;
  url: string;
  email: string;
  whatsapp: string;
  acepta: boolean;
}

function leerRecuerdo(): Recuerdo | null {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE_RECUERDO) || "null") as Recuerdo | null;
    return r && (r.lugar || r.url) && r.nombre ? r : null;
  } catch {
    return null;
  }
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: BRAND }}
        >
          {n}
        </span>
        <span className="text-[15px] font-medium" style={{ color: INK }}>
          {titulo}
        </span>
      </div>
      {children}
    </section>
  );
}

export default function ActivarCartel({ slug }: { slug: string }) {
  const [lugar, setLugar] = useState<LugarParaResena | null>(null);
  const [sesionToken, setSesionToken] = useState<string | undefined>();
  const [aMano, setAMano] = useState(false);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [pin, setPin] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [recuerdo, setRecuerdo] = useState<Recuerdo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ nombre: string; pin: string; acepta: boolean; conMail: boolean } | null>(null);
  const [pendiente, startTransition] = useTransition();

  useEffect(() => setRecuerdo(leerRecuerdo()), []);

  function usarRecuerdo(r: Recuerdo) {
    setLugar(r.lugar);
    setSesionToken(undefined);
    setAMano(!r.lugar);
    setNombre(r.nombre);
    setUrl(r.url);
    setAcepta(r.acepta);
    setEmail(r.email);
    setWhatsapp(r.whatsapp);
    setRecuerdo(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lugar && !aMano) {
      setError("Buscá y elegí tu negocio (paso 1).");
      return;
    }
    startTransition(async () => {
      const res = await activarCartel(slug, {
        nombre: lugar ? lugar.nombre : nombre,
        placeId: lugar?.placeId ?? null,
        sesionToken: lugar ? sesionToken : undefined,
        url: lugar ? "" : url,
        pin,
        email,
        whatsapp,
        aceptaNovedades: acepta,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo activar.");
        return;
      }
      const nombreFinal = lugar ? lugar.nombre : nombre;
      try {
        const guardar: Recuerdo = { nombre: nombreFinal, lugar, url: lugar ? "" : url, email, whatsapp, acepta };
        localStorage.setItem(CLAVE_RECUERDO, JSON.stringify(guardar));
      } catch {
        // sin almacenamiento local: la próxima pieza se completa a mano
      }
      setListo({ nombre: nombreFinal, pin, acepta, conMail: Boolean(email.trim()) });
    });
  }

  if (listo) return <Listo slug={slug} {...listo} />;

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 px-4 py-8" style={{ background: "#f8f9fa" }}>
      <form
        onSubmit={enviar}
        className="w-full max-w-md rounded-2xl bg-white px-5 py-7 sm:px-7"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
      >
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
            MetricsField
          </div>
          <h1 className="mt-1 text-[20px] font-semibold" style={{ color: INK }}>
            Activá tu pieza en 3 pasos
          </h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: INK_SOFT }}>
            Una sola vez y queda lista: cada cliente que la escanee va directo a dejarte una reseña en Google. ¿Dudas?
            Abajo tenés videos y ayuda.
          </p>
        </div>

        {recuerdo && (
          <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: "#eef4ff" }}>
            <p className="text-[14px]" style={{ color: INK }}>
              ¿Esta pieza también es para <b>{recuerdo.nombre}</b>?
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => usarRecuerdo(recuerdo)}
                className="flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium text-white"
                style={{ backgroundColor: BRAND }}
              >
                Sí, usar los mismos datos
              </button>
              <button
                type="button"
                onClick={() => setRecuerdo(null)}
                className="rounded-full border px-4 py-2.5 text-[14px]"
                style={{ borderColor: LINE, color: INK }}
              >
                No
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <Paso n={1} titulo="Buscá tu negocio">
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
                    ¿No aparece? Pegá el link de tu reseña a mano
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre de tu negocio"
                  aria-label="Nombre de tu negocio"
                  className="w-full rounded-xl border px-3.5 py-3 text-[16px] outline-none"
                  style={{ borderColor: LINE, color: INK }}
                />
                <div>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    type="url"
                    placeholder="https://g.page/r/..."
                    aria-label="Link de tu reseña de Google"
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
                  Volver a buscar mi negocio
                </button>
              </div>
            )}
          </Paso>

          <Paso n={2} titulo="Elegí un PIN de 4 números">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej: 2580"
              aria-label="PIN de 4 números"
              className="w-full rounded-xl border px-3.5 py-3 text-center text-[20px] tracking-[0.3em] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
            <p className="mt-1.5 text-[12px]" style={{ color: INK_SOFT }}>
              Solo para cambiar algo más adelante. Anotalo.
            </p>
          </Paso>

          <Paso n={3} titulo="¿Querés saber cuántos la usan? (opcional)">
            <label className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3" style={{ borderColor: acepta ? BRAND : LINE }}>
              <input
                type="checkbox"
                checked={acepta}
                onChange={(e) => setAcepta(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#2563eb]"
              />
              <span className="text-[13.5px] leading-snug" style={{ color: INK }}>
                Mandame gratis cada lunes cuántas personas usaron mi pieza.
                <span className="mt-0.5 block text-[12px]" style={{ color: INK_SOFT }}>
                  MetricsField también puede escribirme sobre sus servicios. Me doy de baja cuando quiera.
                </span>
              </span>
            </label>
            {acepta && (
              <div className="mt-3 space-y-2.5">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Tu mail"
                  aria-label="Tu mail"
                  className="w-full rounded-xl border px-3.5 py-3 text-[16px] outline-none"
                  style={{ borderColor: LINE, color: INK }}
                />
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Tu WhatsApp (opcional), ej: 351 555 1234"
                  aria-label="Tu WhatsApp"
                  className="w-full rounded-xl border px-3.5 py-3 text-[16px] outline-none"
                  style={{ borderColor: LINE, color: INK }}
                />
              </div>
            )}
          </Paso>
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
          {pendiente ? "Activando…" : "Activar mi pieza"}
        </button>
      </form>
      <AyudaActivacion slug={slug} />
    </div>
  );
}

function Listo({
  slug,
  nombre,
  pin,
  acepta,
  conMail,
}: {
  slug: string;
  nombre: string;
  pin: string;
  acepta: boolean;
  conMail: boolean;
}) {
  // El dominio real donde está parado (preview, producción) — después de
  // montar, para que el HTML del servidor y el del navegador coincidan.
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);
  return (
    <div className="flex min-h-screen flex-col items-center gap-5 px-4 py-8" style={{ background: "#f8f9fa" }}>
      <div
        className="w-full max-w-md rounded-2xl bg-white px-5 py-7 sm:px-7"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#e6f4ea" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="#1e8e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-3 text-[20px] font-semibold" style={{ color: INK }}>
            ¡Listo! Tu pieza ya funciona
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
            Cada cliente que la toque o escanee va directo a dejarle una reseña a <b style={{ color: INK }}>{nombre}</b>.
          </p>
        </div>

        <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: "#eef4ff", color: INK }}>
          <p className="text-[14px] font-medium">Probala ahora</p>
          <p className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
            Escaneá el QR de la pieza con la cámara: se tiene que abrir la reseña de tu negocio. El chip NFC se graba
            aparte (abajo te mostramos cómo).
          </p>
        </div>

        <h2 className="mt-6 text-[15px] font-semibold" style={{ color: INK }}>
          Cómo usar cada pieza
        </h2>
        <ul className="mt-2.5 space-y-3">
          {USOS_PIEZAS.map((u) => (
            <li key={u.pieza} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto estática chica */}
              <img src={u.foto} alt={u.pieza} width={96} height={72} className="h-[72px] w-24 shrink-0 rounded-lg object-cover" loading="lazy" />
              <div className="text-[13px] leading-snug" style={{ color: INK_SOFT }}>
                <b className="block text-[14px]" style={{ color: INK }}>
                  {u.pieza}
                </b>
                {u.donde} {u.como}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "#fff8e6", color: "#7a5200" }}>
          Pedile la reseña a todos por igual y sin ofrecer nada a cambio: es lo que pide Google.
        </p>

        <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: "#f8f9fa" }}>
          <p className="text-[14px] font-medium" style={{ color: INK }}>
            ¿Tenés más piezas?
          </p>
          <p className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
            Escaneá la siguiente con este mismo celular: te va a ofrecer los mismos datos y la activás en un toque.
          </p>
        </div>

        <div className="mt-3 rounded-xl px-4 py-3.5 text-[12.5px]" style={{ background: "#f8f9fa", color: INK_SOFT }}>
          Tu PIN: <b className="font-mono text-[14px]" style={{ color: INK }}>{pin}</b>. Para cambiar el link o el nombre, entrá a
          <div className="mt-1 break-all font-mono text-[11.5px]" style={{ color: INK }}>
            {host}/t/{slug}/editar
          </div>
        </div>

        {acepta ? (
          <p className="mt-4 text-center text-[13px]" style={{ color: INK_SOFT }}>
            {conMail
              ? "El lunes te llega por mail tu primer aviso con cuántas personas usaron tu pieza."
              : "Te vamos a escribir por WhatsApp para contarte cuántas personas la usan."}
          </p>
        ) : (
          <p className="mt-4 text-center text-[13px]" style={{ color: INK_SOFT }}>
            ¿Querés ver cuántas reseñas te trae y cómo vas contra tu competencia?{" "}
            <a href="https://metricsfield.com/reputacion" className="font-medium underline" style={{ color: BRAND }}>
              Conocé el panel de MetricsField
            </a>
          </p>
        )}
      </div>
      <GrabarChip slug={slug} titulo="Ahora grabá el chip NFC" />
      <OfertaPrueba />
    </div>
  );
}
