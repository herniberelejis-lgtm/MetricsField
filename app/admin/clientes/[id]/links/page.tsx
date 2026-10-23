import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getLinks, getTapsPorDia } from "@/lib/db";
import {
  accionActualizarLink,
  accionCrearLink,
  accionEliminarLink,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import TapsChart from "@/components/TapsChart";
import { fmtNum } from "@/lib/format";
import { asegurarAdminPagina } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await asegurarAdminPagina();
  const c = await getCliente((await params).id);
  return { title: c ? `Links NFC/QR · ${c.nombre}` : "Links NFC/QR" };
}

const DESTINOS: { value: string; label: string }[] = [
  { value: "resena", label: "Reseña de Google" },
  { value: "menu", label: "Menú / catálogo" },
  { value: "instagram", label: "Instagram" },
  { value: "promo", label: "Promoción" },
  { value: "url_custom", label: "Otra URL" },
  // Sin URL: manda a /l/<comercio> si el cliente tiene Loyalty activo; si
  // no, cae en la reseña de Google (nunca un callejón sin salida).
  { value: "loyalty", label: "Club de beneficios (Loyalty)" },
];

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

const COLOR_TIPO: Record<string, string> = {
  nfc: "bg-slate-100 text-slate-600",
  qr: "bg-[#F1F4F8] text-slate-700",
  ambos: "bg-[#EEF4FB] text-[#1F4E80]",
};

const ERRORES_LINK: Record<string, string> = {
  "sin-url": 'Ese destino necesita una URL — completá "URL de destino" y guardá de nuevo.',
};

