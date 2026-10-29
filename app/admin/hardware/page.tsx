import type { Metadata } from "next";
import Link from "next/link";
import { getInventarioHardware, getClientes } from "@/lib/db";
import {
  accionGenerarLotePiezas,
  accionAsignarPieza,
  accionReasignarPieza,
  accionNuevoPinPieza,
  accionLiberarPieza,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import { asegurarAdminPagina } from "@/lib/auth";
import { waUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Hardware" };
export const dynamic = "force-dynamic";

const TIPOS: { value: string; label: string }[] = [
  { value: "nfc", label: "Chip NFC" },
  { value: "qr", label: "QR impreso" },
  { value: "ambos", label: "NFC + QR (mismo standee)" },
];

const LABEL_TIPO: Record<string, string> = {
  nfc: "NFC",
  qr: "QR",
  ambos: "NFC + QR",
};

const ERRORES_ASIGNAR: Record<string, string> = {
  "sin-cliente": "Elegí a qué cliente asignarla antes de guardar.",
  "sin-url": 'Ese destino necesita una URL — asignala primero y cargá la URL desde la ficha del cliente → Links.',
  "no-libre": "Esa pieza ya no está libre: alguien la asignó o la activó recién. Mirá la lista actualizada.",
  "pin-invalido": "El PIN tiene que ser de 4 a 8 números.",
  "no-autogestionada": "Esa pieza ya no es autogestionada (alguien la asignó a un cliente o ya se devolvió).",
  "sin-confirmar": "Para devolver una pieza al inventario tildá la casilla de confirmación.",
};

export default async function HardwarePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await asegurarAdminPagina();
  const { error, ok } = await searchParams;
  const pinCambiado = ok?.startsWith("pin-") ? ok.slice(4) : null;
  const liberada = ok?.startsWith("liberada-") ? ok.slice(9) : null;
  const [inventario, clientes] = await Promise.all([getInventarioHardware(), getClientes()]);

  const libres = inventario.filter((p) => !p.comercioId && !p.autogestionado);
  // Los que más la usan primero: son los mejores candidatos al panel.
  const autogestionadas = inventario
    .filter((p) => !p.comercioId && p.autogestionado)
    .sort((a, b) => b.taps30d - a.taps30d || b.taps - a.taps);
  const asignadas = inventario.filter((p) => p.comercioId);
  const lotes = [...new Set(inventario.map((p) => p.lote).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Hardware"
        subtitle={`${inventario.length} piezas generadas · ${libres.length} libres · ${autogestionadas.length} autogestionadas · ${asignadas.length} asignadas`}
      />

      {pinCambiado && (
        <div className="mb-4 rounded-lg bg-[#E6F4EA] px-3 py-2 text-sm text-[#0B5E40]">
          Listo: la pieza <code className="font-mono">{pinCambiado}</code> tiene el PIN nuevo. Pasáselo al dueño
          junto con el link para cambiarla: <code className="font-mono">app.metricsfield.com/t/{pinCambiado}/editar</code>
        </div>
      )}

      {liberada && (
        <div className="mb-4 rounded-lg bg-[#E6F4EA] px-3 py-2 text-sm text-[#0B5E40]">
          Listo: la pieza <code className="font-mono">{liberada}</code> volvió al inventario libre. El próximo que la
          escanee la activa de cero.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-[#FFF4E8] px-3 py-2 text-sm text-[#8A3F00]">
          {ERRORES_ASIGNAR[error] ?? "No se pudo guardar — revisá los datos y probá de nuevo."}
        </div>
      )}

      <Card className="mb-6">
        <div className="text-xs font-medium text-slate-600">
          Generar lote nuevo
        </div>
        <p className="mt-1 text-xs text-slate-600">
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
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Piezas libres ({libres.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Al asignar, el destino arranca en &ldquo;Reseña de Google&rdquo; — para apuntarla a
                otra URL (o cambiarla después), editala desde la ficha del cliente → Links.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/admin/hardware/qr-lote?estado=libre"
                className="inline-flex min-h-[36px] items-center rounded-full bg-[#1F4E80] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#183F68]"
              >
                Descargar todos los QR libres (.zip)
              </a>
              <a
                href="/api/admin/hardware/qr-lote?estado=libre&formato=links"
                target="_blank"
                className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
              >
                Ver lista de links (para mandar al proveedor)
              </a>
              {lotes.map((l) => (
                <a
                  key={l}
                  href={`/api/admin/hardware/qr-lote?estado=libre&lote=${encodeURIComponent(l)}`}
                  className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
                >
                  Solo lote &ldquo;{l}&rdquo;
                </a>
              ))}
              {lotes.map((l) => (
                <a
                  key={`links-${l}`}
                  href={`/api/admin/hardware/qr-lote?estado=libre&lote=${encodeURIComponent(l)}&formato=links`}
                  target="_blank"
                  className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
                >
                  Links del lote &ldquo;{l}&rdquo;
                </a>
              ))}
            </div>
          </div>

          <Card className="mb-8 overflow-x-auto p-0">
            {/* min-w fijo: el formulario de "Asignar/Mover" (select + inputs + botón)
                mide más que una pantalla de celular — sin esto, `w-full` lo obliga
                a entrar en ese ancho angosto y flex-wrap apila cada campo en su
                propia línea, dejando filas altísimas en vez de dejar que este
                contenedor (overflow-x-auto) scrollee horizontal. */}
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Asignar a cliente</th>
                </tr>
              </thead>
              <tbody>
                {libres.map((p) => (
                  <tr key={p.id} className="border-b border-[#EEF0F3] last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                      <div className="mt-1">
                        <a
                          href={`/api/admin/qr?linkId=${p.id}`}
                          target="_blank"
                          className="text-[11px] font-medium text-[#1F4E80] hover:underline"
                        >
                          ver QR
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.lote || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{LABEL_TIPO[p.tipo]}</td>
                    <td className="px-4 py-3">
                      <form action={accionAsignarPieza} className="flex flex-nowrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="comercioId" required className={`${inputCls} w-40`}>
                          <option value="">Elegir cliente…</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                              {c.comercioPadreId ? " (sucursal)" : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          name="etiqueta"
                          aria-label="Nombre o ubicación del dispositivo"
                          placeholder="Mesa 4, mozo Juan..."
                          required
                          className={`${inputCls} w-36`}
                        />
                        <input type="hidden" name="destino" value="resena" />
                        <button
                          type="submit"
                          className="inline-flex min-h-[36px] items-center rounded-full bg-[#1F4E80] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#183F68]"
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
          <p className="mb-3 -mt-2 text-xs text-slate-600">
            Los que más la usan van primero: son los mejores candidatos al panel. El contacto solo
            aparece si el comprador lo dejó y aceptó que le escribamos al activarla (cada lunes le
            llega gratis cuántos usaron su pieza). Canal Mercado Libre: el propio comprador las activó desde{" "}
            <code className="rounded bg-slate-100 px-1">/t/&lt;código&gt;</code>. Sin cliente en el
            CRM ni portal — el destino lo cambia él mismo desde su celular (Mis piezas) o con su PIN;
            &ldquo;Cuenta Google&rdquo; es la cuenta donde guardó sus piezas (muchas piezas en una misma
            cuenta = probable revendedor). No uses &ldquo;Asignar&rdquo; para un comprador o un revendedor: le
            saca la posibilidad de cambiarla. Si alguien completó este
            formulario por error en una pieza que en realidad es de un cliente de agencia (mismo
            error que la imprenta con los números), usá &ldquo;Asignar a cliente&rdquo; para
            corregirlo — limpia el PIN cargado y deja la pieza como cualquier otra asignada.
          </p>
          <Card className="mb-8 overflow-x-auto p-0">
            {/* min-w fijo, mismo motivo que la tabla de libres: el formulario
                con urlDestino (w-56) es todavía más ancho — sin esto se
                apila en varias líneas por fila en vez de scrollear. */}
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Toques 7 / 30 días · total</th>
                  <th className="px-4 py-3 font-medium">PIN y devolución</th>
                  <th className="px-4 py-3 font-medium">Asignar a cliente</th>
                </tr>
              </thead>
              <tbody>
                {autogestionadas.map((p) => (
                  <tr key={p.id} className="border-b border-[#EEF0F3] last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{p.nombreNegocio || "—"}</div>
                      {p.urlDestino && (
                        <a href={p.urlDestino} target="_blank" rel="noreferrer" className="text-xs text-[#1F4E80] underline">
                          Link de reseña
                        </a>
                      )}
                      {p.activadoEn && (
                        <div className="text-xs text-slate-500">Activada el {new Date(p.activadoEn).toLocaleDateString("es-AR")}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {p.duenioEmail && (
                        <div className="mb-1 break-all">
                          <span className="text-slate-500">Cuenta Google:</span> {p.duenioEmail}
                        </div>
                      )}
                      {p.contactoEmail || p.contactoWhatsapp ? (
                        <>
                          {p.contactoEmail && <div className="break-all">{p.contactoEmail}</div>}
                          {p.contactoWhatsapp && (
                            <a
                              href={waUrl(
                                p.contactoWhatsapp,
                                `Hola, te escribo de MetricsField. Vi que activaste tu pieza en ${p.nombreNegocio || "tu negocio"}: ¿cómo te está funcionando?`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#0B5E40] underline"
                            >
                              WhatsApp {p.contactoWhatsapp}
                            </a>
                          )}
                          <div className="text-slate-500">
                            {p.novedadesBajaEn
                              ? "Se dio de baja"
                              : p.novedadesAceptadasEn
                                ? `Aceptó el ${new Date(p.novedadesAceptadasEn).toLocaleDateString("es-AR")}`
                                : ""}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500">No dejó contacto</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      <b>{fmtNum(p.taps7d)}</b> / {fmtNum(p.taps30d)} · {fmtNum(p.taps)}
                    </td>
                    <td className="px-4 py-3">
                      <form action={accionNuevoPinPieza} className="flex flex-nowrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="pin"
                          inputMode="numeric"
                          pattern="[0-9]{4,8}"
                          autoComplete="off"
                          aria-label={`PIN nuevo para ${p.id}`}
                          placeholder="PIN nuevo"
                          required
                          className={`${inputCls} w-24`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#E4E6EA] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cambiar
                        </button>
                      </form>
                      <a href={`/t/${p.id}/editar`} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-[#1F4E80] underline">
                        Link para cambiarla
                      </a>
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="cursor-pointer underline">Devolver al inventario</summary>
                        <form action={accionLiberarPieza} className="mt-1.5 space-y-1.5">
                          <input type="hidden" name="id" value={p.id} />
                          <label className="flex items-start gap-1.5">
                            <input type="checkbox" name="confirmo" value="si" required className="mt-0.5" />
                            <span>Borra negocio, link, PIN y cuenta. Para devoluciones o piezas de prueba.</span>
                          </label>
                          <button
                            type="submit"
                            className="rounded-lg border border-[#F4D3B5] bg-[#FFF4E8] px-3 py-1 text-xs font-medium text-[#8A3F00]"
                          >
                            Devolver
                          </button>
                        </form>
                      </details>
                    </td>
                    <td className="px-4 py-3">
                      <form action={accionReasignarPieza} className="flex flex-nowrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="destino" value={p.destino} />
                        <select name="comercioId" required className={`${inputCls} w-40`}>
                          <option value="">Elegir cliente…</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                              {c.comercioPadreId ? " (sucursal)" : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          name="etiqueta"
                          aria-label="Nombre o ubicación del dispositivo"
                          placeholder="Mesa 4, mozo Juan..."
                          required
                          className={`${inputCls} w-36`}
                        />
                        <input
                          name="urlDestino"
                          defaultValue={p.urlDestino ?? ""}
                          aria-label="URL de destino personalizada"
                          placeholder="URL de destino (vacío = reseña del cliente)"
                          className={`${inputCls} w-56`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#F4D3B5] bg-[#FFF4E8] px-3 py-1.5 text-xs font-medium text-[#8A3F00] hover:bg-[#FFF4E8]"
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

      {asignadas.length > 0 && (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Piezas asignadas ({asignadas.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              &ldquo;Mover a otro cliente&rdquo; corrige una asignación mal hecha (ej. la imprenta
              mezcló los números de un lote) sin reimprimir nada — el código ya impreso no cambia,
              solo a quién pertenece. Los taps que ya tenga la pieza pasan a mostrarse del lado del
              cliente nuevo, porque son los que de verdad pasaron en ese cartel físico.
            </p>
          </div>
          <Card className="overflow-x-auto p-0">
            {/* min-w fijo, mismo motivo que las otras dos tablas de esta página. */}
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Etiqueta</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Taps</th>
                  <th className="px-4 py-3 font-medium">Mover a otro cliente</th>
                </tr>
              </thead>
              <tbody>
                {asignadas.map((p) => (
                  <tr key={p.id} className="border-b border-[#EEF0F3] last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {p.id}
                    </td>
                    <td className="px-4 py-3">
                      {p.comercioId && (
                        <Link
                          href={`/admin/clientes/${p.comercioId}/links`}
                          className="text-[#1F4E80] hover:underline"
                        >
                          {p.clienteNombre ?? p.comercioId}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.etiqueta}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{LABEL_TIPO[p.tipo]}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(p.taps)}</td>
                    <td className="px-4 py-3">
                      <form action={accionReasignarPieza} className="flex flex-nowrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="destino" value={p.destino} />
                        <select name="comercioId" required className={`${inputCls} w-40`}>
                          <option value="">Elegir cliente…</option>
                          {clientes
                            .filter((c) => c.id !== p.comercioId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                                {c.comercioPadreId ? " (sucursal)" : ""}
                              </option>
                            ))}
                        </select>
                        <input
                          name="etiqueta"
                          aria-label="Nombre o ubicación del dispositivo"
                          placeholder="Mesa 4, mozo Juan..."
                          required
                          className={`${inputCls} w-36`}
                        />
                        <input
                          name="urlDestino"
                          defaultValue={p.urlDestino ?? ""}
                          aria-label="URL de destino personalizada"
                          placeholder="URL de destino (vacío = reseña del cliente)"
                          className={`${inputCls} w-56`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#F4D3B5] bg-[#FFF4E8] px-3 py-1.5 text-xs font-medium text-[#8A3F00] hover:bg-[#FFF4E8]"
                        >
                          Mover
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

      {inventario.length === 0 && (
        <Card>
          <p className="text-sm text-slate-600">
            Todavía no generaste ningún lote — usá el formulario de arriba.
          </p>
        </Card>
      )}
    </div>
  );
}
