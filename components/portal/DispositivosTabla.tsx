"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { LinkNFC } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { accionActualizarUrlLinkPortal } from "@/app/portal/actions";
import { btnPrimary, btnGhost } from "@/components/ui";

// Autogestión del destino de cada dispositivo desde el portal del cliente:
// antes solo el equipo interno podía cambiar a dónde manda un cartel/tarjeta
// (desde /admin/clientes/[id]/links). El QR/NFC impreso nunca cambia — solo
// cambia a dónde redirige (misma arquitectura que /admin: "URL de destino"
// manda siempre si está cargada, si no, va a la reseña de Google).

function FilaDispositivo({
  link,
  codigo,
  comercioId,
  tieneSoporteQr,
  iconoDispositivo,
}: {
  link: LinkNFC;
  codigo: string;
  comercioId: string;
  tieneSoporteQr: boolean;
  iconoDispositivo: ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(link.urlDestino ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("comercioId", comercioId);
    fd.set("linkId", link.id);
    fd.set("urlDestino", valor);
    startTransition(async () => {
      const r = await accionActualizarUrlLinkPortal(fd);
      if (!r.ok) {
        setError(r.error ?? "No se pudo guardar.");
        return;
      }
      setEditando(false);
    });
  }

  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="flex items-center gap-2.5 px-4 py-3">
          {iconoDispositivo}
          {link.etiqueta || "Sin etiqueta"}
        </td>
        {tieneSoporteQr && (
          <td className="px-4 py-3 text-slate-600">{link.tipo === "ambos" ? "NFC + QR" : link.tipo.toUpperCase()}</td>
        )}
        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtNum(link.taps)}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              link.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            ● {link.activo ? "en vivo" : "inactivo"}
          </span>
        </td>
        <td className="max-w-[220px] px-4 py-3">
          {editando ? (
            <span className="text-xs text-slate-400">Editando…</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-slate-500" title={link.urlDestino ?? "Reseña de Google"}>
                {link.urlDestino || "Reseña de Google"}
              </span>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="shrink-0 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
              >
                Editar
              </button>
            </div>
          )}
        </td>
      </tr>
      {editando && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={tieneSoporteQr ? 5 : 4} className="px-4 py-4">
            <label className="block text-xs font-medium text-slate-600">
              ¿A dónde manda &ldquo;{link.etiqueta || "este dispositivo"}&rdquo;?
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Dejalo vacío para que mande a tu reseña de Google. El cartel impreso no cambia — solo cambia a dónde
              redirige.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="https://..."
                className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                disabled={pendiente}
              />
              <button type="button" onClick={guardar} disabled={pendiente} className={btnPrimary}>
                {pendiente ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setValor(link.urlDestino ?? "");
                  setError(null);
                }}
                disabled={pendiente}
                className={btnGhost}
              >
                Cancelar
              </button>
            </div>
            {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

export default function DispositivosTabla({
  links,
  codigo,
  comercioId,
  tieneSoporteQr,
  iconoDispositivo,
}: {
  links: LinkNFC[];
  codigo: string;
  comercioId: string;
  tieneSoporteQr: boolean;
  iconoDispositivo: ReactNode;
}) {
  return (
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
          <th className="px-4 py-2.5">Dispositivo</th>
          {tieneSoporteQr && <th className="px-4 py-2.5">Tipo</th>}
          <th className="px-4 py-2.5">Taps totales</th>
          <th className="px-4 py-2.5">Estado</th>
          <th className="px-4 py-2.5">Enlace</th>
        </tr>
      </thead>
      <tbody>
        {links.map((l) => (
          <FilaDispositivo
            key={l.id}
            link={l}
            codigo={codigo}
            comercioId={comercioId}
            tieneSoporteQr={tieneSoporteQr}
            iconoDispositivo={iconoDispositivo}
          />
        ))}
      </tbody>
    </table>
  );
}
