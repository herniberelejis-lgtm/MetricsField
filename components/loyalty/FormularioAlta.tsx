"use client";

import { useState, useTransition } from "react";
import { registrarClienteLoyalty, registrarClickGuardarWallet } from "@/app/(loyalty)/l/[codigo]/actions";

// CONEXIONES
//   Lo renderiza: app/(loyalty)/l/[codigo]/page.tsx (Server Component,
//                 le pasa codigoPublico/programaId/nombreComercio ya
//                 resueltos — este componente no hace ninguna consulta
//                 propia, solo llama a las Server Actions de abajo)
//   Llama a:      registrarClienteLoyalty (el submit del formulario) y
//                 registrarClickGuardarWallet (fire-and-forget, al hacer
//                 click en el botón de guardar) — las dos en
//                 app/(loyalty)/l/[codigo]/actions.ts
//   "use client" porque necesita estado local (los inputs, el resultado
//   tras el alta) y navigator.userAgent (esIOS) — todo lo demás de
//   Loyalty en esta carpeta es Server Component/Action.

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const LINE = "#dfe3e8";
const BRAND = "#2563eb";

// ⚠️ El texto legal de abajo es un BORRADOR (lib/loyalty/textos-legales.ts)
// — no lanzar el piloto con consumidores reales sin que un abogado lo
// revise. Ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §9.
const TEXTO_DATOS =
  "Tratamos tu nombre, teléfono y (si querés) email para administrar tu tarjeta de puntos. " +
  "Es voluntario, pero sin nombre y teléfono no podemos emitirte la tarjeta. Tus datos se " +
  "guardan en servidores fuera de la Argentina y se comparten con Google/Apple para emitir " +
  "el pase. Podés acceder, rectificar o borrar tus datos desde tu tarjeta.";
const TEXTO_WALLET = "Vamos a emitirte un pase de fidelización a tu nombre en tu billetera digital.";
const TEXTO_MARKETING = "Quiero recibir novedades y promociones de este comercio (opcional).";
const TEXTO_EDAD = "Declaro que tengo 16 años o más.";

/** Plataforma detectada del lado del cliente SOLO para decidir qué botón
 * mostrar tras el alta — la que cuenta para las métricas del piloto es
 * la que detecta el servidor (lib/loyalty/plataforma.ts) sobre el mismo
 * User-Agent, no esto. */
function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function FormularioAlta({
  codigoPublico,
  programaId,
  nombreComercio,
}: {
  codigoPublico: string;
  programaId: string;
  nombreComercio: string;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [aceptaWallet, setAceptaWallet] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [declaraEdad, setDeclaraEdad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ linkGoogleWallet?: string; membresiaId?: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await registrarClienteLoyalty({
        codigoPublico,
        nombre,
        telefono,
        email,
        aceptaDatos,
        aceptaWallet,
        aceptaMarketing,
        declaraEdad,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo completar el registro.");
        return;
      }
      setResultado({ linkGoogleWallet: res.linkGoogleWallet });
    });
  }

  if (resultado) {
    const mostrarApple = esIOS();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10" style={{ background: "#f8f9fa" }}>
        <div
          className="w-full max-w-sm rounded-2xl bg-white px-7 py-8 text-center"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
        >
          <p className="text-[17px] font-medium" style={{ color: INK }}>
            ¡Ya tenés tu tarjeta de {nombreComercio}!
          </p>
          <p className="mt-2 text-[13px]" style={{ color: INK_SOFT }}>
            Guardala en tu billetera para no perderla.
          </p>

          <div className="mt-6 space-y-3">
            {resultado.linkGoogleWallet && !mostrarApple && (
              <a
                href={resultado.linkGoogleWallet}
                onClick={() => {
                  void registrarClickGuardarWallet(programaId, resultado.membresiaId ?? "");
                }}
                className="block w-full rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm"
                style={{ backgroundColor: BRAND }}
              >
                Agregar a Google Wallet
              </a>
            )}
            {mostrarApple && (
              <a
                href="/tarjeta/pase.pkpass"
                onClick={() => {
                  void registrarClickGuardarWallet(programaId, resultado.membresiaId ?? "");
                }}
                className="block w-full rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm"
                style={{ backgroundColor: "#000" }}
              >
                Agregar a Apple Wallet
              </a>
            )}
            {!resultado.linkGoogleWallet && !mostrarApple && (
              <p className="text-[13px]" style={{ color: INK_SOFT }}>
                Tu tarjeta ya está activa. En un momento vas a poder guardarla en tu wallet —
                mientras tanto, guardá este link para ver tu saldo.
              </p>
            )}
          </div>

          <a href="/tarjeta" className="mt-5 block text-[12.5px] underline" style={{ color: INK_SOFT }}>
            Ver mi tarjeta online
          </a>
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
            {nombreComercio} · Loyalty
          </div>
          <p className="mt-1 text-[17px] font-medium" style={{ color: INK }}>
            Guardá tu tarjeta y sumá tu primer sello
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Tu nombre
            </span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={80}
              placeholder="Ej: Julieta Reyes"
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Tu teléfono
            </span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              inputMode="tel"
              placeholder="351 555 1234"
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-medium" style={{ color: INK }}>
              Email (opcional)
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={200}
              placeholder="tu@email.com"
              className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ borderColor: LINE, color: INK }}
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl p-3.5 text-[11.5px]" style={{ background: "#f8f9fa", color: INK_SOFT }}>
          {TEXTO_DATOS}
        </div>

        <div className="mt-4 space-y-2.5 text-[12.5px]" style={{ color: INK }}>
          <label className="flex items-start gap-2">
            <input type="checkbox" required checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} className="mt-0.5" />
            <span>Acepto el tratamiento de mis datos como se explica arriba.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" required checked={aceptaWallet} onChange={(e) => setAceptaWallet(e.target.checked)} className="mt-0.5" />
            <span>{TEXTO_WALLET}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={aceptaMarketing} onChange={(e) => setAceptaMarketing(e.target.checked)} className="mt-0.5" />
            <span>{TEXTO_MARKETING}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" required checked={declaraEdad} onChange={(e) => setDeclaraEdad(e.target.checked)} className="mt-0.5" />
            <span>{TEXTO_EDAD}</span>
          </label>
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
          {pendiente ? "Guardando…" : "Guardar mi tarjeta"}
        </button>
      </form>
    </div>
  );
}
