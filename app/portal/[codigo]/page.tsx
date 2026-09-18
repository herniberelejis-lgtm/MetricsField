import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import {
  getClientePorCodigo,
  getSucursales,
  getTapsPorDiaPorSoporte,
  getTapsPorHoraSemana,
  getPiezaMasUsadaSemana,
  getLinks,
  getChecklist,
  getAudits,
  getResenas,
  getBenchmarkMensual,
  getCompetidores,
  sincronizarCompetidoresDeComercio,
  type TapsPorHoraDia,
  type TopPiezaSemana,
} from "@/lib/db";
import { portalRequiereLoginGoogle, tieneAccesoPortal } from "@/lib/portal-auth";
import { oauthVerificado } from "@/lib/google-oauth";
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
  // de esa cuenta. `ubicaciones` junta ambas cosas para el selector.
  //
  // Con más de un local, el estado por defecto (sin `?sucursal=`, o con
  // `?sucursal=todos`) es el COMBINADO de todos — antes el default caía en
  // la cuenta raíz sola, y no había forma de ver el total sin ir clic a
  // clic por cada local. Elegir un local puntual (`?sucursal=<id>`,
  // cualquiera, incluida la cuenta raíz) hace drill-down a su detalle,
  // exactamente como antes.
  const sucursales = await getSucursales(c.id);
  const ubicaciones = [c, ...sucursales];
  const modoTodos = sucursales.length > 0 && (!sucursalParam || sucursalParam === "todos");
  const activo = modoTodos
    ? c
    : (ubicaciones.find((u) => u.id === sucursalParam) ?? c);

  const gbpConectado = Boolean(activo.googleConectadoEn);
  const diasConectado = activo.googleConectadoEn
    ? Math.floor((Date.now() - new Date(activo.googleConectadoEn).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  // Sin oauthVerificado(), la app sigue en modo Prueba de Google y el
  // refresh token vence de verdad cada ~7 días — con la verificación hecha,
  // este aviso ya no aplica nunca, sin importar cuántos días pasaron.
  const gbpPorVencer = !oauthVerificado() && diasConectado !== null && diasConectado >= 6;
  const mensajeGoogle = google ? MENSAJE_GOOGLE[google] : null;

  const [tapsPorDiaSoporte, horasSemana, piezaMasUsada, links, checklist, audits, resenas, benchmark] =
    await Promise.all([
      getTapsPorDiaPorSoporte(activo.id, 14),
      getTapsPorHoraSemana(activo.id),
      getPiezaMasUsadaSemana(activo.id),
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

  const resenasAutomaticas = resenas.filter((r) => r.publicadaAutomaticamente).slice(0, 5);

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
  const totalTapsNfc = links.filter((l) => l.tipo === "nfc").reduce((acc, l) => acc + l.taps, 0);
  const totalTapsQr = links.filter((l) => l.tipo === "qr" || l.tipo === "ambos").reduce((acc, l) => acc + l.taps, 0);
  const tieneSoporteQr = links.some((l) => l.tipo === "qr" || l.tipo === "ambos");

  // "fecha" en resenas es DATE (sin hora, ver db/schema.sql) — comparamos
  // contra la fecha de hoy en el mismo formato que ya usa fechaISO() en
  // lib/db.ts, para que "hoy" siempre coincida con lo que guardó el sync.
  const hoyISO = new Date().toISOString().slice(0, 10);

  // `totalTapsHistorico` (de acá para abajo) queda SIEMPRE scopeado a
  // `activo` — lo usan Dispositivos y Escaneos, que siguen siendo detalle
  // de un solo local aunque el Resumen esté en modo combinado (si no, el
  // número de arriba de esas pestañas no coincidiría con la tabla de abajo,
  // que sigue mostrando solo los dispositivos de `activo`).
  const totalTapsHistorico = links.reduce((acc, l) => acc + l.taps, 0);

  // Totales SOLO para el Resumen: en modo combinado, se suman taps/reseñas
  // de TODOS los locales — reseñas nuevas salen de `historico` que cada
  // Cliente ya trae cargado (sin queries extra); taps y "reseñas hoy" sí
  // necesitan traer los links/reseñas de cada sucursal aparte.
  let totalTapsCombinado = totalTapsHistorico;
  let resenasHoy = resenas.filter((r) => r.fecha === hoyISO).length;
  let resenasNuevasMesTotal = m?.resenasNuevas ?? 0;

  // Alcance en Google (Business Profile Performance API): visitas al
  // perfil, llamadas y clics "cómo llegar" del mes en curso — solo existe
  // por local si ESE local conectó su propia cuenta (ver
  // sincronizarRendimiento en lib/db/google-sync.ts). En combinado se suma
  // lo que haya de cada uno; `conexionGoogle` es true si AL MENOS uno de
  // los locales conectó, para decidir si mostrar los números o la
  // invitación a conectar.
  let visitasPerfilTotal = m?.visitasPerfil ?? 0;
  let llamadasTotal = m?.llamadas ?? 0;
  let comoLlegarTotal = m?.clicsComoLlegar ?? 0;

  // Reseñas combinadas: en modo "Todos" la pestaña Reseñas (y el resumen de
  // quejas del Resumen) tienen que ver TODAS las reseñas de la cuenta, no
  // solo las de la cuenta raíz — antes de esto, un cliente con reseñas
  // cargadas únicamente en una sucursal veía la pestaña Reseñas directamente
  // desaparecida al mirar el combinado (ver el `if` que la ocultaba más
  // abajo, ahora sacado). Reordenamos por fecha DESC después de concatenar
  // porque cada array llega ordenado por su cuenta, no en conjunto.
  let resenasCombinadas = resenas;

  // Taps por hora (heatmap) y "pieza más usada": igual que todo lo de
  // arriba, en combinado se suman/comparan entre todos los locales. La
  // grilla hora×día se suma celda a celda (misma fecha, mismo huso ya
  // resuelto en la consulta); la mejor pieza se elige por mayor taps de la
  // semana, con el nombre del local para desambiguar si hay más de uno.
  let horasSemanaCombinado = horasSemana;
  let mejorPieza: (TopPiezaSemana & { local?: string }) | null = piezaMasUsada;

  if (modoTodos && sucursales.length > 0) {
    const deLasSucursales = await Promise.all(
      sucursales.map(async (s) => {
        const [linksS, resenasS, horasS, piezaS] = await Promise.all([
          getLinks(s.id),
          getResenas(s.id),
          getTapsPorHoraSemana(s.id),
          getPiezaMasUsadaSemana(s.id),
        ]);
        return { s, linksS, resenasS, horasS, piezaS };
      }),
    );
    if (mejorPieza) mejorPieza = { ...mejorPieza, local: activo.nombre };
    for (const { s, linksS, resenasS, horasS, piezaS } of deLasSucursales) {
      totalTapsCombinado += linksS.reduce((acc, l) => acc + l.taps, 0);
      resenasHoy += resenasS.filter((r) => r.fecha === hoyISO).length;
      resenasNuevasMesTotal += metricaActual(s)?.resenasNuevas ?? 0;
      const ms = metricaActual(s);
      visitasPerfilTotal += ms?.visitasPerfil ?? 0;
      llamadasTotal += ms?.llamadas ?? 0;
      comoLlegarTotal += ms?.clicsComoLlegar ?? 0;
      resenasCombinadas = resenasCombinadas.concat(resenasS);
      horasSemanaCombinado = horasSemanaCombinado.map((dia) => {
        const diaS = horasS.find((x) => x.fecha === dia.fecha);
        return diaS ? { fecha: dia.fecha, horas: dia.horas.map((v, h) => v + diaS.horas[h]) } : dia;
      });
      if (piezaS && (!mejorPieza || piezaS.taps > mejorPieza.taps)) {
        mejorPieza = { ...piezaS, local: s.nombre };
      }
    }
    resenasCombinadas = [...resenasCombinadas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  const resenasPendientesCombinadas = resenasCombinadas.filter((r) => r.estado === "nueva");
  const resenasNegativasTotal = resenasCombinadas.filter((r) => r.estrellas <= 3).length;
  const resumenResenasCombinado = calcularResumenResenas(resenasCombinadas);

  const conexionGoogle = modoTodos
    ? ubicaciones.some((u) => Boolean(u.googleConectadoEn))
    : gbpConectado;

  // Promedio de reseñas nuevas por mes, sobre todo el histórico cargado —
  // para "Evolución mes a mes", así el número no depende de mirar mes por
  // mes a mano.
  const promedioResenasMensual = activo.historico.length > 0
    ? activo.historico.reduce((acc, h) => acc + h.resenasNuevas, 0) / activo.historico.length
    : 0;

  const {
    rating: ratingHero,
    totalResenas: resenasHero,
    deltaResenas: deltaResenasHero,
  } = heroDeCalificacion(activo);

  // Reseñas totales combinadas: suma del total "en vivo" de cada local
  // (mismo dato que ya usa cada card de "Rendimiento"), sin queries extra.
  const resenasTotalesTotal = modoTodos
    ? ubicaciones.reduce((acc, u) => acc + heroDeCalificacion(u).totalResenas, 0)
    : resenasHero;

  // Competencia cargada para ESTE local — no tiene sentido combinarla entre
  // locales (la competencia de un barrio no es la de otro), así que solo se
  // trae cuando se está viendo un local puntual. Se sincroniza acá mismo
  // (on-demand, cuando el cliente entra a ver su portal) en vez de depender
  // únicamente del cron diario — sincronizarCompetidoresDeComercio no vuelve
  // a pegarle a Google si ya se actualizó hace poco, así que entrar varias
  // veces seguidas no gasta cuota de más.
  const competidoresLive = modoTodos
    ? []
    : await (async () => {
        await sincronizarCompetidoresDeComercio(activo.id);
        return getCompetidores(activo.id);
      })();

  const posicionCompetencia = (() => {
    if (modoTodos || ratingHero === null) return null;
    const ratingsCompetencia = competidoresLive
      .map((comp) => comp.rating)
      .filter((r): r is number => r !== null);
    if (ratingsCompetencia.length === 0) return null;
    const mejores = ratingsCompetencia.filter((r) => r > ratingHero).length;
    return { puesto: mejores + 1, total: ratingsCompetencia.length + 1 };
  })();

  // Lo que corre arriba de todo: acciones pendientes reales del dueño,
  // ordenadas por urgencia. Todo lo demás del portal es "mirar" — esto es
  // lo único que hay que "hacer", así que va primero pase lo que pase.
  const prioridades: Prioridad[] = [];
  if (resenasPendientesCombinadas.length > 0) {
    prioridades.push({
      texto: `${resenasPendientesCombinadas.length} reseña${resenasPendientesCombinadas.length === 1 ? "" : "s"} esperando tu respuesta`,
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
    resenasPendientes: resenasPendientesCombinadas.length,
  });

  const panels: Record<string, ReactNode> = {};

  panels.resumen = (
    <PanelResumen
      mensajeGoogle={mensajeGoogle}
      modoTodos={modoTodos}
      totalTapsHistorico={totalTapsCombinado}
      resenasHoy={resenasHoy}
      resenasNuevasMes={resenasNuevasMesTotal}
      resenasTotales={resenasTotalesTotal}
      resenasNegativas={resenasNegativasTotal}
      horasSemana={horasSemanaCombinado}
      piezaMasUsada={mejorPieza}
      posicionCompetencia={posicionCompetencia}
      visitasPerfil={visitasPerfilTotal}
      llamadas={llamadasTotal}
      comoLlegar={comoLlegarTotal}
      conexionGoogle={conexionGoogle}
      ubicaciones={ubicaciones}
      activoId={activo.id}
      activoNombre={activo.nombre}
      codigoAcceso={c.codigoAcceso}
      diasConTaps={diasConTaps}
      labelsTaps={labelsTaps}
      nfcPorDia={nfcPorDia}
      qrPorDia={qrPorDia}
      tieneSoporteQr={tieneSoporteQr}
      temasRecurrentes={resumenResenasCombinado.temasRecurrentes}
    />
  );

  // Gestión de reseñas: el dueño edita/aprueba (o aprueba todas de una) la
  // respuesta sugerida para sus reseñas de Google, sin depender del equipo
  // de MetricsField. Siempre se arma, aunque no haya ninguna reseña
  // cargada todavía — antes desaparecía del menú en ese caso (pasaba de
  // verdad con clientes reales sin reseñas tipeadas a mano en el CRM), lo
  // cual confundía más que mostrar el estado vacío. En modo combinado
  // muestra las reseñas de TODOS los locales (resenasCombinadas), con el
  // mismo selector de local que Resumen para poder acotar a uno solo.
  // Personal vive acá también (antes era su propio ítem de menú): son
  // menciones dentro del texto de las reseñas.
  panels.resenas = (
    <PanelResenas
      resenas={resenasCombinadas}
      resenasPendientes={resenasPendientesCombinadas}
      resenasAutomaticas={resenasAutomaticas}
      resumenResenas={resumenResenasCombinado}
      personalEmpleados={personalEmpleados}
      modoTodos={modoTodos}
      ubicaciones={ubicaciones}
      activoId={activo.id}
      activoNombre={activo.nombre}
      codigoAcceso={c.codigoAcceso}
      comercioId={activo.id}
      autoResponderPositivas={activo.autoResponderPositivas}
      autoResponderUmbral={activo.autoResponderUmbral}
      tonoMarca={c.tonoMarca}
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
      deltaResenasHero={deltaResenasHero}
      resenas={resenas}
      historico={activo.historico}
      zona={activo.zona}
    />
  );

  if (competidoresLive.length > 0 || benchmark.length > 0) {
    panels.competidores = (
      <PanelCompetidores
        competidores={competidoresLive}
        nombreLocal={activo.nombre}
        ratingLocal={ratingHero}
        resenasLocal={resenasHero}
        posicion={posicionCompetencia}
        benchmark={benchmark}
        crecimientoVsCompetencia={crecimientoVsCompetencia}
        modoTodos={modoTodos}
        ubicaciones={ubicaciones}
        activoId={activo.id}
        codigoAcceso={c.codigoAcceso}
      />
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
      clienteSub={`${activo.rubro} · ${activo.zona}${
        sucursales.length > 0 ? ` · ${modoTodos ? `Todos los locales (${ubicaciones.length})` : activo.nombre}` : ""
      }${m ? ` · datos a ${fmtMes(m.mes)}` : ""}`}
      planBadge={<PlanBadge plan={c.plan} mono />}
      google={{
        conectado: gbpConectado,
        conectarHref: `/api/portal/google/oauth/start?codigo=${c.codigoAcceso}&comercioId=${activo.id}`,
        perfilPanelId: "rating",
      }}
      whatsappHref={AGENCIA_WHATSAPP ? waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`) : null}
      prioridades={prioridades}
      nav={nav}
      panels={panels}
      defaultPanel="resumen"
    />
  );
}
