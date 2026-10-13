"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionValidarCanjePortal, type ResultadoCanjePortal } from "@/app/portal/actions";

// Caja del local: el cliente muestra en su celular un código de 6 letras y
// quien atiende lo tipea acá. Los puntos se descuentan recién en este paso.
export default function ValidarCanje({ codigo, comercioId }: { codigo: string; comercioId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoCanjePortal | null>(null);
  const [validando, startTransition] = useTransition();

  return (
    <div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await accionValidarCanjePortal(codigo, comercioId, texto);
            setResultado(r);
            if (r.ok) {
              setTexto("");
              router.refresh();
            }
          });
        }}
      >
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
            setResultado(null);
          }}
          placeholder="Código del cliente"
          aria-label="Código de canje del cliente"
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-lg tracking-[0.3em] text-slate-900 outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus:border-slate-400 focus:ring-4 focus:ring-slate-900/10 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={texto.length !== 6 || validando}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {validando ? "Validando…" : "Validar canje"}
        </button>
      </form>
      <div aria-live="polite" className="mt-3">
        {resultado?.ok && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ Canje válido: <strong>{resultado.beneficio}</strong> para {resultado.cliente}. Se descontaron{" "}
            {resultado.costoPuntos} puntos (le quedan {resultado.saldo}).
          </p>
        )}
        {resultado && !resultado.ok && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{resultado.error}</p>
        )}
      </div>
    </div>
  );
}
