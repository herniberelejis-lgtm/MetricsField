"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarCanjeAction } from "@/app/portal/[codigo]/canjes/actions";
import { formatearCuentaRegresiva, segundosRestantes } from "@/lib/loyalty/canje";

// Lista en vivo de canjes esperando entrega. Se refresca sola cada 5 s
// (router.refresh re-ejecuta el Server Component, que es quien consulta la
// base — este componente nunca toca datos por su cuenta) y cuenta
// regresivamente en el cliente. El botón solo dispara la acción; quien
// decide si el canje es válido es el UPDATE atómico del servidor, no este
// reloj: si el reloj del navegador está mal, lo peor que pasa es que se
// muestre un canje vencido y el servidor lo rechace.

const INTERVALO_REFRESCO_MS = 5000;

export interface CanjePendienteVista {
  id: string;
  nombreCliente: string;
  beneficioNombre: string;
  costoPuntos: number;
  expiraEnIso: string;
}

export default function CanjesPendientes({
  codigo,
  canjes,
  ahoraIso,
}: {
  codigo: string;
  canjes: CanjePendienteVista[];
  /** Hora del servidor al renderizar: el estado inicial sale de acá y no de
   * `new Date()` para que el HTML del servidor y el primer render del
   * cliente coincidan (si no, React avisa de un mismatch de hidratación). */
  ahoraIso: string;
}) {
  const router = useRouter();
  const [ahora, setAhora] = useState<Date>(() => new Date(ahoraIso));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 1000);
    const refresco = setInterval(() => router.refresh(), INTERVALO_REFRESCO_MS);
    return () => {
      clearInterval(reloj);
      clearInterval(refresco);
    };
  }, [router]);

  function entregar(canjeId: string): void {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await confirmarCanjeAction(codigo, canjeId);
      if (!resultado.ok) setMensaje(resultado.mensaje ?? "No se pudo confirmar el canje.");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="canjes-titulo">
      <h2 id="canjes-titulo" className="text-lg font-bold text-slate-900">
        Canjes esperando entrega
      </h2>

      {mensaje && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mensaje}
        </p>
      )}

      {canjes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No hay canjes pendientes. Cuando un cliente pida un beneficio, aparece acá solo.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {canjes.map((c) => {
            const restantes = segundosRestantes(new Date(c.expiraEnIso), ahora);
            const vencido = restantes === 0;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{c.beneficioNombre}</p>
                  <p className="text-sm text-slate-600">
                    {c.nombreCliente} · {c.costoPuntos} pts
                  </p>
                  <p className={`mt-1 text-xs ${vencido ? "text-red-600" : "text-slate-500"}`}>
                    {vencido ? "Vencido" : `Vence en ${formatearCuentaRegresiva(restantes)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => entregar(c.id)}
                  disabled={pendiente || vencido}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  Entregado
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
