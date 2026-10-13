"use client";

import { useActionState } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { accionPaseDemoWallet, type ResultadoPaseDemo } from "./actions";

export default function PaseDemo() {
  const [resultado, generar, generando] = useActionState<ResultadoPaseDemo>(accionPaseDemoWallet, null);

  return (
    <div>
      <form action={generar}>
        <button type="submit" disabled={generando} className={resultado?.ok ? btnSecondary : btnPrimary}>
          {generando ? "Hablando con Google…" : resultado?.ok ? "Generar otra tarjeta" : "Generar tarjeta de prueba"}
        </button>
      </form>

      {resultado?.ok && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-emerald-700">
            ✓ Google aceptó la clase y la tarjeta. Falta guardarla en el celular.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generada en el servidor */}
            <img
              src={resultado.qr}
              alt="QR para guardar la tarjeta en Google Wallet"
              width={180}
              height={180}
              className="rounded-xl border border-slate-200"
            />
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong>Desde la compu:</strong> escaneá el QR con la cámara del Android.
              </p>
              <p>
                <strong>Desde el celular:</strong> tocá el botón.
              </p>
              <a href={resultado.link} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                Guardar en Google Wallet
              </a>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Tiene que abrirse con una cuenta de Google cargada en &quot;Cuentas de prueba&quot; de Pay &amp;
            Wallet Console (o que sea admin de la consola).
          </p>
        </div>
      )}

      {resultado && !resultado.ok && (
        <div className="mt-5 space-y-2 rounded-xl bg-rose-50 p-4 text-sm">
          <p className="font-semibold text-rose-700">Google rechazó el pedido</p>
          {resultado.pista && <p className="text-rose-700">{resultado.pista}</p>}
          <pre className="whitespace-pre-wrap break-all text-xs text-rose-900/70">{resultado.error}</pre>
        </div>
      )}
    </div>
  );
}
