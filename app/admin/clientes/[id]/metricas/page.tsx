import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import { accionEliminarMetrica, accionGuardarMetrica } from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { fmtMes, fmtNum } from "@/lib/format";
import { citasIA, metricaActual } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `Métricas · ${c.nombre}` : "Métricas" };
}

export default async function MetricasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCliente(id);
  if (!c) notFound();

  const esPremium = c.plan === "Premium";
  const ultima = metricaActual(c);
  const mesSugerido = new Date().toISOString().slice(0, 7);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-sm">
        <Link
          href={`/admin/clientes/${c.id}`}
          className="text-slate-500 hover:text-brand-fg"
        >
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader
        title="Cargar métricas del mes"
        subtitle={`${c.nombre} · si el mes ya existe, se reemplaza`}
      />

      <Card>
        <form action={accionGuardarMetrica} className="space-y-4">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="esPremium" value={esPremium ? "1" : "0"} />

          <Field label="Mes">
            <input
              name="mes"
              type="month"
              required
              defaultValue={mesSugerido}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Reseñas nuevas">
              <input name="resenasNuevas" type="number" min={0} required className={inputCls} />
            </Field>
            <Field label="Reseñas totales">
              <input
                name="resenasTotal"
                type="number"
                min={0}
                required
                defaultValue={ultima?.resenasTotal}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Rating promedio" hint="1.0 a 5.0">
            <input
              name="ratingPromedio"
              type="number"
              min={1}
              max={5}
              step={0.1}
              required
              defaultValue={ultima?.ratingPromedio}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Visitas al perfil">
              <input name="visitasPerfil" type="number" min={0} required className={inputCls} />
            </Field>
            <Field label="Llamadas">
              <input name="llamadas" type="number" min={0} required className={inputCls} />
            </Field>
            <Field label="Clics cómo llegar">
              <input name="clicsComoLlegar" type="number" min={0} required className={inputCls} />
            </Field>
          </div>

          {esPremium && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-violet-700">
                Citaciones en IA (Premium)
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="ChatGPT">
                  <input name="citasChatGPT" type="number" min={0} defaultValue={0} className={inputCls} />
                </Field>
                <Field label="Copilot">
                  <input name="citasCopilot" type="number" min={0} defaultValue={0} className={inputCls} />
                </Field>
                <Field label="Perplexity">
                  <input name="citasPerplexity" type="number" min={0} defaultValue={0} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          <SubmitButton>Guardar métricas</SubmitButton>
        </form>
      </Card>

      {c.historico.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
            Meses cargados
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium">Reseñas</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  {esPremium && <th className="px-4 py-3 font-medium">Citas IA</th>}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {[...c.historico].reverse().map((h) => (
                  <tr key={h.mes} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {fmtMes(h.mes)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      +{fmtNum(h.resenasNuevas)} ({fmtNum(h.resenasTotal)})
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      {h.ratingPromedio.toFixed(1)}
                    </td>
                    {esPremium && (
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">
                        {fmtNum(citasIA(h))}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <form action={accionEliminarMetrica}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="mes" value={h.mes} />
                        <button
                          type="submit"
                          className="text-xs text-rose-500 hover:text-rose-700"
                        >
                          Eliminar
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
    </div>
  );
}
