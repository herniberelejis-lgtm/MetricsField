import type { Metadata } from "next";
import Link from "next/link";
import { getInventarioHardware, getClientes } from "@/lib/db";
import {
  accionGenerarLotePiezas,
  accionAsignarPieza,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { fmtNum } from "@/lib/format";

export const metadata: Metadata = { title: "Hardware" };
export const dynamic = "force-dynamic";

const TIPOS: { value: string; label: string }[] = [
  { value: "nfc", label: "Chip NFC" },
  { value: "qr", label: "QR impreso" },
  { value: "ambos", label: "NFC + QR (mismo standee)" },
];

const DESTINOS: { value: string; label: string }[] = [
  { value: "resena", label: "Reseña de Google (star-gate)" },
  { value: "menu", label: "Menú / catálogo" },
  { value: "instagram", label: "Instagram" },
  { value: "promo", label: "Promoción" },
  { value: "url_custom", label: "Otra URL" },
];

const LABEL_TIPO: Record<string, string> = {
  nfc: "NFC",
  qr: "QR",
  ambos: "NFC + QR",
};

export default async function HardwarePage() {
  const [inventario, clientes] = await Promise.all([getInventarioHardware(), getClientes()]);

  const libres = inventario.filter((p) => !p.comercioId && !p.autogestionado);
  const autogestionadas = inventario.filter((p) => !p.comercioId && p.autogestionado);
  const asignadas = inventario.filter((p) => p.comercioId);
  const lotes = [...new Set(inventario.map((p) => p.lote).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Hardware"
        subtitle={`${inventario.length} piezas generadas · ${libres.length} libres · ${autogestionadas.length} autogestionadas · ${asignadas.length} asignadas`}
      />

      <Card className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Generar lote nuevo
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Genera códigos fijos (ej. <code className="rounded bg-slate-100 px-1">p-0001</code>)
          listos para convertir en QR y mandar a imprimir — todavía sin cliente asignado.
        </p>
        <form action={accionGenerarLotePiezas} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Cantidad">
            <input
              name="cantidad"
              type="number"
              min={1}
              max={500}
              defaultValue={200}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Soporte físico">
            <select name="tipo" defaultValue="ambos" className={inputCls}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lote / pedido" hint='ej. "china-2026-07"'>
            <input name="lote" placeholder="china-2026-07" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <SubmitButton>Generar</SubmitButton>
          </div>
        </form>
      </Card>

      {libres.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Piezas libres ({libres.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/admin/hardware/qr-lote?estado=libre"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                Descargar todos los QR libres (.zip)
              </a>
              {lotes.map((l) => (
                <a
                  key={l}
                  href={`/api/admin/hardware/qr-lote?estado=libre&lote=${encodeURIComponent(l)}`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
                >
                  Solo lote &ldquo;{l}&rdquo;
                </a>
              ))}
            </div>
          </div>

          <Card className="mb-8 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Asignar a cliente</th>
                </tr>
              </thead>
              <tbody>
                {libres.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                      <div className="mt-1">
                        <a
                          href={`/api/admin/qr?linkId=${p.id}`}
                          target="_blank"
                          className="text-[11px] font-medium text-brand-fg hover:underline"
                        >
                          ver QR
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.lote || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{LABEL_TIPO[p.tipo]}</td>
                    <td className="px-4 py-3">
                      <form action={accionAsignarPieza} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="comercioId" required className={`${inputCls} w-40`}>
                          <option value="">Elegir cliente…</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          name="etiqueta"
                          placeholder="Mesa 4, mozo Juan..."
                          required
                          className={`${inputCls} w-36`}
                        />
                        <select name="destino" defaultValue="resena" className={`${inputCls} w-40`}>
                          {DESTINOS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <label
                          className="flex items-center gap-1 text-[11px] text-slate-500"
                          title="Solo aplica si el destino es 'Reseña de Google': va directo a Google para todos, sin star-gate."
                        >
                          <input type="checkbox" name="sinFiltro" value="1" className="rounded" />
                          Sin filtro
                        </label>
                        <button
                          type="submit"
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                        >
                          Asignar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {autogestionadas.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Autogestionadas ({autogestionadas.length})
          </h2>
          <p className="mb-3 -mt-2 text-xs text-slate-500">
            Canal Mercado Libre: el propio comprador las activó desde{" "}
            <code className="rounded bg-slate-100 px-1">/t/&lt;código&gt;</code>. Sin cliente en el
            CRM ni portal — el destino lo edita él mismo con su PIN.
          </p>
          <Card className="mb-8 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">Destino actual</th>
                  <th className="px-4 py-3 font-medium">Taps</th>
                </tr>
              </thead>
              <tbody>
                {autogestionadas.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.nombreNegocio || "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">
                      {p.urlDestino ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(p.taps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {asignadas.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Piezas asignadas ({asignadas.length})
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Etiqueta</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Taps</th>
                </tr>
              </thead>
              <tbody>
                {asignadas.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                    </td>
                    <td className="px-4 py-3">
                      {p.comercioId && (
                        <Link
                          href={`/admin/clientes/${p.comercioId}/links`}
                          className="text-brand-fg hover:underline"
                        >
                          {p.clienteNombre ?? p.comercioId}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.etiqueta}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{LABEL_TIPO[p.tipo]}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(p.taps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {inventario.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            Todavía no generaste ningún lote — usá el formulario de arriba.
          </p>
        </Card>
      )}
    </div>
  );
}
