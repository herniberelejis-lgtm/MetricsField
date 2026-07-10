import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import {
  getClientePorCodigo,
  getTapsPorDiaPorSoporte,
  getLinks,
  getFeedback,
  getChecklist,
  getAudits,
  getResenas,
  getBenchmarkMensual,
} from "@/lib/db";
import {
  citasIA,
  metricaActual,
  metricaAnterior,
} from "@/lib/types";
import { fmtMes, fmtNum, delta } from "@/lib/format";
import { recomendacionDelMes } from "@/lib/recomendacion";
import { waUrl } from "@/lib/whatsapp";
import { Card, Kpi, Stars, Sparkline, PlanBadge, SectionHeading, btnPrimary, btnSecondary } from "@/components/ui";
import { terminosFrecuentes } from "@/lib/keywords";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import TendenciaResenasChart from "@/components/TendenciaResenasChart";
import EvolucionMensual, { type DetalleMes } from "@/components/EvolucionMensual";
import BenchmarkCompetencia, { type CrecimientoVsCompetencia } from "@/components/BenchmarkCompetencia";
import GestionResenas from "@/components/GestionResenas";
import AutomatizacionResenas from "@/components/AutomatizacionResenas";
import ResumenResenas, { type ResumenResenasData } from "@/components/ResumenResenas";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";

export const dynamic = "force-dynamic";

const AGENCIA_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

const COLOR_ESTADO_FEEDBACK: Record<string, string> = {
  nuevo: "bg-rose-50 text-rose-700",
  en_proceso: "bg-amber-50 text-amber-700",
  resuelto: "bg-slate-100 text-slate-600",
};

const LABEL_ESTADO_FEEDBACK: Record<string, string> = {
  nuevo: "nueva",
  en_proceso: "en proceso",
  resuelto: "resuelta",
};

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

