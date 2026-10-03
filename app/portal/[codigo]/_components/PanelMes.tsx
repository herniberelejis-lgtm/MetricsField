import { citasIA, type AuditGEOResultado, type MetricaMensual } from "@/lib/types";
import { fmtMes, fmtNum, delta } from "@/lib/format";
import { Card, Kpi, Sparkline, SectionHeading, IconCheck, IconX } from "@/components/ui";
import EvolucionMensual, { type DetalleMes } from "@/components/EvolucionMensual";
import { businessProfileHabilitado } from "@/lib/gbp";

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
  // Mes pasado vs el anterior a ese (los dos completos — el mes en curso
  // todavía no terminó, compararlo engaña los primeros días).
  const antePrev = historico.length >= 3 ? historico[historico.length - 3] : undefined;
  const dMesPasado = delta(prev?.resenasNuevas ?? 0, antePrev?.resenasNuevas ?? 0);
  const mejorMes = historico.length >= 2
    ? historico.reduce((mejor, h) => (h.resenasNuevas > mejor.resenasNuevas ? h : mejor), historico[0])
    : null;
  // Visitas / llamadas / "cómo llegar" son de Business Profile: ocultas
  // hasta que Google apruebe esa API (ver lib/gbp.ts).
  const conBusinessProfile = businessProfileHabilitado();
  // Las citaciones en IA las carga el equipo a mano (Audit GEO): si nunca
  // se cargó ninguna, mostrar "0 veces" diría algo falso ("la IA no te
  // recomienda") en vez de "todavía no lo medimos".
  const historialIA = historico.some((h) => citasIA(h) > 0) || ultimosAudits.length > 0;
  const mostrarIA = esPremium && historialIA;

  return (
    <>
      {!m ? (
        <Card variant="glass">
          <p className="text-sm text-slate-600">
            Todavía no cargamos las métricas de este mes (reseñas y calificación).
            Se actualiza una vez al mes — mientras tanto, en "Escaneos" ya ves lo que pasa con
            tu cartel día a día.
          </p>
        </Card>
      ) : (
        <>
          {/* "Reseñas este mes" ya está en el Resumen y la calificación mes a
              mes en Mi Rating: acá va la comparación con meses anteriores,
              que no está en ningún otro lado. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {prev && (
              <Kpi
                variant="glass"
                label={`Mes pasado · ${fmtMes(prev.mes)}`}
                value={fmtNum(prev.resenasNuevas)}
                hint="reseñas nuevas"
                delta={
                  antePrev
                    ? {
                        dir: dMesPasado.dir,
                        text: `${dMesPasado.valor >= 0 ? "+" : ""}${dMesPasado.valor} vs ${fmtMes(antePrev.mes)}`,
                        good: dMesPasado.dir === "up",
                      }
                    : undefined
                }
              />
            )}
            {historico.length >= 2 && (
              <Kpi
                variant="glass"
                label="Promedio por mes"
                value={promedioResenasMensual.toFixed(1)}
                hint="reseñas nuevas"
              />
            )}
            {mejorMes && (
              <Kpi
                variant="glass"
                label="Tu mejor mes"
                value={fmtNum(mejorMes.resenasNuevas)}
                hint={`reseñas nuevas en ${fmtMes(mejorMes.mes)}`}
              />
            )}
            {conBusinessProfile && (
              <Kpi variant="glass" label="Visitas al perfil" value={fmtNum(m.visitasPerfil)} hint={`${fmtNum(m.llamadas)} llamadas`} />
            )}
            {conBusinessProfile && (
              <Kpi variant="glass" label="Clics cómo llegar" value={fmtNum(m.clicsComoLlegar)} />
            )}
          </div>

          {conBusinessProfile && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card variant="glass">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Visitas al perfil</span>
                </div>
                <Sparkline values={historico.map((h) => h.visitasPerfil)} width={280} height={60} mono />
              </Card>
            </div>
          )}
        </>
      )}

      {mostrarIA && (
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

      {/* Checklist interno de SEO local que tilda el equipo: con 0 tareas
          hechas, un "0%" no le dice nada útil al cliente. */}
      {checklistLength > 0 && checklistHechos > 0 && (
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
            subtitle="reseñas nuevas, total y calificación de cada mes"
          />
          {Object.values(detalleMensual).some((d) => d.terminos.length > 0) && (
            <p className="mb-2 text-xs text-slate-500">Tocá un mes para ver el detalle de ese período.</p>
          )}
          <EvolucionMensual
            historico={historico}
            esPremium={mostrarIA}
            mostrarVisitas={conBusinessProfile}
            detalle={detalleMensual}
          />
        </>
      )}
    </>
  );
}
