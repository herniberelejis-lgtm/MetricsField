import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import {
  getClientePorCodigo,
  getSucursales,
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
  type Cliente,
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
  IconClock,
  IconWave,
  IconCheck,
  IconX,
} from "@/components/ui";
import { terminosFrecuentes } from "@/lib/keywords";
import { metricasPorEmpleado } from "@/lib/empleados";
import MencionesEmpleados from "@/components/MencionesEmpleados";
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
import SugerenciasRepetidas from "@/components/portal/SugerenciasRepetidas";
import DispositivosTabla from "@/components/portal/DispositivosTabla";
import PrioridadesPanel, { type Prioridad } from "@/components/portal/PrioridadesPanel";
import DesconectarGoogleBoton from "@/components/portal/DesconectarGoogleBoton";
import ScrollActiveIntoView from "@/components/ScrollActiveIntoView";
import ScrollFadeRow from "@/components/ScrollFadeRow";
import PortalShell, {
  IconGrid,
  IconStarNav,
  IconBuilding,
  IconDevice,
  IconActivity,
  IconSearch,
  IconUsers,
  type PortalNavEntry,
} from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

const AGENCIA_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

// Link para elegir un local: siempre manda a la sección "Mis Sucursales"
// (hash incluido) — esta es una page.tsx server component, así que cada
// click es una navegación de página completa; sin el hash, PortalShell
// arrancaría de nuevo en Resumen en vez de quedarse en el detalle.
function hrefSucursal(codigoAcceso: string, cuentaId: string, s: { id: string }): string {
  const base = s.id === cuentaId ? `/portal/${codigoAcceso}` : `/portal/${codigoAcceso}?sucursal=${s.id}`;
  return `${base}#sucursales`;
}

