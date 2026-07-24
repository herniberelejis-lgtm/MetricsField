import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import {
  getClientePorCodigo,
  getTapsPorDiaPorSoporte,
  getLinks,
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
import {
  Card,
  Kpi,
  Stars,
  Sparkline,
  PlanBadge,
  SectionHeading,
  btnPrimary,
  btnSecondary,
  IconChat,
  IconClock,
  IconWave,
  IconCheck,
  IconX,
} from "@/components/ui";
import { terminosFrecuentes } from "@/lib/keywords";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import TendenciaResenasChart from "@/components/TendenciaResenasChart";
import EvolucionMensual, { type DetalleMes } from "@/components/EvolucionMensual";
import BenchmarkCompetencia, { type CrecimientoVsCompetencia } from "@/components/BenchmarkCompetencia";
import GestionResenas from "@/components/GestionResenas";
import AutomatizacionResenas from "@/components/AutomatizacionResenas";
import ResumenResenas, { calcularResumenResenas } from "@/components/ResumenResenas";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";
import {
  StatChip,
  CalificacionGoogleCard,
  ResenasRecientesCard,
  IconStarChip,
  IconVisitas,
  IconCrecimiento,
} from "@/components/portal/PortalResumen";
import PortalShell, {
  IconGrid,
  IconStarNav,
  IconBuilding,
  IconDevice,
  IconActivity,
  IconSearch,
  IconHelp,
  type PortalNavEntry,
} from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

const AGENCIA_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

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

  const [tapsPorDiaSoporte, links, checklist, audits, resenas, benchmark] =
    await Promise.all([
      getTapsPorDiaPorSoporte(c.id, 14),
      getLinks(c.id),
      getChecklist(c.id),
      getAudits(c.id),
      getResenas(c.id),
      getBenchmarkMensual(c.id),
    ]);

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  const esPremium = c.plan === "Premium";
  const recomendacion = m ? recomendacionDelMes(c, m, prev) : null;

  const checklistHechos = checklist.filter((i) => i.hecho).length;
  const checklistPct = checklist.length
    ? Math.round((checklistHechos / checklist.length) * 100)
    : 0;
  const ultimosAudits = audits.slice(0, 3);

  // Drill-down por mes calculado en el servidor: por cada mes del histórico,
  // los temas recurrentes de las reseñas con texto de ese mes. El texto
  // crudo nunca se manda al cliente: solo viaja el agregado.
  const detalleMensual: Record<string, DetalleMes> = {};
  for (const h of c.historico) {
    const textos = resenas
      .filter((r) => r.fecha.startsWith(h.mes))
      .map((r) => r.texto)
      .filter((t) => t && t.trim().length > 0);
    detalleMensual[h.mes] = {
      terminos: terminosFrecuentes(textos),
      nResenasTexto: textos.length,
    };
  }

  const resenasPendientes = resenas.filter((r) => r.estado === "nueva");
  const resenasAutomaticas = resenas.filter((r) => r.publicadaAutomaticamente).slice(0, 5);

  // Resumen de "cómo van las reseñas": distribución por estrellas, si la
  // tendencia reciente mejora o empeora, y qué se repite en las quejas —
  // sobre TODAS las reseñas, no solo las pendientes de responder. resenas
  // viene ordenado por fecha DESC (getResenas): lo primero es lo más nuevo.
  const resumenResenas = calcularResumenResenas(resenas);

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

  // "fecha" en resenas es DATE (sin hora, ver db/schema.sql) — comparamos
  // contra la fecha de hoy en el mismo formato que ya usa fechaISO() en
  // lib/db.ts, para que "hoy" siempre coincida con lo que guardó el sync.
  const hoyISO = new Date().toISOString().slice(0, 10);
  const resenasHoy = resenas.filter((r) => r.fecha === hoyISO).length;

  // Hero de calificación: preferimos el snapshot mensual (misma fuente que
  // el histórico, así el delta compara peras con peras); si todavía no se
  // cargó ningún mes, mostramos el dato en vivo de Google Places como piso.
  const ratingHero = m ? m.ratingPromedio : c.ratingGoogle;
  const resenasHero = m ? m.resenasTotal : (c.resenasGoogle ?? 0);
  const primerHistorico = c.historico[0] ?? null;
  const hayDeltaHero = Boolean(m && primerHistorico && c.historico.length >= 2);
  const deltaRatingHero = hayDeltaHero ? m!.ratingPromedio - primerHistorico!.ratingPromedio : null;
  const deltaResenasHero = hayDeltaHero ? m!.resenasTotal - primerHistorico!.resenasTotal : null;

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
  if (gbpPorVencer) {
    prioridades.push({
      texto: "El permiso de Google vence pronto — reconectá para no cortar la sincronización",
      href: "#rating",
      tono: "atencion",
    });
  }
  if (!gbpConectado) {
    prioridades.push({
      texto: "Conectá tu Google Business Profile para automatizar visitas y llamadas",
      href: "#rating",
      tono: "info",
    });
  }
  const COLOR_TONO: Record<Prioridad["tono"], string> = {
    urgente: "bg-rose-500",
    atencion: "bg-amber-500",
    info: "bg-brand",
  };

  // Distribución de reseñas por estrella — para la barra 5★..1★ del panel
  // "Mi Rating en Google". Sobre TODAS las reseñas conocidas (no solo las
  // pendientes), igual que resumenResenas más arriba.
  const distribucionEstrellas = ([5, 4, 3, 2, 1] as const).map((n) => ({
    n,
    cantidad: resenas.filter((r) => r.estrellas === n).length,
  }));
  const maxDistribucion = Math.max(...distribucionEstrellas.map((d) => d.cantidad), 1);
  const COLOR_ESTRELLA: Record<number, string> = {
    5: "bg-emerald-600", 4: "bg-emerald-600", 3: "bg-amber-500", 2: "bg-rose-500", 1: "bg-rose-500",
  };

  const nav: PortalNavEntry[] = [
    { type: "leaf", id: "resumen", label: "Resumen", icon: <IconGrid size={18} /> },
    {
      type: "leaf",
      id: "resenas",
      label: "Reseñas",
      icon: <IconStarNav size={18} />,
      badge:
        resenasPendientes.length > 0 ? (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {resenasPendientes.length}
          </span>
        ) : undefined,
    },
    {
      type: "leaf",
      id: "sucursales",
      label: "Mis Sucursales",
      icon: <IconBuilding size={18} />,
      badge: (
        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
          Pronto
        </span>
      ),
    },
    { type: "leaf", id: "dispositivos", label: "Mis Dispositivos", icon: <IconDevice size={18} /> },
    { type: "leaf", id: "escaneos", label: "Escaneos", icon: <IconActivity size={18} /> },
    {
      type: "group",
      id: "google",
      label: "Mi Negocio en Google",
      icon: <IconSearch size={18} />,
      items: [
        { type: "leaf", id: "rating", label: "Mi Rating en Google", icon: <IconStarNav size={16} /> },
        { type: "leaf", id: "competidores", label: "Competidores", icon: <IconActivity size={16} /> },
        { type: "leaf", id: "mes", label: "Resumen del mes", icon: <IconGrid size={16} /> },
      ],
    },
    { type: "leaf", id: "ayuda", label: "Ayuda / Soporte", icon: <IconHelp size={18} /> },
  ];

  const panels: Record<string, ReactNode> = {};

  panels.resumen = (
    <>
      {mensajeGoogle && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            mensajeGoogle.tono === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Necesita tu atención</p>
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

      {/* De un vistazo: para abrir el portal y entender el estado del
          negocio sin tener que entrar a ninguna otra sección todavía. */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip
          icon={<IconWave size={18} className="text-blue-600" />}
          value={fmtNum(totalTapsHistorico)}
          label="Taps del cartel"
          chipClass="bg-blue-50"
        />
        <StatChip
          icon={<IconStarChip size={17} className="text-rose-600" />}
          value={fmtNum(resenasHoy)}
          label="Reseñas hoy"
          chipClass="bg-rose-50"
        />
        <StatChip
          icon={<IconStarChip size={17} className="text-emerald-600" />}
          value={fmtNum(m?.resenasNuevas ?? 0)}
          label="Reseñas este mes"
          chipClass="bg-emerald-50"
        />
        <StatChip
          icon={<IconVisitas size={18} className="text-violet-600" />}
          value={fmtNum(m?.visitasPerfil ?? 0)}
          label="Visitas al perfil"
          chipClass="bg-violet-50"
        />
        <StatChip
          icon={<IconCrecimiento size={18} className="text-amber-600" />}
          value={fmtNum(resenasHero)}
          label="Reseñas totales"
          chipClass="bg-amber-50"
        />
      </div>

      {(ratingHero !== null || resenas.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CalificacionGoogleCard
            rating={ratingHero}
            totalResenas={resenasHero}
            deltaRating={deltaRatingHero}
            deltaResenas={deltaResenasHero}
            nombre={c.nombre}
            subtitulo={`${c.rubro} · ${c.zona}`}
          />
          <ResenasRecientesCard resenas={resenas.slice(0, 3)} />
        </div>
      )}
    </>
  );

  // Gestión de reseñas: el dueño edita/aprueba la respuesta sugerida para
  // sus reseñas de Google, sin depender del equipo de MetricsField.
  if (resenas.length > 0) {
    panels.resenas = (
      <Card>
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
          <GestionResenas resenasIniciales={resenasPendientes} tonoMarca={c.tonoMarca} codigo={c.codigoAcceso} />
        </div>
      </Card>
    );
  }

  panels.sucursales = (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-200 bg-white">
        <IconBuilding size={22} className="text-slate-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">Todavía no está activo</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Cuando tengas más de un local, vas a poder elegir entre ellos desde acá y ver el
        rating y las reseñas de cada uno por separado. Hoy tu cuenta gestiona un solo local.
      </p>
      <span className="mt-3.5 inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
        Próximamente
      </span>
    </div>
  );

  panels.dispositivos =
    linksConTaps.length === 0 ? (
      <Card>
        <p className="text-sm text-slate-600">Todavía no tenés dispositivos asignados.</p>
      </Card>
    ) : (
      <>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Dispositivo</th>
                {tieneSoporteQr && <th className="px-4 py-2.5">Tipo</th>}
                <th className="px-4 py-2.5">Taps totales</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linksConTaps.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="flex items-center gap-2.5 px-4 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
                      <IconDevice size={16} />
                    </span>
                    {l.etiqueta || "Sin etiqueta"}
                  </td>
                  {tieneSoporteQr && (
                    <td className="px-4 py-3 text-slate-600">{l.tipo === "ambos" ? "NFC + QR" : l.tipo.toUpperCase()}</td>
                  )}
                  <td className="px-4 py-3 tabular-nums text-slate-700">{fmtNum(l.taps)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        l.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      ● {l.activo ? "en vivo" : "inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {linksConTaps.length > 1 && totalTapsHistorico > 0 && (
          <Card className="mt-4">
            <p className="text-sm font-medium text-slate-700">Taps por cartel</p>
            <p className="mt-0.5 text-xs text-slate-500">histórico total, desde que se instaló cada uno</p>
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
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">{l.taps}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>
    );

  panels.escaneos = (
    <>
      <p className="mb-4 text-sm text-slate-500">Esto se actualiza solo, apenas pasa — nadie tiene que cargar nada.</p>
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Taps del cartel</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {fmtNum(totalTapsHistorico)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">veces que alguien tocó o escaneó tu cartel desde que se instaló</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-fg" aria-hidden>
            <IconWave size={22} />
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

      {diasConTaps.length > 0 ? (
        <TapsPorSoporteChart
          labels={labelsTaps}
          fechas={diasConTaps}
          nfc={nfcPorDia}
          qr={qrPorDia}
          mostrarQr={tieneSoporteQr}
          codigo={c.codigoAcceso}
        />
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            Todavía no hay actividad del cartel. En cuanto alguien lo toque por primera vez,
            vas a ver acá el total de taps.
          </p>
        </Card>
      )}
    </>
  );

  panels.rating = (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${gbpConectado ? "bg-emerald-500" : "bg-slate-300"}`}
              aria-hidden
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">Google Business Profile</p>
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
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <IconClock size={14} className="mt-0.5 shrink-0" />
            <span>
              Todavía estamos terminando de verificar la app con Google — mientras tanto, este
              permiso vence cada 7 días. Tocá "Reconectar" una vez por semana para que no se corte.
            </span>
          </p>
        )}
      </Card>

      {c.googleSyncEn && (
        <Card className="mb-4">
          <p className="text-sm font-medium text-slate-700">Tu ficha de Google ahora mismo</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{c.ratingGoogle?.toFixed(1)}★</span>
            <span className="text-sm text-slate-500">{fmtNum(c.resenasGoogle ?? 0)} reseñas totales</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            actualizado automáticamente {new Date(c.googleSyncEn).toLocaleDateString("es-AR")}
          </p>
        </Card>
      )}

      {ratingHero !== null && (
        <Card className="mb-4 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calificación</p>
          <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{ratingHero.toFixed(1)}</div>
          <Stars rating={ratingHero} />
          <p className="mt-1 text-xs text-slate-500">{fmtNum(resenasHero)} reseñas totales</p>
          {deltaRatingHero !== null && deltaResenasHero !== null && (
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs font-semibold">
              <span className={deltaRatingHero >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {deltaRatingHero >= 0 ? "+" : ""}
                {deltaRatingHero.toFixed(1)}★
              </span>
              <span className={deltaResenasHero >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {deltaResenasHero >= 0 ? "+" : ""}
                {fmtNum(deltaResenasHero)} reseñas
              </span>
            </div>
          )}
        </Card>
      )}

      {resenas.length > 0 && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cómo vienen tus reseñas</p>
          <div className="mt-3 flex flex-col gap-2">
            {distribucionEstrellas.map((d) => (
              <div key={d.n} className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-xs text-slate-500">{d.n}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${COLOR_ESTRELLA[d.n]}`}
                    style={{ width: `${Math.max(d.cantidad ? 4 : 0, (d.cantidad / maxDistribucion) * 100)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-600">{d.cantidad}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );

  if (benchmark.length > 0) {
    panels.competidores = (
      <>
        <p className="mb-4 text-sm text-slate-500">
          Cómo estás parado frente a los locales de tu zona — se actualiza solo, todos los días.
        </p>
        <BenchmarkCompetencia meses={benchmark} crecimiento={crecimientoVsCompetencia} />
      </>
    );
  }

  panels.mes = (
    <>
      {!m ? (
        <Card>
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
            <Kpi label="Visitas al perfil" value={fmtNum(m.visitasPerfil)} hint={`${fmtNum(m.llamadas)} llamadas`} />
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
                <span className="text-sm font-medium text-slate-700">Reseñas acumuladas</span>
                <Stars rating={m.ratingPromedio} />
              </div>
              <Sparkline values={c.historico.map((h) => h.resenasTotal)} width={280} height={60} />
            </Card>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Visitas al perfil</span>
              </div>
              <Sparkline values={c.historico.map((h) => h.visitasPerfil)} width={280} height={60} />
            </Card>
          </div>
        </>
      )}

      {esPremium && (
        <Card className="mt-4">
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
                      <IconCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                    ) : (
                      <IconX size={15} className="mt-0.5 shrink-0 text-rose-500" />
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

      {checklist.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Ficha de Google optimizada</p>
            <span className="text-sm font-semibold text-slate-900">{checklistPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {checklistHechos} de {checklist.length} tareas de SEO local completadas
          </p>
        </Card>
      )}

      {recomendacion && (
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h2 className="text-sm font-semibold text-brand-fg">Recomendación para el mes que viene</h2>
          <p className="mt-1 text-sm text-slate-700">{recomendacion}</p>
        </div>
      )}

      {c.historico.length > 0 && (
        <>
          <SectionHeading title="Evolución mes a mes" />
          {c.historico.length >= 2 && (
            <div className="mb-4">
              <TendenciaResenasChart
                labels={c.historico.map((h) => fmtMes(h.mes))}
                totales={c.historico.map((h) => h.resenasTotal)}
                ratings={c.historico.map((h) => h.ratingPromedio)}
              />
            </div>
          )}
          <p className="mb-2 text-xs text-slate-500">Tocá un mes para ver el detalle de ese período.</p>
          <EvolucionMensual historico={c.historico} esPremium={esPremium} detalle={detalleMensual} />
        </>
      )}
    </>
  );

  panels.ayuda = (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">¿Algo no funciona o tenés una duda?</h3>
        <p className="mt-1.5 text-xs text-slate-500">
          {AGENCIA_WHATSAPP
            ? "Escribinos por WhatsApp, te respondemos nosotros — no un bot."
            : "Contactá a tu agencia para resolver cualquier duda sobre tu cuenta."}
        </p>
      </div>
      {AGENCIA_WHATSAPP && (
        <a
          href={waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        >
          <IconChat size={15} /> Escribir por WhatsApp
        </a>
      )}
    </Card>
  );

  return (
    <PortalShell
      clienteNombre={c.nombre}
      clienteSub={`${c.rubro} · ${c.zona}${m ? ` · datos a ${fmtMes(m.mes)}` : ""}`}
      planBadge={<PlanBadge plan={c.plan} />}
      googlePill={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${gbpConectado ? "bg-emerald-500" : "bg-slate-300"}`} />
          {gbpConectado ? "Google conectado" : "Google sin conectar"}
        </span>
      }
      whatsappHref={AGENCIA_WHATSAPP ? waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`) : null}
      nav={nav}
      panels={panels}
      defaultPanel="resumen"
    />
  );
}
