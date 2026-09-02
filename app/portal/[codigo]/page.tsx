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
import { portalRequiereLoginGoogle, tieneAccesoPortal } from "@/lib/portal-auth";
import PortalGateGoogle from "./_components/PortalGateGoogle";
import { metricaActual, metricaAnterior } from "@/lib/types";
import { fmtMes } from "@/lib/format";
import { recomendacionDelMes } from "@/lib/recomendacion";
import { waUrl } from "@/lib/whatsapp";
import { PlanBadge } from "@/components/ui";
import { terminosFrecuentes } from "@/lib/keywords";
import { metricasPorEmpleado } from "@/lib/empleados";
import { type DetalleMes } from "@/components/EvolucionMensual";
import { type CrecimientoVsCompetencia } from "@/components/BenchmarkCompetencia";
import { calcularResumenResenas } from "@/components/ResumenResenas";
import { type Prioridad } from "@/components/portal/PrioridadesPanel";
import PortalShell, { type PortalNavEntry } from "@/components/portal/PortalShell";
import { heroDeCalificacion, MENSAJE_GOOGLE, construirNav } from "./_lib";
import PanelResumen from "./_components/PanelResumen";
import PanelResenas from "./_components/PanelResenas";
import PanelSucursales from "./_components/PanelSucursales";
import PanelDispositivos from "./_components/PanelDispositivos";
import PanelEscaneos from "./_components/PanelEscaneos";
import PanelRating from "./_components/PanelRating";
import PanelCompetidores from "./_components/PanelCompetidores";
import PanelMes from "./_components/PanelMes";

export const dynamic = "force-dynamic";

const AGENCIA_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

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

  // Gate de Google: solo si el ADMIN cargó al menos un email autorizado
  // para este comercio (portal_usuarios) — sin ninguno, el portal sigue
  // abriendo solo con el código, como siempre. Siempre contra la cuenta
  // raíz `c` (una sucursal nunca tiene su propio gate).
  if (await portalRequiereLoginGoogle(c.id)) {
    if (!(await tieneAccesoPortal(c.id))) {
      return <PortalGateGoogle codigo={codigo} error={google} />;
    }
  }

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

  const nav: PortalNavEntry[] = construirNav({
    resenasPendientes: resenasPendientes.length,
    sucursales: sucursales.length,
    ubicaciones: ubicaciones.length,
  });

  const panels: Record<string, ReactNode> = {};

  panels.resumen = (
    <PanelResumen
      mensajeGoogle={mensajeGoogle}
      prioridades={prioridades}
      totalTapsHistorico={totalTapsHistorico}
      resenasHoy={resenasHoy}
      resenasNuevasMes={m?.resenasNuevas ?? 0}
      visitasPerfilMes={m?.visitasPerfil ?? 0}
      resenasTotales={resenasHero}
      ubicaciones={ubicaciones}
      activoId={activo.id}
      codigoAcceso={c.codigoAcceso}
      cuentaId={c.id}
      diasConTaps={diasConTaps}
      labelsTaps={labelsTaps}
      nfcPorDia={nfcPorDia}
      qrPorDia={qrPorDia}
      tieneSoporteQr={tieneSoporteQr}
      resenasRecientes={resenas.slice(0, 3)}
      temasRecurrentes={resumenResenas.temasRecurrentes}
    />
  );

  // Gestión de reseñas: el dueño edita/aprueba la respuesta sugerida para
  // sus reseñas de Google, sin depender del equipo de MetricsField. Personal
  // vive acá también (antes era su propio ítem de menú): son menciones
  // dentro del texto de las reseñas, tiene más sentido leerlas junto a ellas
  // que en una sección aparte.
  if (resenas.length > 0 || personalEmpleados.length > 0) {
    panels.resenas = (
      <PanelResenas
        resenas={resenas}
        resenasPendientes={resenasPendientes}
        resenasAutomaticas={resenasAutomaticas}
        resumenResenas={resumenResenas}
        personalEmpleados={personalEmpleados}
        codigoAcceso={c.codigoAcceso}
        comercioId={activo.id}
        autoResponderPositivas={activo.autoResponderPositivas}
        autoResponderUmbral={activo.autoResponderUmbral}
        tonoMarca={c.tonoMarca}
      />
    );
  }

  panels.sucursales = (
    <PanelSucursales
      sucursalesLength={sucursales.length}
      ubicaciones={ubicaciones}
      activoId={activo.id}
      codigoAcceso={c.codigoAcceso}
      cuentaId={c.id}
      ratingHero={ratingHero}
      resenasHero={resenasHero}
      deltaRatingHero={deltaRatingHero}
      deltaResenasHero={deltaResenasHero}
      activoNombre={activo.nombre}
      activoRubro={activo.rubro}
      activoZona={activo.zona}
    />
  );

  panels.dispositivos = (
    <PanelDispositivos
      linksConTaps={linksConTaps}
      codigoAcceso={c.codigoAcceso}
      comercioId={activo.id}
      tieneSoporteQr={tieneSoporteQr}
      totalTapsHistorico={totalTapsHistorico}
    />
  );

  panels.escaneos = (
    <PanelEscaneos
      totalTapsHistorico={totalTapsHistorico}
      tieneSoporteQr={tieneSoporteQr}
      totalTapsNfc={totalTapsNfc}
      totalTapsQr={totalTapsQr}
      diasConTaps={diasConTaps}
      labelsTaps={labelsTaps}
      nfcPorDia={nfcPorDia}
      qrPorDia={qrPorDia}
      codigoAcceso={c.codigoAcceso}
      comercioId={activo.id}
    />
  );

  panels.rating = (
    <PanelRating
      gbpConectado={gbpConectado}
      diasConectado={diasConectado}
      gbpPorVencer={gbpPorVencer}
      codigoAcceso={c.codigoAcceso}
      comercioId={activo.id}
      googleSyncEn={activo.googleSyncEn}
      ratingGoogle={activo.ratingGoogle}
      resenasGoogle={activo.resenasGoogle}
      ratingHero={ratingHero}
      resenasHero={resenasHero}
      deltaRatingHero={deltaRatingHero}
      deltaResenasHero={deltaResenasHero}
      resenas={resenas}
    />
  );

  if (benchmark.length > 0) {
    panels.competidores = (
      <PanelCompetidores benchmark={benchmark} crecimientoVsCompetencia={crecimientoVsCompetencia} />
    );
  }

  panels.mes = (
    <PanelMes
      m={m}
      prev={prev}
      esPremium={esPremium}
      historico={activo.historico}
      ultimosAudits={ultimosAudits}
      checklistLength={checklist.length}
      checklistHechos={checklistHechos}
      checklistPct={checklistPct}
      recomendacion={recomendacion}
      promedioResenasMensual={promedioResenasMensual}
      detalleMensual={detalleMensual}
    />
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
