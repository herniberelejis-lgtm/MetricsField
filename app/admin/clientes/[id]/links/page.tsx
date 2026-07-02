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

export const dynamic = "force-dynamic";

const DESTINOS: { value: string; label: string }[] = [
  { value: "resena", label: "Reseña de Google (star-gate)" },
  { value: "menu", label: "Menú / catálogo" },
  { value: "instagram", label: "Instagram" },
  { value: "promo", label: "Promoción" },
  { value: "url_custom", label: "Otra URL" },
];

export default async function LinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [c, links, tapsPorDia] = await Promise.all([
    getCliente(id),
    getLinks(id),
    getTapsPorDia(id, 14),
  ]);
  if (!c) notFound();

  const totalTaps = links.reduce((acc, l) => acc + l.taps, 0);

  const dias = [...new Set(tapsPorDia.map((d) => d.fecha))].sort();
  const valores = dias.map(
    (d) => tapsPorDia.find((x) => x.fecha === d)?.taps ?? 0,
  );
  const labels = dias.map((d) => d.slice(5).replace("-", "/"));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${c.id}`} className="text-slate-500 hover:text-brand-fg">
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader
        title="Links NFC"
        subtitle={`${c.nombre} · ${fmtNum(totalTaps)} taps históricos en ${links.length} link${links.length === 1 ? "" : "s"}`}
      />

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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Etiqueta" hint="dónde va este cartel">
              <input
                name="etiqueta"
                required
                placeholder="Mesa 4, vidriera, mostrador..."
                className={inputCls}
              />
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
            hint="Solo si el destino no es 'Reseña de Google' (que usa el link de Google Reviews cargado en el comercio)"
          >
            <input
              name="urlDestino"
              type="url"
              placeholder="https://..."
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
                      {!l.activo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          desactivado
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <Link
                        href={`/t/${l.id}`}
                        target="_blank"
                        className="font-mono text-brand-fg hover:underline"
                      >
                        /t/{l.id}
                      </Link>
                      {" · "}
                      {DESTINOS.find((d) => d.value === l.destino)?.label ?? l.destino}
                      {l.urlDestino && <> → {l.urlDestino}</>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">
                      {fmtNum(l.taps)}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      taps
                    </div>
                  </div>
                </div>

                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                    Editar / desactivar
                  </summary>
                  <form action={accionActualizarLink} className="mt-3 space-y-3">
                    <input type="hidden" name="linkId" value={l.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Etiqueta">
                        <input
                          name="etiqueta"
                          defaultValue={l.etiqueta}
                          className={inputCls}
                        />
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
                    <Field label="URL de destino">
                      <input
                        name="urlDestino"
                        type="url"
                        defaultValue={l.urlDestino ?? ""}
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
                      className="text-xs text-rose-500 hover:text-rose-700"
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
