import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getCompetidores } from "@/lib/db";
import {
  accionCrearCompetidor,
  accionActualizarCompetidor,
  accionEliminarCompetidor,
  accionSincronizarCompetidor,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import GooglePlaceIdField from "@/components/GooglePlaceIdField";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `Competencia · ${c.nombre}` : "Competencia" };
}

export default async function CompetenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [c, competidores] = await Promise.all([getCliente(id), getCompetidores(id)]);
  if (!c) notFound();

  const miUltimaMetrica = c.historico[c.historico.length - 1];
  const filaCompetencia = [
    { nombre: `${c.nombre} (vos)`, rating: miUltimaMetrica?.ratingPromedio ?? null, total: miUltimaMetrica?.resenasTotal ?? null, soyYo: true },
    ...competidores.map((comp) => ({ nombre: comp.nombre, rating: comp.rating, total: comp.totalResenas, soyYo: false, id: comp.id })),
  ].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${c.id}`} className="text-slate-500 hover:text-brand-fg">
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader
        title="Monitoreo de competencia"
        subtitle={`${c.nombre} · rating y reseñas propias vs. la competencia local`}
      />

      {filaCompetencia.length > 0 && (
        <Card className="mb-4 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Reseñas</th>
              </tr>
            </thead>
            <tbody>
              {filaCompetencia.map((f, i) => (
                <tr key={f.nombre} className={`border-b border-slate-100 last:border-0 ${f.soyYo ? "bg-brand/5" : ""}`}>
                  <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{f.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {f.rating !== null ? `${Number(f.rating).toFixed(1)}★` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{f.total ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold text-slate-900">Agregar competidor</h3>
        <p className="mt-1 text-xs text-slate-500">
          Si le cargás el Google Place ID, el rating y las reseñas se sincronizan solos
          todos los días (mismo mecanismo que usa tu propio negocio) — no hace falta
          tipear nada a mano ni pedirle permiso al dueño, es dato público de Maps.
        </p>
        <form action={accionCrearCompetidor} className="mt-3 space-y-4">
          <input type="hidden" name="comercioId" value={c.id} />
          <Field label="Nombre del competidor">
            <input name="nombre" required placeholder="Bar Central" className={inputCls} />
          </Field>
          <Field label="Google Place ID" hint="opcional — sin esto queda manual">
            <GooglePlaceIdField />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rating" hint="opcional — se pisa solo si cargaste el place ID">
              <input name="rating" type="number" min={1} max={5} step={0.1} className={inputCls} />
            </Field>
            <Field label="Total de reseñas" hint="opcional">
              <input name="totalResenas" type="number" min={0} className={inputCls} />
            </Field>
          </div>
          <SubmitButton>Agregar</SubmitButton>
        </form>

        {competidores.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Competidores cargados
            </p>
            {competidores.map((comp) => (
              <Card key={comp.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{comp.nombre}</span>
                  <form action={accionEliminarCompetidor}>
                    <input type="hidden" name="id" value={comp.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <button type="submit" className="text-xs text-rose-500 hover:text-rose-700">
                      Eliminar
                    </button>
                  </form>
                </div>

                {comp.googlePlaceId ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Automático · Google Places
                      </span>
                      <p className="mt-1.5 text-sm text-slate-800">
                        {comp.rating !== null ? `${Number(comp.rating).toFixed(1)}★` : "—"}
                        {" · "}
                        {comp.totalResenas ?? "—"} reseñas
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Actualizado {new Date(comp.actualizadoEn).toLocaleString("es-AR")} · se refresca solo todos los días
                      </p>
                    </div>
                    <form action={accionSincronizarCompetidor}>
                      <input type="hidden" name="id" value={comp.id} />
                      <input type="hidden" name="comercioId" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
                      >
                        Sincronizar ahora
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={accionActualizarCompetidor} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <input type="hidden" name="id" value={comp.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <Field label="Google Place ID" hint="cargalo para que deje de ser manual">
                      <GooglePlaceIdField />
                    </Field>
                    <div className="flex items-end gap-3">
                      <Field label="Rating">
                        <input name="rating" type="number" min={1} max={5} step={0.1} defaultValue={comp.rating ?? undefined} className={inputCls} />
                      </Field>
                      <Field label="Total reseñas">
                        <input name="totalResenas" type="number" min={0} defaultValue={comp.totalResenas ?? undefined} className={inputCls} />
                      </Field>
                      <SubmitButton>Guardar</SubmitButton>
                    </div>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
