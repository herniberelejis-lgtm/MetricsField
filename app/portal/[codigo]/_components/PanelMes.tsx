import { citasIA, type AuditGEOResultado, type MetricaMensual } from "@/lib/types";
import { fmtMes, fmtNum, delta } from "@/lib/format";
import { Card, Kpi, Stars, Sparkline, SectionHeading, IconCheck, IconX } from "@/components/ui";
import TendenciaResenasChart from "@/components/TendenciaResenasChart";
import EvolucionMensual, { type DetalleMes } from "@/components/EvolucionMensual";

// Panel "Resumen del mes": KPIs del snapshot mensual, citaciones en IA
// (Premium), checklist de SEO local, recomendación del mes que viene y la
// evolución mes a mes con drill-down por período.
export default function PanelMes({
  m,
  prev,
  esPremium,
  historico,
  ultimosAudits,
  checklistLength,
  checklistHechos,
  checklistPct,
  recomendacion,
  promedioResenasMensual,
  detalleMensual,
}: {
  m: MetricaMensual | undefined;
  prev: MetricaMensual | undefined;
  esPremium: boolean;
  historico: MetricaMensual[];
  ultimosAudits: AuditGEOResultado[];
  checklistLength: number;
  checklistHechos: number;
  checklistPct: number;
  recomendacion: string | null;
  promedioResenasMensual: number;
  detalleMensual: Record<string, DetalleMes>;
}) {
  const dResenas = delta(m?.resenasNuevas ?? 0, prev?.resenasNuevas ?? 0);
  const dCitas = delta(citasIA(m), citasIA(prev));

  return (
    <>
      {!m ? (
        <Card variant="glass">
          <p className="text-sm text-slate-600">
            Todavía no cargamos las métricas de este mes (reseñas, posición en Maps, visitas).
            Se actualiza una vez al mes — mientras tanto, en "Escaneos" ya ves lo que pasa con
            tu cartel día a día.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Kpi
              variant="glass"
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
            <Kpi variant="glass" label="Visitas al perfil" value={fmtNum(m.visitasPerfil)} hint={`${fmtNum(m.llamadas)} llamadas`} />
            <Kpi
              variant="glass"
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

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card variant="glass">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Reseñas acumuladas</span>
                <Stars rating={m.ratingPromedio} mono />
              </div>
              <Sparkline values={historico.map((h) => h.resenasTotal)} width={280} height={60} mono />
            </Card>
            <Card variant="glass">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Visitas al perfil</span>
              </div>
              <Sparkline values={historico.map((h) => h.visitasPerfil)} width={280} height={60} mono />
            </Card>
          </div>
        </>
      )}

      {esPremium && (
        <Card variant="glass" className="mt-4">
          <h2 className="text-sm font-medium text-slate-700">Tu negocio en la IA este mes</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>· ChatGPT te recomendó {fmtNum(m?.citasChatGPT ?? 0)} veces</li>
            <li>· Copilot te recomendó {fmtNum(m?.citasCopilot ?? 0)} veces</li>
            <li>· Perplexity te citó {fmtNum(m?.citasPerplexity ?? 0)} veces</li>
          </ul>
          {ultimosAudits.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Últimas consultas de Audit GEO</p>
              <ul className="mt-2 space-y-1.5">
                {ultimosAudits.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm text-slate-600">
                    {a.aparece ? (
                      <IconCheck size={15} className="mt-0.5 shrink-0 text-slate-900" />
                    ) : (
                      <IconX size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    )}
                    <span>
                      &ldquo;{a.pregunta}&rdquo;
                      <span className="text-xs text-slate-400"> · {a.plataforma}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {checklistLength > 0 && (
        <Card variant="glass" className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Ficha de Google optimizada</p>
            <span className="text-sm font-semibold text-slate-900">{checklistPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {checklistHechos} de {checklistLength} tareas de SEO local completadas
          </p>
        </Card>
      )}

      {recomendacion && (
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h2 className="text-sm font-semibold text-brand-fg">Recomendación para el mes que viene</h2>
          <p className="mt-1 text-sm text-slate-700">{recomendacion}</p>
        </div>
      )}

      {historico.length > 0 && (
        <>
          <SectionHeading
            title="Evolución mes a mes"
            subtitle={`Promedio: ${promedioResenasMensual.toFixed(1)} reseñas nuevas por mes`}
          />
          {historico.length >= 2 && (
            <div className="mb-4">
              <TendenciaResenasChart
                labels={historico.map((h) => fmtMes(h.mes))}
                totales={historico.map((h) => h.resenasTotal)}
                ratings={historico.map((h) => h.ratingPromedio)}
              />
            </div>
          )}
          <p className="mb-2 text-xs text-slate-500">Tocá un mes para ver el detalle de ese período.</p>
          <EvolucionMensual historico={historico} esPremium={esPremium} detalle={detalleMensual} />
        </>
      )}
    </>
  );
}
