"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { LinkNFC } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { accionActualizarUrlLinkPortal } from "@/app/portal/actions";
import { btnPortal, btnPortalGhost } from "@/components/ui";

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
  const [nombre, setNombre] = useState(link.etiqueta ?? "");
  const [valor, setValor] = useState(link.urlDestino ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("comercioId", comercioId);
    fd.set("linkId", link.id);
    fd.set("etiqueta", nombre);
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
      <tr className="border-t border-[#EEF0F3]">
        <td className="flex items-center gap-2.5 px-4 py-3 font-medium text-slate-900">
          {iconoDispositivo}
          {link.etiqueta || "Sin etiqueta"}
        </td>
        {tieneSoporteQr && (
          <td className="px-4 py-3 text-slate-600">{link.tipo === "ambos" ? "NFC + QR" : link.tipo.toUpperCase()}</td>
        )}
        <td className="px-4 py-3 text-right tabular-nums text-slate-900">{fmtNum(link.taps)}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              link.activo ? "bg-[#EAF7F0] text-[#0B5E40]" : "bg-slate-100 text-slate-700"
            }`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${link.activo ? "bg-[#0B5E40]" : "bg-slate-500"}`} />
            {link.activo ? "Activa" : "Inactiva"}
          </span>
        </td>
        <td className="max-w-[220px] px-4 py-3">
          {editando ? (
            <span className="text-xs text-slate-600">Editando…</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-slate-600" title={link.urlDestino ?? "Reseña de Google"}>
                {link.urlDestino || "Reseña de Google"}
              </span>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="min-h-[32px] shrink-0 px-1 text-xs font-semibold text-[#1F4E80] hover:underline"
              >
                Editar
              </button>
            </div>
          )}
        </td>
      </tr>
      {editando && (
        <tr className="border-t border-[#EEF0F3] bg-[#F7F9FC]">
          <td colSpan={tieneSoporteQr ? 5 : 4} className="px-4 py-4">
            <label className="block text-xs font-medium text-slate-600">Nombre del dispositivo</label>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Para identificarlo como quieras: por mozo, por caja, por mesa, por sucursal.
            </p>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              placeholder="Ej: Mesa 4, Caja, Juan"
              className="mt-2 w-full max-w-xs rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm text-slate-900 focus:border-[#4F7AA8] focus:outline-none"
              disabled={pendiente}
            />

            <label className="mt-4 block text-xs font-medium text-slate-600">¿A dónde manda?</label>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Dejalo vacío para que mande a tu reseña de Google. El cartel impreso no cambia — solo cambia a dónde
              redirige.
            </p>
            <div className="mt-2 flex flex-nowrap items-center gap-2">
              <input
                type="url"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="https://..."
                className="min-w-[240px] flex-1 rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm text-slate-900 focus:border-[#4F7AA8] focus:outline-none"
                disabled={pendiente}
              />
              <button type="button" onClick={guardar} disabled={pendiente} className={btnPortal}>
                {pendiente ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setNombre(link.etiqueta ?? "");
                  setValor(link.urlDestino ?? "");
                  setError(null);
                }}
                disabled={pendiente}
                className={btnPortalGhost}
              >
                Cancelar
              </button>
            </div>
            {error && <p className="mt-2 text-xs font-semibold text-[#8A3F00]">{error}</p>}
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
        <tr className="text-left text-xs font-medium text-slate-600">
          <th className="px-4 py-3 font-medium">Pieza</th>
          {tieneSoporteQr && <th className="px-4 py-3 font-medium">Tipo</th>}
          <th className="px-4 py-3 text-right font-medium">Toques</th>
          <th className="px-4 py-3 font-medium">Estado</th>
          <th className="px-4 py-3 font-medium">A dónde manda</th>
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
