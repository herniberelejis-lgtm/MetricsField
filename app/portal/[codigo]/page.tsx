import { notFound } from "next/navigation";
import {
  getClientePorCodigo,
  getTapsDelMesActual,
  getFeedback,
  getChecklist,
  getAudits,
} from "@/lib/db";
import {
  citasIA,
  metricaActual,
  metricaAnterior,
} from "@/lib/types";
import { fmtMes, fmtNum, delta } from "@/lib/format";
import { recomendacionDelMes } from "@/lib/recomendacion";
import { Card, Kpi, Stars, Sparkline, PlanBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

// Portal del cliente: acceso por código privado, solo lectura, solo SUS
// datos. Es la cara visible del servicio mensual — lo que el cliente paga
// por ver. Sin navegación del panel interno.
export default async function PortalPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const c = await getClientePorCodigo(codigo);
  if (!c || c.estado === "baja") notFound();

  const [tapsDelMes, feedback, checklist, audits] = await Promise.all([
    getTapsDelMesActual(c.id),
    getFeedback(c.id),
    getChecklist(c.id),
    getAudits(c.id),
  ]);

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  const esPremium = c.plan === "Premium";
  const recomendacion = recomendacionDelMes(c, m, prev);

  const feedbackResueltos = feedback.filter((f) => f.estado === "resuelto").length;
  const checklistHechos = checklist.filter((i) => i.hecho).length;
  const checklistPct = checklist.length
    ? Math.round((checklistHechos / checklist.length) * 100)
    : 0;
  const ultimosAudits = audits.slice(0, 3);

  const dResenas = delta(m?.resenasNuevas ?? 0, prev?.resenasNuevas ?? 0);
  const dMaps = delta(m?.posicionMaps ?? 0, prev?.posicionMaps ?? 0);
  const dCitas = delta(citasIA(m), citasIA(prev));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header del portal */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-fg">
              Taply — Portal de cliente
            </div>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
              {c.nombre}
            </h1>
            <div className="text-xs text-slate-500">
              {c.rubro} · {c.zona}
              {m && <> · datos a {fmtMes(m.mes)}</>}
            </div>
          </div>
          <PlanBadge plan={c.plan} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {!m ? (
          <Card>
            <p className="text-sm text-slate-600">
              Todavía no hay métricas cargadas para tu negocio. El primer
              reporte va a estar disponible al cierre del mes.
            </p>
          </Card>
        ) : (
          <>
            {/* KPIs del mes */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi
                label="Reseñas nuevas"
                value={fmtNum(m.resenasNuevas)}
                hint={`total ${fmtNum(m.resenasTotal)}`}
                delta={
                  prev
                    ? {
                        dir: dResenas.dir,
                        text: `${dResenas.valor >= 0 ? "+" : ""}${dResenas.valor} vs mes previo`,
                        good: dResenas.dir === "up",
                      }
                    : undefined
                }
              />
              <Kpi
                label="Posición en Maps"
                value={`#${m.posicionMaps}`}
                hint={`“${c.busquedaClave}”`}
                delta={
                  prev
                    ? {
                        dir: dMaps.dir,
                        text: `${dMaps.valor >= 0 ? "+" : ""}${dMaps.valor} vs mes previo`,
                        good: dMaps.dir === "down",
                      }
                    : undefined
                }
              />
              <Kpi
                label="Visitas al perfil"
                value={fmtNum(m.visitasPerfil)}
                hint={`${fmtNum(m.llamadas)} llamadas`}
              />
              <Kpi
                label={esPremium ? "Citaciones en IA" : "Clics cómo llegar"}
                value={fmtNum(esPremium ? citasIA(m) : m.clicsComoLlegar)}
                hint={esPremium ? "ChatGPT · Copilot · Perplexity" : undefined}
                delta={
                  esPremium && prev
                    ? {
                        dir: dCitas.dir,
                        text: `${dCitas.valor >= 0 ? "+" : ""}${dCitas.valor} vs mes previo`,
                        good: dCitas.dir === "up",
                      }
                    : undefined
                }
              />
            </div>

            {/* Reputación + evolución */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Reseñas acumuladas
                  </span>
                  <Stars rating={m.ratingPromedio} />
                </div>
                <Sparkline
                  values={c.historico.map((h) => h.resenasTotal)}
                  width={280}
                  height={60}
                />
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Posición en Google Maps
                  </span>
                  <span className="text-xs text-slate-400">menos es mejor</span>
                </div>
                <Sparkline
                  values={c.historico.map((h) => h.posicionMaps)}
                  width={280}
                  height={60}
                  invert
                />
              </Card>
            </div>

            {/* Premium: IA */}
            {esPremium && (
              <Card className="mt-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Tu negocio en la IA este mes
                </h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>· ChatGPT te recomendó {fmtNum(m.citasChatGPT ?? 0)} veces</li>
                  <li>· Copilot te recomendó {fmtNum(m.citasCopilot ?? 0)} veces</li>
                  <li>· Perplexity te citó {fmtNum(m.citasPerplexity ?? 0)} veces</li>
                </ul>
                {ultimosAudits.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Últimas consultas de Audit GEO
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {ultimosAudits.map((a) => (
                        <li key={a.id} className="text-sm text-slate-600">
                          {a.aparece ? "✅" : "❌"} &ldquo;{a.pregunta}&rdquo;
                          <span className="text-xs text-slate-400"> · {a.plataforma}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Presencia física (NFC) + reputación protegida */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <p className="text-sm font-medium text-slate-700">
                  Cartel NFC este mes
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {fmtNum(tapsDelMes)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  veces que alguien tocó tu cartel
                </p>
              </Card>
              <Card>
                <p className="text-sm font-medium text-slate-700">
                  Reputación protegida
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {feedbackResueltos}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {feedback.length > 0
                    ? `de ${feedback.length} queja${feedback.length === 1 ? "" : "s"} resuelta${feedbackResueltos === 1 ? "" : "s"} antes de llegar a Google`
                    : "todavía no llegó ningún feedback privado"}
                </p>
              </Card>
            </div>

            {checklist.length > 0 && (
              <Card className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    Ficha de Google optimizada
                  </p>
                  <span className="text-sm font-semibold text-slate-900">
                    {checklistPct}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {checklistHechos} de {checklist.length} tareas de SEO local completadas
                </p>
              </Card>
            )}

            {/* Recomendación del mes */}
            <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-5">
              <h2 className="text-sm font-semibold text-brand-fg">
                Recomendación para el mes que viene
              </h2>
              <p className="mt-1 text-sm text-slate-700">{recomendacion}</p>
            </div>

            {/* Histórico */}
            <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
              Evolución mes a mes
            </h2>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Mes</th>
                    <th className="px-4 py-3 font-medium">Reseñas nuevas</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Maps</th>
                    <th className="px-4 py-3 font-medium">Visitas</th>
                    {esPremium && (
                      <th className="px-4 py-3 font-medium">Citas IA</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...c.historico].reverse().map((h) => (
                    <tr
                      key={h.mes}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {fmtMes(h.mes)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {fmtNum(h.resenasNuevas)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {fmtNum(h.resenasTotal)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {h.ratingPromedio.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        #{h.posicionMaps}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {fmtNum(h.visitasPerfil)}
                      </td>
                      {esPremium && (
                        <td className="px-4 py-2.5 tabular-nums">
                          {fmtNum(citasIA(h))}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Portal privado de {c.nombre} · gestionado por Taply,
          Córdoba. No compartas este link.
        </footer>
      </main>
    </div>
  );
}
