import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getChecklist, getAudits, getCompetidores } from "@/lib/db";
import { accionToggleChecklist, accionRegistrarAudit, accionCrearCompetidor, accionActualizarCompetidor, accionEliminarCompetidor } from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `Auditoría GEO · ${c.nombre}` : "Auditoría GEO" };
}

const PLATAFORMAS = ["ChatGPT", "Claude", "Perplexity", "Gemini", "Otra"] as const;

const CHATS_GRATUITOS = [
  { nombre: "ChatGPT", url: "https://chatgpt.com" },
  { nombre: "Claude.ai", url: "https://claude.ai" },
  { nombre: "Perplexity", url: "https://www.perplexity.ai" },
  { nombre: "Gemini", url: "https://gemini.google.com" },
];

function rubroGenerico(rubro: string): string {
  return rubro.split(/[\s/]/)[0].toLowerCase();
}

export default async function AuditoriaGMBPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [c, checklist, audits, competidores] = await Promise.all([
    getCliente(id),
    getChecklist(id),
    getAudits(id),
    getCompetidores(id),
  ]);
  if (!c) notFound();

  // ---------- Checklist SEO ----------
  const hechos = checklist.filter((i) => i.hecho).length;
  const porcentajeSeo = checklist.length ? Math.round((hechos / checklist.length) * 100) : 0;

  // ---------- Audit GEO ----------
  const rubro = rubroGenerico(c.rubro);
  const preguntas = [
    `¿Cuál es el/la mejor ${rubro} en ${c.zona}, Córdoba?`,
    `Recomendame un/a ${rubro} cerca de ${c.zona}`,
    `¿Dónde encuentro ${c.busquedaClave}?`,
  ];
  const apariciones = audits.filter((a) => a.aparece).length;

  // ---------- Competencia ----------
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
        title="Auditoría Google My Business"
        subtitle={`${c.nombre} · ficha ${porcentajeSeo}% optimizada · ${apariciones} de ${audits.length || 0} consultas de IA con aparición`}
      />

      {/* ---------- Checklist SEO ---------- */}
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Checklist SEO local
      </h2>
      <Card>
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${porcentajeSeo}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {hechos} de {checklist.length} completados
          </p>
        </div>

        <ul className="divide-y divide-slate-100">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-3">
              <form action={accionToggleChecklist}>
                <input type="hidden" name="comercioId" value={c.id} />
                <input type="hidden" name="itemKey" value={item.key} />
                <input type="hidden" name="hecho" value={item.hecho ? "0" : "1"} />
                <button
                  type="submit"
                  aria-label={item.hecho ? "Marcar como pendiente" : "Marcar como hecho"}
                  className={
                    item.hecho
                      ? "grid h-6 w-6 place-items-center rounded-md bg-emerald-500 text-white"
                      : "grid h-6 w-6 place-items-center rounded-md border-2 border-slate-300"
                  }
                >
                  {item.hecho && "✓"}
                </button>
              </form>
              <span className={item.hecho ? "text-sm text-slate-400 line-through" : "text-sm text-slate-700"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------- Audit GEO ---------- */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Audit GEO · ¿la IA te recomienda?
      </h2>
      <Card>
        <h3 className="text-sm font-semibold text-slate-900">
          Paso 1 · Copiá una pregunta
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Preguntas armadas con el rubro y la zona del comercio. Copiá una,
          pegala en un chat gratuito y anotá si te menciona.
        </p>
        <ul className="mt-3 space-y-2">
          {preguntas.map((p) => (
            <li key={p} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">{p}</span>
              <CopyButton texto={p} />
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold text-slate-900">
          Paso 2 · Pegala en un chat gratuito
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHATS_GRATUITOS.map((chat) => (
            <a
              key={chat.nombre}
              href={chat.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
            >
              Abrir {chat.nombre} ↗
            </a>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-slate-900">
          Paso 3 · Registrá el resultado
        </h3>
        <form action={accionRegistrarAudit} className="mt-3 space-y-4">
          <input type="hidden" name="comercioId" value={c.id} />
          <Field label="Pregunta que usaste">
            <input name="pregunta" required defaultValue={preguntas[0]} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plataforma">
              <select name="plataforma" defaultValue="ChatGPT" className={inputCls}>
                {PLATAFORMAS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="¿Te mencionó?">
              <select name="aparece" defaultValue="0" className={inputCls}>
                <option value="1">Sí, apareció</option>
                <option value="0">No, no apareció</option>
              </select>
            </Field>
          </div>
          <Field label="Competidores que mencionó" hint="opcional">
            <input name="competidoresMencionados" placeholder="Bar Central, La Esquina..." className={inputCls} />
          </Field>
          <SubmitButton>Guardar resultado</SubmitButton>
        </form>

        {audits.length > 0 && (
          <div className="mt-6 overflow-x-auto border-t border-slate-100 pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Pregunta</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                  <th className="px-4 py-3 font-medium">Competidores</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(a.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">{a.pregunta}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.plataforma}</td>
                    <td className="px-4 py-2.5">
                      {a.aparece ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          ✅ apareció
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          ❌ no apareció
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {a.competidoresMencionados || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---------- Competencia ---------- */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Monitoreo de competencia
      </h2>
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
        <form action={accionCrearCompetidor} className="mt-3 space-y-4">
          <input type="hidden" name="comercioId" value={c.id} />
          <Field label="Nombre del competidor">
            <input name="nombre" required placeholder="Bar Central" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rating" hint="opcional, 1.0 a 5.0">
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
              Actualizar cada semana
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
                <form action={accionActualizarCompetidor} className="mt-3 flex items-end gap-3">
                  <input type="hidden" name="id" value={comp.id} />
                  <input type="hidden" name="comercioId" value={c.id} />
                  <Field label="Rating">
                    <input name="rating" type="number" min={1} max={5} step={0.1} defaultValue={comp.rating ?? undefined} className={inputCls} />
                  </Field>
                  <Field label="Total reseñas">
                    <input name="totalResenas" type="number" min={0} defaultValue={comp.totalResenas ?? undefined} className={inputCls} />
                  </Field>
                  <SubmitButton>Guardar</SubmitButton>
                </form>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
