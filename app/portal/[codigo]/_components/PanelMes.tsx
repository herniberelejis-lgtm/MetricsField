import { citasIA, type AuditGEOResultado, type MetricaMensual } from "@/lib/types";
import { fmtMes, fmtNum, delta, fmtDec } from "@/lib/format";
import { Card, SectionHeading, IconCheck, IconX } from "@/components/ui";
import TiraMetricas from "@/components/portal/TiraMetricas";
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
  ritmo,
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
  /** Promedio sobre meses completos con dato (lib/historico.ts). */
  ritmo: { promedio: number; meses: number } | null;
  detalleMensual: Record<string, DetalleMes>;
}) {
  // Mes pasado vs el anterior a ese (los dos completos — el mes en curso
  // todavía no terminó, compararlo engaña los primeros días). Un mes sin
  // dato de reseñas nuevas (el primero medido) no se muestra como "0".
  const mesPasado = prev && !prev.nuevasSinDato ? prev : undefined;
  const anteriorAlPrev = historico.length >= 3 ? historico[historico.length - 3] : undefined;
  const antePrev = anteriorAlPrev && !anteriorAlPrev.nuevasSinDato ? anteriorAlPrev : undefined;
  const dMesPasado = delta(mesPasado?.resenasNuevas ?? 0, antePrev?.resenasNuevas ?? 0);
  const conDato = historico.filter((h) => !h.nuevasSinDato);
  const mejorMes = conDato.length >= 2
    ? conDato.reduce((mejor, h) => (h.resenasNuevas > mejor.resenasNuevas ? h : mejor), conDato[0])
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
          <TiraMetricas
            etiqueta="Tus reseñas, mes a mes"
            celdas={[
              ...(mesPasado
                ? [
                    {
                      etiqueta: `Mes pasado · ${fmtMes(mesPasado.mes)}`,
                      valor: fmtNum(mesPasado.resenasNuevas),
                      detalle: antePrev ? (
                        <>
                          <span
                            className={`font-semibold ${
                              dMesPasado.dir === "up"
                                ? "text-[#0B5E40]"
                                : dMesPasado.dir === "down"
                                  ? "text-[#8A3F00]"
                                  : "text-slate-600"
                            }`}
                          >
                            {dMesPasado.dir === "up" ? "▲" : dMesPasado.dir === "down" ? "▼" : "="}{" "}
                            {dMesPasado.valor >= 0 ? "+" : ""}
                            {dMesPasado.valor}
                          </span>{" "}
                          reseñas vs {fmtMes(antePrev.mes)}
                        </>
                      ) : (
                        "reseñas nuevas"
                      ),
                    },
                  ]
                : []),
              // Con un solo mes completo, el promedio repetiría "Mes pasado".
              ...(ritmo && ritmo.meses >= 2
                ? [
                    {
                      etiqueta: "Promedio por mes",
                      valor: fmtDec(ritmo.promedio, 1),
                      detalle: `reseñas nuevas, sobre ${ritmo.meses} meses completos`,
                    },
                  ]
                : []),
              ...(mejorMes && mejorMes.resenasNuevas > 0
                ? [{ etiqueta: "Tu mejor mes", valor: fmtNum(mejorMes.resenasNuevas), detalle: `reseñas nuevas en ${fmtMes(mejorMes.mes)}` }]
                : []),
              ...(conBusinessProfile
                ? [
                    { etiqueta: "Visitas al perfil", valor: fmtNum(m.visitasPerfil), detalle: `${fmtNum(m.llamadas)} llamadas` },
                    { etiqueta: "Pedidos de cómo llegar", valor: fmtNum(m.clicsComoLlegar), detalle: "en el mes" },
                  ]
                : []),
            ]}
          />

          {conBusinessProfile && historico.length >= 2 && <VisitasPorMes historico={historico} />}
        </>
      )}

      {mostrarIA && (
        <Card variant="glass" className="mt-4">
          <h2 className="text-[15px] font-bold text-slate-900">Tu negocio en la IA este mes</h2>
          <p className="mt-0.5 text-xs text-slate-600">Cuántas veces te recomendó o te citó cada asistente</p>
          <ul className="mt-3 divide-y divide-[#EEF0F3] text-sm">
            {[
              ["ChatGPT", m?.citasChatGPT ?? 0],
              ["Copilot", m?.citasCopilot ?? 0],
              ["Perplexity", m?.citasPerplexity ?? 0],
            ].map(([nombre, n]) => (
              <li key={nombre} className="flex items-center justify-between py-2">
                <span className="text-slate-700">{nombre}</span>
                <span className="font-medium tabular-nums text-slate-900">
                  {fmtNum(Number(n))} {Number(n) === 1 ? "vez" : "veces"}
                </span>
              </li>
            ))}
          </ul>
          {ultimosAudits.length > 0 && (
            <div className="mt-4 border-t border-[#EEF0F3] pt-3">
              <p className="text-xs font-medium text-slate-600">Últimas consultas de Audit GEO</p>
              <ul className="mt-2 space-y-1.5">
                {ultimosAudits.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm text-slate-600">
                    {a.aparece ? (
                      <IconCheck size={15} className="mt-0.5 shrink-0 text-[#0B5E40]" />
                    ) : (
                      <IconX size={15} className="mt-0.5 shrink-0 text-slate-600" />
                    )}
                    <span>
                      &ldquo;{a.pregunta}&rdquo;
                      <span className="text-xs text-slate-600"> · {a.plataforma}</span>
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
            <p className="text-[15px] font-bold text-slate-900">Ficha de Google optimizada</p>
            <span className="text-sm font-semibold tabular-nums text-slate-900">{checklistPct}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#EEF0F3]">
            <div className="h-full rounded-full bg-[#7FA7D3]" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            {checklistHechos} de {checklistLength} tareas de SEO local completadas
          </p>
        </Card>
      )}

      {recomendacion && (
        <div className="mt-4 rounded-2xl bg-[#F4F7FB] p-5">
          <h2 className="text-[15px] font-bold text-slate-900">Recomendación para el mes que viene</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{recomendacion}</p>
        </div>
      )}

      {historico.length > 0 && (
        <>
          <SectionHeading
            title="Evolución mes a mes"
            subtitle="reseñas nuevas, total y calificación de cada mes"
          />
          {Object.values(detalleMensual).some((d) => d.terminos.length > 0) && (
            <p className="mb-2 text-xs text-slate-600">Tocá un mes para ver el detalle de ese período.</p>
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

// Visitas al perfil mes a mes: columnas con el número arriba (DESIGN.md:
// barras en el celeste de los datos, el último mes un tono más fuerte).
function VisitasPorMes({ historico }: { historico: MetricaMensual[] }) {
  const meses = historico.slice(-12);
  const max = Math.max(1, ...meses.map((h) => h.visitasPerfil));
  return (
    <Card variant="glass" className="mt-4">
      <h2 className="text-[15px] font-bold text-slate-900">Visitas al perfil, mes a mes</h2>
      <p className="mt-0.5 text-xs text-slate-600">Personas que vieron tu ficha en Google cada mes</p>
      <ol className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2.5">
        {meses.map((h, i) => (
          <li key={h.mes} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-medium tabular-nums text-slate-700">{fmtNum(h.visitasPerfil)}</span>
            <div
              className={`w-full max-w-10 rounded-t-md ${i === meses.length - 1 ? "bg-[#6F9BCF]" : "bg-[#A9C5E6]"}`}
              style={{ height: `${Math.max(3, Math.round((h.visitasPerfil / max) * 120))}px` }}
              title={`${fmtMes(h.mes)}: ${fmtNum(h.visitasPerfil)}`}
            />
            <span className="w-full truncate text-center text-[11px] text-slate-600">{fmtMes(h.mes).slice(0, 3)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