// Portal del cliente: acceso por código privado, solo lectura, solo SUS
// datos. Es la cara visible del servicio mensual — lo que el cliente paga
// por ver. Sin navegación del panel interno.
const MENSAJE_GOOGLE: Record<string, { texto: string; tono: "ok" | "error" }> = {
  conectado: { texto: "Conectaste tu cuenta de Google. En un rato vas a ver visitas y llamadas acá.", tono: "ok" },
  error: { texto: "No se pudo conectar — probá de nuevo.", tono: "error" },
  cancelado: { texto: "Cancelaste la conexión con Google.", tono: "error" },
  "no-configurado": { texto: "Esta función todavía no está disponible.", tono: "error" },
};

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const { codigo } = await params;
  const { google } = await searchParams;

  // Límite por IP antes de tocar la base: el código de acceso es la única
  // credencial del portal (sin usuario/contraseña), así que frenar la
  // enumeración acá es la defensa que importa. Mismo resultado (404) que un
  // código inválido, para no confirmarle a quien enumera si pegó cerca.
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!permitir(`portal-codigo:${ip}`, 20, 10 * 60_000)) notFound();

  const c = await getClientePorCodigo(codigo);
  if (!c || c.estado === "baja") notFound();

  const gbpConectado = Boolean(c.googleConectadoEn);
  const diasConectado = c.googleConectadoEn
    ? Math.floor((Date.now() - new Date(c.googleConectadoEn).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const gbpPorVencer = diasConectado !== null && diasConectado >= 6;
  const mensajeGoogle = google ? MENSAJE_GOOGLE[google] : null;

  const [tapsPorDiaSoporte, links, feedback, checklist, audits, resenas, benchmark] =
    await Promise.all([
      getTapsPorDiaPorSoporte(c.id, 14),
      getLinks(c.id),
      getFeedback(c.id),
      getChecklist(c.id),
      getAudits(c.id),
      getResenas(c.id),
      getBenchmarkMensual(c.id),
    ]);

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  const esPremium = c.plan === "Premium";
  const recomendacion = m ? recomendacionDelMes(c, m, prev) : null;

  const feedbackPendiente = feedback.filter((f) => f.estado !== "resuelto");
  const feedbackResueltos = feedback.filter((f) => f.estado === "resuelto").length;
  const checklistHechos = checklist.filter((i) => i.hecho).length;
  const checklistPct = checklist.length
    ? Math.round((checklistHechos / checklist.length) * 100)
    : 0;
  const ultimosAudits = audits.slice(0, 3);

  // Drill-down por mes calculado en el servidor: por cada mes del histórico,
  // los temas recurrentes de las reseñas y el feedback con texto de ese mes.
  // El texto crudo (feedback privado incluido) nunca se manda al cliente:
  // solo viaja el agregado.
  const detalleMensual: Record<string, DetalleMes> = {};
  for (const h of c.historico) {
    const textos = [
      ...resenas.filter((r) => r.fecha.startsWith(h.mes)).map((r) => r.texto),
      ...feedback.filter((f) => f.creadoEn.startsWith(h.mes)).map((f) => f.texto),
    ].filter((t) => t && t.trim().length > 0);
    detalleMensual[h.mes] = {
      terminos: terminosFrecuentes(textos),
      nResenasTexto: textos.length,
    };
  }

  const resenasPendientes = resenas.filter((r) => r.estado === "nueva");
  const resenasAutomaticas = resenas.filter((r) => r.publicadaAutomaticamente).slice(0, 5);

  // Resumen de "cómo van las reseñas": distribución por estrellas, si la
  // tendencia reciente mejora o empeora, y qué se repite en las quejas —
  // sobre TODAS las reseñas, no solo las pendientes de responder.
  const resumenResenas: ResumenResenasData = (() => {
    const distribucion = ([5, 4, 3, 2, 1] as const).map((estrellas) => ({
      estrellas,
      cantidad: resenas.filter((r) => r.estrellas === estrellas).length,
    }));
    const total = resenas.length;
    const promedio = total > 0 ? resenas.reduce((acc, r) => acc + r.estrellas, 0) / total : null;

    let tendencia: ResumenResenasData["tendencia"] = null;
    if (total >= 4) {
      // resenas viene ordenado por fecha DESC (getResenas): lo primero es lo más nuevo
      const mitad = Math.floor(total / 2);
      const recientes = resenas.slice(0, mitad);
      const anteriores = resenas.slice(mitad, mitad * 2);
      const promedioDe = (arr: typeof resenas) =>
        arr.reduce((acc, r) => acc + r.estrellas, 0) / arr.length;
      const diferencia = promedioDe(recientes) - promedioDe(anteriores);
      const dir = diferencia > 0.15 ? "up" : diferencia < -0.15 ? "down" : "flat";
      tendencia = {
        dir,
        texto:
          dir === "up"
            ? "mejorando en las últimas reseñas"
            : dir === "down"
              ? "bajando en las últimas reseñas"
              : "estable",
      };
    }

    const temasRecurrentes = terminosFrecuentes(
      resenas.filter((r) => r.estrellas <= 3).map((r) => r.texto),
      { max: 6, minimo: 2 },
    );

    return { distribucion, total, promedio, tendencia, temasRecurrentes };
  })();

  // Crecimiento del mes vs el anterior, propio y de la competencia — el
  // número pelado ("tenés 40 reseñas") dice menos que el ritmo ("crecés más
  // rápido que tu competencia"). `benchmark` viene ordenado del mes más
  // reciente al más viejo (ver getBenchmarkMensual).
  const crecimientoVsCompetencia: CrecimientoVsCompetencia | null = (() => {
    if (benchmark.length < 2) return null;
    const actual = benchmark[0];
    const anterior = benchmark[1];
    if (actual.propioResenas === null || anterior.propioResenas === null) return null;

    const propio = actual.propioResenas - anterior.propioResenas;
    const propioPct = anterior.propioResenas > 0 ? (propio / anterior.propioResenas) * 100 : null;

    const resenasAnteriorPorNombre = new Map(anterior.competidores.map((c) => [c.nombre, c.totalResenas]));
    let sumaActual = 0;
    let sumaAnterior = 0;
    let pares = 0;
    for (const c of actual.competidores) {
      const prev = resenasAnteriorPorNombre.get(c.nombre);
      if (c.totalResenas === null || prev === null || prev === undefined) continue;
      sumaActual += c.totalResenas;
      sumaAnterior += prev;
      pares += 1;
    }
    const competenciaPct = pares > 0 && sumaAnterior > 0 ? ((sumaActual - sumaAnterior) / sumaAnterior) * 100 : null;

    return { mes: actual.mes, propio, propioPct, competenciaPct };
  })();

  const diasConTaps = [...new Set(tapsPorDiaSoporte.map((d) => d.fecha))].sort();
  const labelsTaps = diasConTaps.map((d) => d.slice(5).replace("-", "/"));
  const nfcPorDia = diasConTaps.map((d) => tapsPorDiaSoporte.find((x) => x.fecha === d)?.nfc ?? 0);
  const qrPorDia = diasConTaps.map((d) => tapsPorDiaSoporte.find((x) => x.fecha === d)?.qr ?? 0);

  const linksConTaps = [...links].sort((a, b) => b.taps - a.taps);
  const totalTapsHistorico = links.reduce((acc, l) => acc + l.taps, 0);
  const totalTapsNfc = links.filter((l) => l.tipo === "nfc").reduce((acc, l) => acc + l.taps, 0);
  const totalTapsQr = links.filter((l) => l.tipo === "qr" || l.tipo === "ambos").reduce((acc, l) => acc + l.taps, 0);
  const tieneSoporteQr = links.some((l) => l.tipo === "qr" || l.tipo === "ambos");

  const dResenas = delta(m?.resenasNuevas ?? 0, prev?.resenasNuevas ?? 0);
  const dCitas = delta(citasIA(m), citasIA(prev));

  // Lo que corre arriba de todo: acciones pendientes reales del dueño,
  // ordenadas por urgencia. Todo lo demás del portal es "mirar" — esto es
  // lo único que hay que "hacer", así que va primero pase lo que pase.
  type Prioridad = { texto: string; href: string; tono: "urgente" | "atencion" | "info" };
  const prioridades: Prioridad[] = [];
  if (resenasPendientes.length > 0) {
    prioridades.push({
      texto: `${resenasPendientes.length} reseña${resenasPendientes.length === 1 ? "" : "s"} esperando tu respuesta`,
      href: "#resenas",
      tono: "urgente",
    });
  }
  if (feedbackPendiente.length > 0) {
    prioridades.push({
      texto: `${feedbackPendiente.length} queja${feedbackPendiente.length === 1 ? "" : "s"} privada${feedbackPendiente.length === 1 ? "" : "s"} sin resolver`,
      href: "#feedback",
      tono: "atencion",
    });
  }
  if (gbpPorVencer) {
    prioridades.push({
      texto: "El permiso de Google vence pronto — reconectá para no cortar la sincronización",
      href: "#gbp",
      tono: "atencion",
    });
  }
  if (!gbpConectado) {
    prioridades.push({
      texto: "Conectá tu Google Business Profile para automatizar visitas y llamadas",
      href: "#gbp",
      tono: "info",
    });
  }
  const COLOR_TONO: Record<Prioridad["tono"], string> = {
    urgente: "bg-rose-500",
    atencion: "bg-amber-500",
    info: "bg-brand",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header del portal */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-fg">
              Taply · Portal de cliente
            </div>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-slate-900">
              {c.nombre}
            </h1>
            <div className="mt-0.5 text-xs text-slate-500">
              {c.rubro} · {c.zona}
              {m && <> · datos a {fmtMes(m.mes)}</>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PlanBadge plan={c.plan} />
            {AGENCIA_WHATSAPP && (
              <a
                href={waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
              >
                <span aria-hidden>💬</span> Hablar con tu agencia
              </a>
            )}
          </div>
        </div>

        {/* Accesos rápidos: solo a las secciones que existen para este cliente */}
        <nav className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-1.5 px-6 pb-3 text-xs font-medium">
          {resenas.length > 0 && (
            <a href="#resenas" className="inline-flex items-center gap-1 text-slate-500 transition hover:text-brand-fg">
              Reseñas
              {resenasPendientes.length > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  {resenasPendientes.length}
                </span>
              )}
            </a>
          )}
          <a href="#en-vivo" className="text-slate-500 transition hover:text-brand-fg">
            En vivo
          </a>
          {m && (
            <a href="#metricas" className="text-slate-500 transition hover:text-brand-fg">
              Métricas del mes
            </a>
          )}
          {esPremium && (
            <a href="#ia" className="text-slate-500 transition hover:text-brand-fg">
              Tu negocio en la IA
            </a>
          )}
          {checklist.length > 0 && (
            <a href="#seo" className="text-slate-500 transition hover:text-brand-fg">
              Ficha de Google
            </a>
          )}
          {c.historico.length > 0 && (
            <a href="#evolucion" className="text-slate-500 transition hover:text-brand-fg">
              Evolución
            </a>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {mensajeGoogle && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              mensajeGoogle.tono === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {mensajeGoogle.texto}
          </div>
        )}

        {/* Lo único que requiere una acción del dueño, ordenado por
            urgencia — todo lo demás en este portal es informativo. */}
        {prioridades.length > 0 && (
          <Card className="mb-4 !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Necesita tu atención
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {prioridades.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {prioridades.map((p) => (
                <a
                  key={p.href + p.texto}
                  href={p.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_TONO[p.tono]}`} aria-hidden />
                  <span className="flex-1">{p.texto}</span>
                  <span className="text-slate-300" aria-hidden>→</span>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Gestión de reseñas: el dueño edita/aprueba la respuesta sugerida
            para sus reseñas de Google, sin depender del equipo de Taply.
            Va primero entre las secciones de contenido: es la única con
            impacto directo y público en la reputación del negocio. */}
        {resenas.length > 0 && (
          <Card className="mb-4 scroll-mt-4" id="resenas">
            <p className="text-sm font-medium text-slate-700">Gestión de reseñas</p>
            <p className="mt-1 text-xs text-slate-500">
              Las positivas se responden solas (ver más abajo); las que necesitan tu
              criterio quedan acá para que las edites, apruebes y copies a Google vos mismo.
            </p>

            <div className="mt-3">
              <ResumenResenas data={resumenResenas} />
            </div>

            <div className="mt-3">
              <AutomatizacionResenas
                codigo={c.codigoAcceso}
                activa={c.autoResponderPositivas}
                umbral={c.autoResponderUmbral}
                apiHabilitada={resenasApiHabilitada()}
                resenasAutomaticas={resenasAutomaticas}
              />
            </div>

            <div className="mt-3">
              <GestionResenas
                resenasIniciales={resenasPendientes}
                tonoMarca={c.tonoMarca}
                codigo={c.codigoAcceso}
              />
            </div>
          </Card>
        )}

        {/* Feedback privado: el contenido real, no solo el número */}
        {feedback.length > 0 && (
          <Card className="mb-4 scroll-mt-4" id="feedback">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Feedback privado de tus clientes
              </p>
              {feedbackPendiente.length > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                  {feedbackPendiente.length} sin resolver
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Esto nunca se publica en Google — te llega solo a vos, para que lo resuelvas antes de que se haga público.
            </p>
            <div className="mt-3 divide-y divide-slate-100">
              {feedback.slice(0, 6).map((f) => (
                <div key={f.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{"★".repeat(f.estrellas)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_FEEDBACK[f.estado]}`}>
                      {LABEL_ESTADO_FEEDBACK[f.estado]}
                    </span>
                    <span className="text-xs text-slate-400">{fechaCorta(f.creadoEn)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{f.texto}</p>
                </div>
              ))}
            </div>
            {feedback.length > 6 && (
              <p className="mt-2 text-xs text-slate-400">
                Y {feedback.length - 6} más — pedile a tu agencia el detalle completo.
              </p>
            )}
          </Card>
        )}

        {/* Conexión con Google Business Profile: la autoriza el dueño de la
            ficha (este cliente), no la agencia — así las visitas y llamadas
            se traen solas sin que nadie tenga que cargar nada a mano. */}
        <Card className="mb-4 scroll-mt-4" id="gbp">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${
                  gbpConectado ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-hidden
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Google Business Profile
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      gbpConectado ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {gbpConectado ? "Conectado" : "No conectado"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {gbpConectado
                    ? "Así traemos solas las visitas, llamadas y clics de “cómo llegar” de tu ficha."
                    : "Autorizá con tu cuenta de Google (la que administra tu ficha) para que las visitas y llamadas se carguen solas, sin que nadie tenga que anotarlas a mano."}
                </p>
                {gbpConectado && (
                  <p className="mt-1 text-xs text-slate-400">
                    Conectado {diasConectado === 0 ? "hoy" : `hace ${diasConectado} día${diasConectado === 1 ? "" : "s"}`}.
                  </p>
                )}
              </div>
            </div>
            <a
              href={`/api/portal/google/oauth/start?codigo=${c.codigoAcceso}`}
              className={`shrink-0 ${gbpConectado ? btnSecondary : btnPrimary}`}
            >
              {gbpConectado ? "Reconectar" : "Conectar con Google"}
            </a>
          </div>
          {gbpPorVencer && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⏳ Todavía estamos terminando de verificar la app con Google —
              mientras tanto, este permiso vence cada 7 días. Tocá
              "Reconectar" una vez por semana para que no se corte.
            </p>
          )}
        </Card>

        {/* En vivo: no depende de que se hayan cargado métricas del mes */}
        <SectionHeading
          id="en-vivo"
          title="En vivo"
          subtitle="Esto se actualiza solo, apenas pasa — nadie tiene que cargar nada."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Taps del cartel</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {fmtNum(totalTapsHistorico)}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  veces que alguien tocó o escaneó tu cartel desde que se instaló
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-lg" aria-hidden>
                📶
              </span>
            </div>
            {tieneSoporteQr && (
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <span className="font-semibold tabular-nums text-slate-900">{fmtNum(totalTapsNfc)}</span>
                  vía NFC
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <span className="font-semibold tabular-nums text-slate-900">{fmtNum(totalTapsQr)}</span>
                  vía QR (aprox.)
                </span>
              </div>
            )}
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-700">
              Reputación protegida
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {feedbackResueltos}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {feedback.length > 0
                ? `de ${feedback.length} queja${feedback.length === 1 ? "" : "s"} resuelta${feedbackResueltos === 1 ? "" : "s"} antes de llegar a Google`
                : "todavía no llegó ningún feedback privado"}
            </p>
          </Card>
          {c.googleSyncEn && (
            <Card className="md:col-span-3">
              <p className="text-sm font-medium text-slate-700">
                Tu ficha de Google ahora mismo
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-slate-900">
                  {c.ratingGoogle?.toFixed(1)}★
                </span>
                <span className="text-sm text-slate-500">
                  {fmtNum(c.resenasGoogle ?? 0)} reseñas totales
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                actualizado automáticamente {new Date(c.googleSyncEn).toLocaleDateString("es-AR")}
              </p>
            </Card>
          )}
        </div>

        {diasConTaps.length > 0 && (
          <div className="mt-4">
            <TapsPorSoporteChart
              labels={labelsTaps}
              fechas={diasConTaps}
              nfc={nfcPorDia}
              qr={qrPorDia}
              mostrarQr={tieneSoporteQr}
              codigo={c.codigoAcceso}
            />
          </div>
        )}

        {linksConTaps.length > 1 && totalTapsHistorico > 0 && (
          <Card className="mt-4">
            <p className="text-sm font-medium text-slate-700">
              Taps por cartel
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              histórico total, desde que se instaló cada uno
            </p>
            <div className="mt-3 space-y-2">
              {linksConTaps.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-slate-600">
                    {l.etiqueta}
                    {tieneSoporteQr && (
                      <span className="ml-1 text-[10px] uppercase text-slate-400">
                        · {l.tipo === "ambos" ? "NFC+QR" : l.tipo}
                      </span>
                    )}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: totalTapsHistorico ? `${Math.max(4, (l.taps / totalTapsHistorico) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                    {l.taps}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {diasConTaps.length === 0 && feedback.length === 0 && (
          <Card className="mt-4">
            <p className="text-sm text-slate-600">
              Todavía no hay actividad del cartel. En cuanto alguien lo
              toque por primera vez, vas a ver acá el total de taps y
              cualquier feedback que deje.
            </p>
          </Card>
        )}

        {/* Métricas del mes: manuales, con estado vacío que no bloquea lo de arriba */}
        <SectionHeading id="metricas" title="Métricas del mes" />
        {!m ? (
          <Card>
            <p className="text-sm text-slate-600">
              Todavía no cargamos las métricas de este mes (reseñas, posición
              en Maps, visitas). Se actualiza una vez al mes — mientras
              tanto, arriba en "En vivo" ya ves lo que pasa con tu cartel
              y tu reputación día a día.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
                    Visitas al perfil
                  </span>
                </div>
                <Sparkline
                  values={c.historico.map((h) => h.visitasPerfil)}
                  width={280}
                  height={60}
                />
              </Card>
            </div>
          </>
        )}

        {/* Premium: IA */}
        {esPremium && (
          <Card className="mt-9 scroll-mt-6" id="ia">
            <h2 className="text-sm font-medium text-slate-700">
              Tu negocio en la IA este mes
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>· ChatGPT te recomendó {fmtNum(m?.citasChatGPT ?? 0)} veces</li>
              <li>· Copilot te recomendó {fmtNum(m?.citasCopilot ?? 0)} veces</li>
              <li>· Perplexity te citó {fmtNum(m?.citasPerplexity ?? 0)} veces</li>
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

        {checklist.length > 0 && (
          <Card className="mt-4 scroll-mt-4" id="seo">
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
        {recomendacion && (
          <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-5">
            <h2 className="text-sm font-semibold text-brand-fg">
              Recomendación para el mes que viene
            </h2>
            <p className="mt-1 text-sm text-slate-700">{recomendacion}</p>
          </div>
        )}

        {/* Histórico */}
        {c.historico.length > 0 && (
          <>
            <SectionHeading id="evolucion" title="Evolución mes a mes" />
            {c.historico.length >= 2 && (
              <div className="mb-4">
                <TendenciaResenasChart
                  labels={c.historico.map((h) => fmtMes(h.mes))}
                  totales={c.historico.map((h) => h.resenasTotal)}
                  ratings={c.historico.map((h) => h.ratingPromedio)}
                />
              </div>
            )}
            <p className="mb-2 text-xs text-slate-500">
              Tocá un mes para ver el detalle de ese período.
            </p>
            <EvolucionMensual
              historico={c.historico}
              esPremium={esPremium}
              detalle={detalleMensual}
            />
            {benchmark.length > 0 && (
              <div className="mt-4">
                <BenchmarkCompetencia meses={benchmark} crecimiento={crecimientoVsCompetencia} />
              </div>
            )}
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