export default async function LinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await asegurarAdminPagina();
  const { id } = await params;
  const { error } = await searchParams;
  const [c, links, tapsPorDia] = await Promise.all([
    getCliente(id),
    getLinks(id),
    getTapsPorDia(id, 14),
  ]);
  if (!c) notFound();

  const totalTaps = links.reduce((acc, l) => acc + l.taps, 0);

  const resumenTipo = { nfc: { cant: 0, taps: 0 }, qr: { cant: 0, taps: 0 }, ambos: { cant: 0, taps: 0 } };
  for (const l of links) {
    resumenTipo[l.tipo].cant += 1;
    resumenTipo[l.tipo].taps += l.taps;
  }
  const totalConQr = resumenTipo.qr.cant + resumenTipo.ambos.cant;
  const totalConNfc = resumenTipo.nfc.cant + resumenTipo.ambos.cant;

  const dias = [...new Set(tapsPorDia.map((d) => d.fecha))].sort();
  const valores = dias.map(
    (d) => tapsPorDia.find((x) => x.fecha === d)?.taps ?? 0,
  );
  const labels = dias.map((d) => d.slice(5).replace("-", "/"));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${c.id}`} className="text-slate-600 hover:text-[#1F4E80]">
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader
        title="Links NFC"
        subtitle={`${c.nombre} · ${fmtNum(totalTaps)} taps históricos en ${links.length} link${links.length === 1 ? "" : "s"}`}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-[#FFF4E8] px-3 py-2 text-sm text-[#8A3F00]">
          {ERRORES_LINK[error] ?? "No se pudo guardar — revisá los datos y probá de nuevo."}
        </div>
      )}

      {links.length > 0 && (
        <Card className="mb-6">
          <div className="text-xs font-medium text-slate-600">
            Inventario y desempeño por soporte
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">{totalConNfc}</div>
              <div className="text-[11px] text-slate-600">chips NFC instalados</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{totalConQr}</div>
              <div className="text-[11px] text-slate-600">QR impresos instalados</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {fmtNum(resumenTipo.nfc.taps)}
              </div>
              <div className="text-[11px] text-slate-600">taps solo-NFC</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {fmtNum(resumenTipo.qr.taps + resumenTipo.ambos.taps)}
              </div>
              <div className="text-[11px] text-slate-600">taps con QR habilitado</div>
            </div>
          </div>
        </Card>
      )}

      {tapsPorDia.length > 0 && (
        <div className="mb-6">
          <TapsChart
            labels={labels}
            values={valores}
            tabla={dias.map((d, i) => [d, String(valores[i])])}
          />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Nuevo link</h2>
      <Card>
        <form action={accionCrearLink} className="space-y-4">
          <input type="hidden" name="comercioId" value={c.id} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Etiqueta" hint="dónde/quién lo usa">
              <input
                name="etiqueta"
                required
                placeholder="Mesa 4, mozo Juan, caja..."
                className={inputCls}
              />
            </Field>
            <Field label="Soporte físico">
              <select name="tipo" className={inputCls} defaultValue="nfc">
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Destino">
              <select name="destino" className={inputCls} defaultValue="resena">
                {DESTINOS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="URL de destino"
            hint="Si la cargás, el cartel manda ahí siempre — sin importar el Destino elegido. Dejala vacía para que mande a la reseña de Google del cliente."
          >
            <input
              name="urlDestino"
              type="url"
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
          <Field
            label="Nombre del empleado (opcional)"
            hint="Si es la tarjeta personal de un mozo/empleado, cargá su nombre acá — el portal busca menciones suyas en el texto de las reseñas."
          >
            <input
              name="nombreEmpleado"
              placeholder="Juan Pérez"
              className={inputCls}
            />
          </Field>
          <SubmitButton>Crear link</SubmitButton>
        </form>
      </Card>

      {links.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
            Links activos
          </h2>
          <div className="space-y-3">
            {links.map((l) => (
              <Card key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{l.etiqueta}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_TIPO[l.tipo]}`}>
                        {LABEL_TIPO[l.tipo]}
                      </span>
                      {l.nombreEmpleado && (
                        <span className="rounded-full bg-[#F4F7FB] px-2 py-0.5 text-[11px] font-medium text-[#1F4E80]">
                          Tarjeta de {l.nombreEmpleado}
                        </span>
                      )}
                      {!l.activo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          desactivado
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      <Link
                        href={`/t/${l.id}`}
                        target="_blank"
                        className="font-mono text-[#1F4E80] hover:underline"
                      >
                        /t/{l.id}
                      </Link>
                      {" · "}
                      {DESTINOS.find((d) => d.value === l.destino)?.label ?? l.destino}
                      {l.urlDestino && <> → {l.urlDestino}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(l.tipo === "qr" || l.tipo === "ambos") && (
                      <div className="flex flex-col items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/admin/qr?linkId=${l.id}`}
                          alt={`QR de ${l.etiqueta}`}
                          width={56}
                          height={56}
                          className="rounded border border-[#E4E6EA]"
                        />
                        <a
                          href={`/api/admin/qr?linkId=${l.id}&download=1`}
                          download={`qr-${l.id}.png`}
                          className="text-[11px] font-medium text-[#1F4E80] hover:underline"
                        >
                          Descargar
                        </a>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900">
                        {fmtNum(l.taps)}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        taps
                      </div>
                    </div>
                  </div>
                </div>

                <details className="mt-3 border-t border-[#EEF0F3] pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-700">
                    Editar / desactivar
                  </summary>
                  <form action={accionActualizarLink} className="mt-3 space-y-3">
                    <input type="hidden" name="linkId" value={l.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Etiqueta">
                        <input
                          name="etiqueta"
                          defaultValue={l.etiqueta}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Soporte físico">
                        <select
                          name="tipo"
                          defaultValue={l.tipo}
                          className={inputCls}
                        >
                          {TIPOS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Destino">
                        <select
                          name="destino"
                          defaultValue={l.destino}
                          className={inputCls}
                        >
                          {DESTINOS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field
                      label="URL de destino"
                      hint="Si la cargás, el cartel manda ahí siempre — sin importar el Destino elegido. Dejala vacía para que mande a la reseña de Google del cliente."
                    >
                      <input
                        name="urlDestino"
                        type="url"
                        defaultValue={l.urlDestino ?? ""}
                        className={inputCls}
                      />
                    </Field>
                    <Field
                      label="Nombre del empleado (opcional)"
                      hint="Tarjeta personal de un mozo/empleado — se usa para buscar menciones suyas en las reseñas."
                    >
                      <input
                        name="nombreEmpleado"
                        defaultValue={l.nombreEmpleado}
                        placeholder="Juan Pérez"
                        className={inputCls}
                      />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="activo"
                        value="1"
                        defaultChecked={l.activo}
                        className="rounded"
                      />
                      Link activo
                    </label>
                    <div className="flex items-center gap-2">
                      <SubmitButton>Guardar cambios</SubmitButton>
                    </div>
                  </form>
                  <form action={accionEliminarLink} className="mt-2">
                    <input type="hidden" name="linkId" value={l.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <button
                      type="submit"
                      className="text-xs text-[#8A3F00] hover:text-[#8A3F00]"
                    >
                      Eliminar link
                    </button>
                  </form>
                </details>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