// Hero de calificación de un local: preferimos el snapshot mensual (misma
// fuente que el histórico, así el delta compara peras con peras); si
// todavía no se cargó ningún mes, mostramos el dato en vivo de Google
// Places como piso. Se usa tanto para el local activo como para cada
// tarjeta de la fila "Tus sucursales".
function heroDeCalificacion(s: Cliente): {
  rating: number | null;
  totalResenas: number;
  deltaRating: number | null;
  deltaResenas: number | null;
} {
  const m = metricaActual(s);
  const rating = m ? m.ratingPromedio : s.ratingGoogle;
  const totalResenas = m ? m.resenasTotal : (s.resenasGoogle ?? 0);
  const primerHistorico = s.historico[0] ?? null;
  const hayDelta = Boolean(m && primerHistorico && s.historico.length >= 2);
  return {
    rating,
    totalResenas,
    deltaRating: hayDelta ? m!.ratingPromedio - primerHistorico!.ratingPromedio : null,
    deltaResenas: hayDelta ? m!.resenasTotal - primerHistorico!.resenasTotal : null,
  };
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
  searchParams: Promise<{ google?: string; sucursal?: string }>;
}) {
  const { codigo } = await params;
  const { google, sucursal: sucursalParam } = await searchParams;

  // Límite por IP antes de tocar la base: el código de acceso es la única
  // credencial del portal (sin usuario/contraseña), así que frenar la
  // enumeración acá es la defensa que importa. Mismo resultado (404) que un
  // código inválido, para no confirmarle a quien enumera si pegó cerca.
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`portal-codigo:${ip}`, 20, 10 * 60_000))) notFound();

  const c = await getClientePorCodigo(codigo);
  if (!c || c.estado === "baja") notFound();

  // Multi-sucursal: `c` es siempre la CUENTA (identidad del portal, código
  // de acceso, plan, facturación) — y también, ella misma, el local
  // original (así nació antes de tener sucursales: su propio Google Place
  // ID, historial, reseñas). Las sucursales son locales nuevos que cuelgan
  // de esa cuenta. `ubicaciones` junta ambas cosas para el selector; sin
  // `?sucursal=` en la URL, `activo` es siempre la cuenta (comportamiento
  // de siempre, sin sorpresas) — recién cambia si el cliente elige
  // explícitamente otro local.
  const sucursales = await getSucursales(c.id);
  const ubicaciones = [c, ...sucursales];
  const activo = sucursalParam
    ? (ubicaciones.find((u) => u.id === sucursalParam) ?? c)
    : c;

  const gbpConectado = Boolean(activo.googleConectadoEn);
  const diasConectado = activo.googleConectadoEn
    ? Math.floor((Date.now() - new Date(activo.googleConectadoEn).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const gbpPorVencer = diasConectado !== null && diasConectado >= 6;
  const mensajeGoogle = google ? MENSAJE_GOOGLE[google] : null;

  const [tapsPorDiaSoporte, links, checklist, audits, resenas, benchmark] =
    await Promise.all([
      getTapsPorDiaPorSoporte(activo.id, 14),
      getLinks(activo.id),
      getChecklist(activo.id),
      getAudits(activo.id),
      getResenas(activo.id),
      getBenchmarkMensual(activo.id),
    ]);

  const m = metricaActual(activo);
  const prev = metricaAnterior(activo);
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
  for (const h of activo.historico) {
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

  // Personal: taps reales de cada tarjeta NFC personal (links.nombreEmpleado)
  // + menciones de su nombre en el texto de las reseñas de este local. Los
  // taps son exactos; las menciones son un proxy, no atribución exacta
  // (ver lib/empleados.ts).
  const personalEmpleados = metricasPorEmpleado(
    resenas,
    links.map((l) => ({ nombreEmpleado: l.nombreEmpleado, taps: l.taps })),
  );

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

  // Promedio de reseñas nuevas por mes, sobre todo el histórico cargado —
  // para "Evolución mes a mes", así el número no depende de mirar mes por
  // mes a mano.
  const promedioResenasMensual = activo.historico.length > 0
    ? activo.historico.reduce((acc, h) => acc + h.resenasNuevas, 0) / activo.historico.length
    : 0;

  const {
    rating: ratingHero,
    totalResenas: resenasHero,
    deltaRating: deltaRatingHero,
    deltaResenas: deltaResenasHero,
  } = heroDeCalificacion(activo);

  // Lo que corre arriba de todo: acciones pendientes reales del dueño,
  // ordenadas por urgencia. Todo lo demás del portal es "mirar" — esto es
  // lo único que hay que "hacer", así que va primero pase lo que pase.
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
  // Distribución de reseñas por estrella — para la barra 5★..1★ del panel
  // "Mi Rating en Google". Sobre TODAS las reseñas conocidas (no solo las
  // pendientes), igual que resumenResenas más arriba.
  const distribucionEstrellas = ([5, 4, 3, 2, 1] as const).map((n) => ({
    n,
    cantidad: resenas.filter((r) => r.estrellas === n).length,
  }));
  const maxDistribucion = Math.max(...distribucionEstrellas.map((d) => d.cantidad), 1);
  const COLOR_ESTRELLA: Record<number, string> = {
    5: "bg-slate-900", 4: "bg-slate-900", 3: "bg-slate-500", 2: "bg-slate-300", 1: "bg-slate-300",
  };

  // Menú simplificado: 3 secciones reales (antes eran 9). Todo lo
  // relacionado con "cómo va mi negocio" (locales, dispositivos, escaneos,
  // rating de Google, competencia, resumen del mes) vive junto adentro de
  // "Mi Negocio" — Personal se mudó adentro de Reseñas (son menciones de
  // reseñas) — y Ayuda ya no ocupa un ítem propio: el botón de WhatsApp del
  // header alcanza.
  const nav: PortalNavEntry[] = [
    { type: "leaf", id: "resumen", label: "Resumen", icon: <IconGrid size={18} /> },
    {
      type: "leaf",
      id: "resenas",
      label: "Reseñas",
      icon: <IconStarNav size={18} />,
      badge:
        resenasPendientes.length > 0 ? (
          <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {resenasPendientes.length}
          </span>
        ) : undefined,
    },
    {
      type: "group",
      id: "negocio",
      label: "Mi Negocio",
      icon: <IconBuilding size={18} />,
      items: [
        {
          type: "leaf",
          id: "sucursales",
          label: "Sucursales",
          icon: <IconBuilding size={16} />,
          badge:
            sucursales.length === 0 ? (
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                Pronto
              </span>
            ) : (
              // Total de locales (cuenta + sucursales), no solo las
              // sucursales hijas — mismo número que "Rendimiento · N
              // locales" en Resumen.
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                {ubicaciones.length}
              </span>
            ),
        },
        { type: "leaf", id: "dispositivos", label: "Dispositivos", icon: <IconDevice size={16} /> },
        { type: "leaf", id: "escaneos", label: "Escaneos", icon: <IconWave size={16} /> },
        { type: "leaf", id: "rating", label: "Mi Rating en Google", icon: <IconStarNav size={16} /> },
        { type: "leaf", id: "competidores", label: "Competidores", icon: <IconSearch size={16} /> },
        { type: "leaf", id: "mes", label: "Resumen del mes", icon: <IconActivity size={16} /> },
      ],
    },
  ];

  const panels: Record<string, ReactNode> = {};

  panels.resumen = (
    <>
      {mensajeGoogle && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            mensajeGoogle.tono === "ok" ? "bg-slate-100 text-slate-800" : "border border-slate-300 text-slate-700"
          }`}
        >
          {mensajeGoogle.texto}
        </div>
      )}

      {/* Lo único que requiere una acción del dueño, ordenado por
          urgencia — todo lo demás en este portal es informativo. Arranca
          colapsado (ver PrioridadesPanel) para no ocupar media pantalla. */}
      <PrioridadesPanel prioridades={prioridades} />

      {/* De un vistazo: para abrir el portal y entender el estado del
          negocio sin tener que entrar a ninguna otra sección todavía.
          Flexbox con wrap (no grid de columnas fijas) para que la última
          fila reparta el espacio sobrante en vez de dejar un chip angosto
          solo — pasaba en mobile con grid-cols-2 y 5 chips (2+2+1). */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconWave size={18} className="text-slate-700" />}
            value={fmtNum(totalTapsHistorico)}
            label="Taps del cartel"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(resenasHoy)}
            label="Reseñas hoy"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(m?.resenasNuevas ?? 0)}
            label="Reseñas este mes"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconVisitas size={18} className="text-slate-700" />}
            value={fmtNum(m?.visitasPerfil ?? 0)}
            label="Visitas al perfil"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconCrecimiento size={18} className="text-slate-700" />}
            value={fmtNum(resenasHero)}
            label="Reseñas totales"
          />
        </div>
      </div>

      {/* Rendimiento: una tarjeta por local, siempre (aunque sea uno solo)
          — mismo formato en toda la cartera. Flexbox con wrap, no grid: a
          diferencia de un grid de columnas fijas, acá cada fila reparte el
          espacio sobrante entre lo que tiene — así una última fila con
          menos tarjetas que columnas nunca queda con una tarjeta angosta
          flotando sola en medio de espacio vacío (pasaba con 5 locales a
          xl:grid-cols-4: 4 en la primera fila + 1 sola al 25% de ancho). */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rendimiento · {ubicaciones.length} local{ubicaciones.length === 1 ? "" : "es"}
        </p>
        <div className="flex flex-wrap gap-4">
          {ubicaciones.map((s) => {
            const activa = s.id === activo.id;
            const hayVarios = ubicaciones.length > 1;
            const heroData = heroDeCalificacion(s);
            const tarjeta =
              heroData.rating !== null ? (
                <CalificacionGoogleCard
                  rating={heroData.rating}
                  totalResenas={heroData.totalResenas}
                  deltaRating={heroData.deltaRating}
                  deltaResenas={heroData.deltaResenas}
                  nombre={s.nombre}
                  subtitulo={`${s.zona}${activa && hayVarios ? " · viendo ahora" : ""}`}
                  hero={activa && hayVarios}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">{s.nombre}</p>
                  <p className="text-xs text-slate-500">{s.zona}</p>
                  <p className="mt-3 text-xs text-slate-400">Sin datos de Google todavía.</p>
                </div>
              );
            if (!hayVarios) return <div key={s.id} className="min-w-[240px] max-w-sm flex-1">{tarjeta}</div>;
            return (
              <a
                key={s.id}
                href={hrefSucursal(c.codigoAcceso, c.id, s)}
                title={`Ver el detalle de ${s.nombre}`}
                className={`block min-w-[240px] max-w-sm flex-1 rounded-3xl transition ${
                  activa ? "" : "hover:-translate-y-0.5"
                }`}
              >
                {tarjeta}
              </a>
            );
          })}
        </div>
      </div>

      {/* Actividad del local activo: escaneos recientes + últimas reseñas,
          uno al lado del otro en desktop, apilados en mobile. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {diasConTaps.length > 0 ? (
          <TapsPorSoporteChart
            labels={labelsTaps}
            fechas={diasConTaps}
            nfc={nfcPorDia}
            qr={qrPorDia}
            mostrarQr={tieneSoporteQr}
            codigo={c.codigoAcceso}
            comercioId={activo.id}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Escaneos</p>
            <p className="mt-2 text-sm text-slate-500">Todavía no hay actividad del cartel.</p>
          </div>
        )}
        <ResenasRecientesCard resenas={resenas.slice(0, 3)} />
      </div>

      <div className="mt-4">
        <SugerenciasRepetidas
          temas={resumenResenas.temasRecurrentes}
          apiHabilitada={resenasApiHabilitada()}
        />
      </div>
    </>
  );

  // Gestión de reseñas: el dueño edita/aprueba la respuesta sugerida para
  // sus reseñas de Google, sin depender del equipo de MetricsField. Personal
  // vive acá también (antes era su propio ítem de menú): son menciones
  // dentro del texto de las reseñas, tiene más sentido leerlas junto a ellas
  // que en una sección aparte.
  if (resenas.length > 0 || personalEmpleados.length > 0) {
    panels.resenas = (
      <>
        {resenas.length > 0 && (
          <Card variant="glass">
            <p className="text-sm font-medium text-slate-700">Gestión de reseñas</p>
            <p className="mt-1 text-xs text-slate-500">
              Te sugerimos una respuesta para cada reseña, la editás si querés y la copiás a
              Google vos mismo — todavía no publicamos nada en tu nombre.
            </p>
            <div className="mt-3">
              <ResumenResenas data={resumenResenas} variant="glass" />
            </div>
            {resenasApiHabilitada() && (
              <div className="mt-3">
                <AutomatizacionResenas
                  codigo={c.codigoAcceso}
                  comercioId={activo.id}
                  activa={activo.autoResponderPositivas}
                  umbral={activo.autoResponderUmbral}
                  apiHabilitada
                  resenasAutomaticas={resenasAutomaticas}
                />
              </div>
            )}
            <div className="mt-3">
              <GestionResenas
                resenasIniciales={resenasPendientes}
                tonoMarca={c.tonoMarca}
                codigo={c.codigoAcceso}
                comercioId={activo.id}
              />
            </div>
          </Card>
        )}

        {personalEmpleados.length > 0 && (
          <Card variant="glass" className={resenas.length > 0 ? "mt-4" : undefined}>
            <div className="flex items-center gap-2">
              <IconUsers size={16} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-700">Tu equipo</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Cada mozo o empleado con tarjeta NFC propia, con sus taps (dato exacto) y las
              reseñas que lo nombran en el texto (señal, no atribución exacta).
            </p>
            <div className="mt-3">
              <MencionesEmpleados menciones={personalEmpleados} />
            </div>
          </Card>
        )}
      </>
    );
  }

  panels.sucursales =
    sucursales.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-200 bg-white">
          <IconBuilding size={22} className="text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">Todavía no está activo</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Cuando tengas más de un local, vas a poder elegir entre ellos desde acá y ver el
          rating y las reseñas de cada uno por separado. Hoy tu cuenta gestiona un solo local.
        </p>
        <span className="mt-3.5 inline-block rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Próximamente
        </span>
      </div>
    ) : (
      <>
        {/* Selector compacto: todos los locales, el elegido resaltado —
            cambiarlo recarga la página con ese local como "activo" en
            todo el portal, así que el detalle de abajo es siempre suyo.
            ScrollFadeRow agrega el degradé en el borde cuando hay más
            locales de los que entran en el ancho disponible — sin esto,
            el último visible queda cortado a mitad de nombre, sin ninguna
            pista de que hay más para scrollear (el scrollbar nativo puede
            estar oculto según el navegador/SO). */}
        <div className="mb-4">
          <ScrollFadeRow>
            {ubicaciones.map((s) => {
              const activa = s.id === activo.id;
              const chip = (
                <a
                  href={hrefSucursal(c.codigoAcceso, c.id, s)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    activa
                      ? "bg-brand text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s.nombre}
                </a>
              );
              // En mobile la tira es más ancha que la pantalla — sin esto,
              // si el local elegido está lejos del principio, entrás y no
              // lo ves resaltado sin scrollear la tira vos mismo.
              return activa ? (
                <ScrollActiveIntoView key={s.id}>{chip}</ScrollActiveIntoView>
              ) : (
                <div key={s.id} className="contents">
                  {chip}
                </div>
              );
            })}
          </ScrollFadeRow>
        </div>

        <div className="space-y-4">
          {ratingHero !== null && (
            <CalificacionGoogleCard
              rating={ratingHero}
              totalResenas={resenasHero}
              deltaRating={deltaRatingHero}
              deltaResenas={deltaResenasHero}
              nombre={activo.nombre}
              subtitulo={`${activo.rubro} · ${activo.zona}`}
            />
          )}

          {/* El detalle de este local (dispositivos, reseñas, evolución
              mensual) ya se ve en las otras pestañas de "Mi Negocio" — acá
              solo se elige el local, para no repetir las mismas tarjetas
              dos veces. */}
          <p className="text-xs text-slate-400">
            El resto de las pestañas de Mi Negocio (Dispositivos, Reseñas, Resumen del mes) ya muestran
            el detalle de <b className="text-slate-500">{activo.nombre}</b>, el local elegido acá arriba.
          </p>
        </div>
      </>
    );

  panels.dispositivos =
    linksConTaps.length === 0 ? (
      <Card variant="glass">
        <p className="text-sm text-slate-600">Todavía no tenés dispositivos asignados.</p>
      </Card>
    ) : (
      <>
        <p className="mb-3 text-xs text-slate-500">
          Tocá &ldquo;Editar&rdquo; en cualquier dispositivo para cambiar a dónde manda — el cartel impreso no cambia,
          solo a dónde redirige.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <DispositivosTabla
            links={linksConTaps}
            codigo={c.codigoAcceso}
            comercioId={activo.id}
            tieneSoporteQr={tieneSoporteQr}
            iconoDispositivo={
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
                <IconDevice size={16} />
              </span>
            }
          />
        </div>

        {linksConTaps.length > 1 && totalTapsHistorico > 0 && (
          <Card variant="glass" className="mt-4">
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
      <Card variant="glass" className="mb-4">
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
          comercioId={activo.id}
        />
      ) : (
        <Card variant="glass">
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
      <Card variant="glass" className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${gbpConectado ? "bg-slate-900" : "bg-slate-300"}`}
              aria-hidden
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">Google Business Profile</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    gbpConectado ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
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
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/api/portal/google/oauth/start?codigo=${c.codigoAcceso}&comercioId=${activo.id}`}
              className={gbpConectado ? btnSecondary : btnPrimary}
            >
              {gbpConectado ? "Reconectar" : "Conectar con Google"}
            </a>
            {gbpConectado && (
              <DesconectarGoogleBoton codigo={c.codigoAcceso} comercioId={activo.id} />
            )}
          </div>
        </div>
        {gbpPorVencer && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">
            <IconClock size={14} className="mt-0.5 shrink-0" />
            <span>
              Todavía estamos terminando de verificar la app con Google — mientras tanto, este
              permiso vence cada 7 días. Tocá "Reconectar" una vez por semana para que no se corte.
            </span>
          </p>
        )}
      </Card>

      {activo.googleSyncEn && (
        <Card variant="glass" className="mb-4">
          <p className="text-sm font-medium text-slate-700">Tu ficha de Google ahora mismo</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{activo.ratingGoogle?.toFixed(1)}★</span>
            <span className="text-sm text-slate-500">{fmtNum(activo.resenasGoogle ?? 0)} reseñas totales</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            actualizado automáticamente {new Date(activo.googleSyncEn).toLocaleDateString("es-AR")}
          </p>
        </Card>
      )}

      {ratingHero !== null && (
        <Card variant="glass" className="mb-4 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calificación</p>
          <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{ratingHero.toFixed(1)}</div>
          <Stars rating={ratingHero} mono />
          <p className="mt-1 text-xs text-slate-500">{fmtNum(resenasHero)} reseñas totales</p>
          {deltaRatingHero !== null && deltaResenasHero !== null && (
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs font-semibold">
              <span className={deltaRatingHero >= 0 ? "text-slate-900" : "text-slate-400"}>
                {deltaRatingHero >= 0 ? "+" : ""}
                {deltaRatingHero.toFixed(1)}★
              </span>
              <span className={deltaResenasHero >= 0 ? "text-slate-900" : "text-slate-400"}>
                {deltaResenasHero >= 0 ? "+" : ""}
                {fmtNum(deltaResenasHero)} reseñas
              </span>
            </div>
          )}
        </Card>
      )}

      {resenas.length > 0 && (
        <Card variant="glass">
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
              <Sparkline values={activo.historico.map((h) => h.resenasTotal)} width={280} height={60} mono />
            </Card>
            <Card variant="glass">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Visitas al perfil</span>
              </div>
              <Sparkline values={activo.historico.map((h) => h.visitasPerfil)} width={280} height={60} mono />
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

      {checklist.length > 0 && (
        <Card variant="glass" className="mt-4">
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

      {activo.historico.length > 0 && (
        <>
          <SectionHeading
            title="Evolución mes a mes"
            subtitle={`Promedio: ${promedioResenasMensual.toFixed(1)} reseñas nuevas por mes`}
          />
          {activo.historico.length >= 2 && (
            <div className="mb-4">
              <TendenciaResenasChart
                labels={activo.historico.map((h) => fmtMes(h.mes))}
                totales={activo.historico.map((h) => h.resenasTotal)}
                ratings={activo.historico.map((h) => h.ratingPromedio)}
              />
            </div>
          )}
          <p className="mb-2 text-xs text-slate-500">Tocá un mes para ver el detalle de ese período.</p>
          <EvolucionMensual historico={activo.historico} esPremium={esPremium} detalle={detalleMensual} />
        </>
      )}
    </>
  );

  return (
    <PortalShell
      clienteNombre={c.nombre}
      clienteSub={`${activo.rubro} · ${activo.zona}${sucursales.length > 0 ? ` · ${activo.nombre}` : ""}${m ? ` · datos a ${fmtMes(m.mes)}` : ""}`}
      planBadge={<PlanBadge plan={c.plan} mono />}
      google={{
        conectado: gbpConectado,
        conectarHref: `/api/portal/google/oauth/start?codigo=${c.codigoAcceso}&comercioId=${activo.id}`,
        perfilPanelId: "rating",
      }}
      whatsappHref={AGENCIA_WHATSAPP ? waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`) : null}
      nav={nav}
      panels={panels}
      defaultPanel="resumen"
    />
  );
}
