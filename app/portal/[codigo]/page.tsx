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
  getResenasPorHoraSemana,
  getLinks,
  getChecklist,
  getAudits,
  getResenas,
  resenasDeHoy,
  getTapsMesActual,
  fechaHoyCordoba,
  getBenchmarkMensual,
  getCompetidores,
  sincronizarCompetidoresDeComercio,
  type TopPiezaSemana,
} from "@/lib/db";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import { businessProfileHabilitado } from "@/lib/gbp";
import { fetchResenasGooglePublicas } from "@/lib/places";
import { grillaPorHora, type ResenaParaSemaforo } from "@/lib/semaforo";
import { type LocalConResenasGoogle } from "@/components/portal/ResenasGoogle";
import { portalRequiereLoginGoogle, tieneAccesoPortal } from "@/lib/portal-auth";
import { oauthVerificado } from "@/lib/google-oauth";
import PortalGateGoogle from "./_components/PortalGateGoogle";
import { metricaActual, metricaAnterior } from "@/lib/types";
import { fmtMes } from "@/lib/format";
import { recomendacionDelMes } from "@/lib/recomendacion";
import { ritmoMensual, sanearHistorico } from "@/lib/historico";
import { waUrl } from "@/lib/whatsapp";
import { PlanBadge } from "@/components/ui";
import { terminosFrecuentes } from "@/lib/keywords";
import { metricasPorEmpleado } from "@/lib/empleados";
import { type DetalleMes } from "@/components/EvolucionMensual";
import { type CrecimientoVsCompetencia } from "@/components/BenchmarkCompetencia";
import { calcularResumenResenas } from "@/components/ResumenResenas";
import { type Prioridad } from "@/components/portal/PrioridadesPanel";
import PortalShell, { type PortalNavEntry } from "@/components/portal/PortalShell";
import { heroDeCalificacion, MENSAJE_GOOGLE, construirNav, datoVisible } from "./_lib";
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

  const crudo = await getClientePorCodigo(codigo);
  if (!crudo || crudo.estado === "baja") notFound();
  // El cliente ve el histórico saneado: un mes que leyó otra ficha de
  // Google no puede ensuciar promedios, tabla ni gráficos (lib/historico.ts).
  const c = { ...crudo, historico: sanearHistorico(crudo.historico) };

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
  const sucursales = (await getSucursales(c.id)).map((s) => ({
    ...s,
    historico: sanearHistorico(s.historico),
  }));
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

  const [tapsPorDiaSoporte, horasSemana, piezaMasUsada, links, checklist, audits, resenas, benchmark, resenasPorHora] =
    await Promise.all([
      getTapsPorDiaPorSoporte(activo.id, 14),
      getTapsPorHoraSemana(activo.id),
      getPiezaMasUsadaSemana(activo.id),
      getLinks(activo.id),
      getChecklist(activo.id),
      getAudits(activo.id),
      getResenas(activo.id),
      getBenchmarkMensual(activo.id),
      getResenasPorHoraSemana(activo.id),
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
        const [resenasS, horasS, piezaS] = await Promise.all([
          getResenas(s.id),
          getTapsPorHoraSemana(s.id),
          getPiezaMasUsadaSemana(s.id),
        ]);
        return { s, resenasS, horasS, piezaS };
      }),
    );
    if (mejorPieza) mejorPieza = { ...mejorPieza, local: activo.nombre };
    for (const { s, resenasS, horasS, piezaS } of deLasSucursales) {
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

  // Reseñas de hoy: del total público de Google (ver resenasDeHoy), no de
  // la tabla `resenas`, que sin la API de reseñas aprobada solo se llena a
  // mano — por eso antes daba 0 aunque entraran reseñas reales. null si
  // ningún local tiene place_id: el portal no muestra un 0 inventado.
  const localesDelResumen = modoTodos ? ubicaciones : [activo];
  const resenasHoyPorLocal = await Promise.all(
    localesDelResumen.map((u) => resenasDeHoy(u.id, u.googlePlaceId)),
  );
  const resenasHoyConDato = resenasHoyPorLocal.filter((n): n is number => n !== null);
  const resenasHoy =
    resenasHoyConDato.length > 0 ? resenasHoyConDato.reduce((acc, n) => acc + n, 0) : null;

  // Taps del mes en curso (todos los locales del Resumen) — para "reseñas
  // por cada 10 taps": cuánto convierte el cartel.
  const tapsMes = (await Promise.all(localesDelResumen.map((u) => getTapsMesActual(u.id)))).reduce(
    (acc, n) => acc + n,
    0,
  );

  // Proyección de reseñas nuevas a fin de mes: el número del mes sale de la
  // foto que saca el cron cada medianoche, así que cubre hasta ayer. Solo
  // si esa foto es del mes en curso y ya pasaron unos días (antes, una
  // proyección no dice nada).
  const proyeccionMes = (() => {
    const ahora = new Date();
    const mesHoy = fechaHoyCordoba(ahora).slice(0, 7);
    if (localesDelResumen.some((u) => metricaActual(u)?.mes !== mesHoy)) return null;
    const dia = Number(fechaHoyCordoba(ahora).slice(8, 10));
    if (dia < 6) return null;
    const [anio, mes] = mesHoy.split("-").map(Number);
    const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const valor = Math.round((resenasNuevasMesTotal / (dia - 1)) * diasDelMes);
    const anteriores = localesDelResumen.map((u) => {
      const p = metricaAnterior(u);
      return p && !p.nuevasSinDato ? p.resenasNuevas : undefined;
    });
    const mesPasado = anteriores.every((n) => typeof n === "number")
      ? anteriores.reduce((acc: number, n) => acc + (n ?? 0), 0)
      : null;
    return { valor, mesPasado };
  })();

  // "Reseñas negativas" y "Sugerencias repetidas" necesitan el texto y las
  // estrellas de cada reseña: solo existen con la API de reseñas de Google
  // o con reseñas cargadas a mano. Sin ninguna de las dos, no se muestran.
  const hayResenasDetalladas = resenasApiHabilitada() || resenasCombinadas.length > 0;

  // Sin reseñas detalladas, la pestaña Reseñas muestra las públicas de
  // Google (Places, hasta 5 por local, en vivo — no se guardan). Solo se
  // piden en ese caso: el campo `reviews` es la SKU más cara de Places.
  let resenasGoogle: LocalConResenasGoogle[] | null = null;
  if (!hayResenasDetalladas) {
    const porLocal = await Promise.all(
      localesDelResumen.map(async (u) => {
        const r = u.googlePlaceId ? await fetchResenasGooglePublicas(u.googlePlaceId) : null;
        return r ? { comercioId: u.id, nombre: u.nombre, ...r } : null;
      }),
    );
    const conDatos = porLocal.filter((x): x is LocalConResenasGoogle => x !== null);
    resenasGoogle = conDatos.length > 0 ? conDatos : null;
  }

  // Semáforo y mapa por hora de "Mi Rating" (del local activo): con reseñas
  // completas, sobre todas; si no, sobre las públicas que muestra Google.
  const semaforoFuente: "todas" | "google" = hayResenasDetalladas ? "todas" : "google";
  const resenasSemaforo: ResenaParaSemaforo[] = hayResenasDetalladas
    ? resenas.map((r) => ({
        estrellas: r.estrellas,
        fecha: r.creadoEn ?? `${r.fecha}T12:00:00-03:00`,
        cuando: new Date(`${r.fecha}T12:00:00`).toLocaleDateString("es-AR"),
      }))
    : (resenasGoogle?.find((l) => l.comercioId === activo.id)?.resenas ?? []).map((r) => ({
        estrellas: r.estrellas,
        fecha: r.fecha,
        cuando: r.haceCuanto,
      }));
  const resenasPorHoraRating = hayResenasDetalladas ? resenasPorHora : grillaPorHora(resenasSemaforo);

  const resenasPendientesCombinadas = resenasCombinadas.filter((r) => r.estado === "nueva");
  const resenasNegativasTotal = resenasCombinadas.filter((r) => r.estrellas <= 3).length;
  const resumenResenasCombinado = calcularResumenResenas(resenasCombinadas);

  const conexionGoogle = modoTodos
    ? ubicaciones.some((u) => Boolean(u.googleConectadoEn))
    : gbpConectado;

  // Ritmo de reseñas nuevas por mes: solo meses completos y con dato (el
  // mes en curso y el primero medido no cuentan — ver lib/historico.ts).
  const ritmo = ritmoMensual(activo.historico, fechaHoyCordoba().slice(0, 7));

  const {
    rating: ratingHero,
    totalResenas: resenasHero,
  } = heroDeCalificacion(activo);

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
  // Mientras Google no apruebe Business Profile, conectarlo no trae nada:
  // ni los avisos ni el botón del header (ver lib/gbp.ts).
  const conBusinessProfile = businessProfileHabilitado();
  if (conBusinessProfile && gbpPorVencer) {
    prioridades.push({
      texto: "El permiso de Google vence pronto — reconectá para no cortar la sincronización",
      href: "#rating",
      tono: "atencion",
    });
  }
  if (conBusinessProfile && !gbpConectado) {
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
      resenasHoy={resenasHoy}
      resenasNuevasMes={resenasNuevasMesTotal}
      tapsMes={tapsMes}
      proyeccionMes={proyeccionMes}
      resenasNegativas={resenasNegativasTotal}
      hayResenasDetalladas={hayResenasDetalladas}
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
      hayResenasDetalladas={hayResenasDetalladas}
      resenasGoogle={resenasGoogle}
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
      ratingHero={ratingHero}
      resenasHero={resenasHero}
      historico={activo.historico}
      resenasPorHora={resenasPorHoraRating}
      resenasSemaforo={resenasSemaforo}
      semaforoFuente={semaforoFuente}
      ritmoMensual={ritmo?.promedio ?? 0}
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
      ritmo={ritmo}
      detalleMensual={detalleMensual}
    />
  );

  return (
    <PortalShell
      clienteNombre={c.nombre}
      clienteSub={[
        // "Otro"/"Otra" son los valores por defecto del alta: no dicen nada,
        // no se muestran ("Otro · Otra · datos a Oct 2026").
        datoVisible(activo.rubro),
        datoVisible(activo.zona),
        sucursales.length > 0 ? (modoTodos ? `Todos los locales (${ubicaciones.length})` : activo.nombre) : null,
        m ? `datos a ${fmtMes(m.mes)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      planBadge={<PlanBadge plan={c.plan} mono />}
      google={
        conBusinessProfile
          ? {
              conectado: gbpConectado,
              conectarHref: `/api/portal/google/oauth/start?codigo=${c.codigoAcceso}&comercioId=${activo.id}`,
              perfilPanelId: "rating",
            }
          : undefined
      }
      whatsappHref={AGENCIA_WHATSAPP ? waUrl(AGENCIA_WHATSAPP, `Hola! Te escribo por mi panel de ${c.nombre}`) : null}
      prioridades={prioridades}
      nav={nav}
      panels={panels}
      defaultPanel="resumen"
    />
  );
}
