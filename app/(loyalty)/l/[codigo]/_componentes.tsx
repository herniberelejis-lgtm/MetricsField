"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  accionPedirCanje,
  accionReclamarMision,
  accionRegistrarse,
  accionUnirse,
  type EstadoFormulario,
} from "./actions";

const input =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-900/10";
const botonPrincipal =
  "inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60";

function Consentimientos({ nombreComercio }: { nombreComercio: string }) {
  return (
    <div className="space-y-3 text-left text-sm text-slate-600">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="acepta" required className="mt-1 h-4 w-4 shrink-0 accent-slate-900" />
        <span>
          Acepto que {nombreComercio} y MetricsField guarden mis datos para darme mi tarjeta de puntos y que se
          guarde en Google Wallet.{" "}
          <a href="/privacy#loyalty" target="_blank" className="underline underline-offset-2">
            Cómo usamos tus datos
          </a>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 shrink-0 accent-slate-900" />
        <span>Quiero recibir promociones de {nombreComercio} (opcional).</span>
      </label>
    </div>
  );
}

function MensajeError({ estado }: { estado: EstadoFormulario }) {
  if (!estado) return null;
  return (
    <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {estado.error}
    </p>
  );
}

export function FormularioRegistro({
  comercioId,
  nombreComercio,
  referido,
}: {
  comercioId: string;
  nombreComercio: string;
  referido: string;
}) {
  const [estado, enviar, enviando] = useActionState(accionRegistrarse, null);
  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="comercioId" value={comercioId} />
      <input type="hidden" name="ref" value={referido} />
      <input name="nombre" autoComplete="given-name" placeholder="Tu nombre" required maxLength={80} className={input} />
      <input
        name="telefono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="Tu celular (ej. 351 555 1234)"
        required
        maxLength={40}
        className={input}
      />
      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Email (opcional)"
        maxLength={120}
        className={input}
      />
      <Consentimientos nombreComercio={nombreComercio} />
      <MensajeError estado={estado} />
      <button type="submit" disabled={enviando} className={botonPrincipal}>
        {enviando ? "Creando tu tarjeta…" : "Quiero mi tarjeta"}
      </button>
    </form>
  );
}

export function FormularioUnirse({ comercioId, nombreComercio }: { comercioId: string; nombreComercio: string }) {
  const [estado, enviar, enviando] = useActionState(accionUnirse, null);
  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="comercioId" value={comercioId} />
      <Consentimientos nombreComercio={nombreComercio} />
      <MensajeError estado={estado} />
      <button type="submit" disabled={enviando} className={botonPrincipal}>
        {enviando ? "Creando tu tarjeta…" : "Sumarme"}
      </button>
    </form>
  );
}

/** Misión autodeclarada: abre el destino (Google, Instagram…) en otra
 * pestaña y suma los puntos. Se le cree a la persona, como hace la
 * competencia con la misma misión (ver §6 del doc de Loyalty). */
export function BotonMision({
  comercioId,
  misionId,
  url,
  texto,
  puntos,
  cumplida,
}: {
  comercioId: string;
  misionId: string;
  url: string;
  texto: string;
  puntos: number;
  cumplida: boolean;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  if (cumplida) {
    return <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">✓ Hecha</span>;
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (url) window.open(url, "_blank", "noopener,noreferrer");
          const fd = new FormData();
          fd.set("comercioId", comercioId);
          fd.set("misionId", misionId);
          startTransition(async () => {
            const r = await accionReclamarMision(fd);
            setMensaje(r.mensaje);
          });
        }}
        className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {texto} · +{puntos}
      </button>
      {mensaje && <span className="text-xs text-slate-500">{mensaje}</span>}
    </div>
  );
}

export function BotonCanjear({
  comercioId,
  beneficioId,
  alcanza,
}: {
  comercioId: string;
  beneficioId: string;
  alcanza: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(accionPedirCanje, null);
  return (
    <form action={enviar} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="comercioId" value={comercioId} />
      <input type="hidden" name="beneficioId" value={beneficioId} />
      <button
        type="submit"
        disabled={!alcanza || enviando}
        className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
      >
        {enviando ? "…" : "Canjear"}
      </button>
      {estado && <span className="max-w-[12rem] text-right text-xs text-rose-600">{estado.error}</span>}
    </form>
  );
}

/** Minutos y segundos que le quedan al código de canje. */
export function CuentaRegresiva({ hasta }: { hasta: string }) {
  const [resta, setResta] = useState(() => new Date(hasta).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setResta(new Date(hasta).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasta]);
  if (resta <= 0) return <span>Venció — pedí uno nuevo.</span>;
  const min = Math.floor(resta / 60_000);
  const seg = Math.floor((resta % 60_000) / 1000);
  return (
    <span>
      Vence en {min}:{String(seg).padStart(2, "0")}
    </span>
  );
}

export function CompartirReferido({ link, nombreComercio, puntos }: { link: string; nombreComercio: string; puntos: number }) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = `Sumate al club de ${nombreComercio} y arrancá con puntos de regalo: ${link}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white"
      >
        Invitar por WhatsApp · +{puntos}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
          } catch {
            setCopiado(false);
          }
        }}
        className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700"
      >
        {copiado ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
