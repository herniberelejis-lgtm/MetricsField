import "server-only";
import { sql } from "../sql";
import { fetchGooglePlaceStats } from "../places";
import { palabrasDeBusqueda, rendimientoDiario, type RendimientoDia } from "../gbp";
import { listarResenasGoogle, responderResenaGoogle, resenasApiHabilitada } from "../google-reviews";
import { generarRespuestaSugerida } from "../respuestas";
import { cifrar } from "../crypto";
import { alertarResenaMala } from "../alertas";
import { notificar } from "../monitor";
import { getAjuste, setAjuste } from "./ajustes";
import {
  accessTokenGBPComercio,
  resolverLocationGBP,
  sincronizarEnLotes,
} from "./_compartido";
import { getCliente } from "./clientes";
import { actualizarResena, crearResena } from "./resenas";

// ---------- Rendimiento (Business Profile Performance API) ----------
// Modelo por cliente: cada comercio autoriza con SU PROPIA cuenta de
// Google desde su portal (/portal/[codigo] → "Conectar tu Google Business
// Profile"), no con una cuenta de la agencia. Así el dato sigue llegando
// aunque la agencia no administre la ficha, y queda listo para funcionar
// sin fricción el día que la app esté verificada por Google.

// Un local real no gana más de esto en reseñas orgánicas en un solo mes
// (el propio "resultado" que mostramos como destacado en la landing es
// +106 repartido en varios MESES). Un salto más grande que esto entre un
// mes y el siguiente no es que llovieron reseñas: es un place_id que
// estaba mal cargado (o recién cargado) y se corrigió, o una lectura
// vieja incompleta — no "reseñas nuevas" de verdad. Sin este techo, esa
// corrección aparece en el portal del cliente como "1.405 reseñas nuevas
// este mes", que es peor que no mostrar nada.
const MAX_RESENAS_NUEVAS_MES = 150;

/** Trae rating/reseñas actuales de Google Places API y los guarda — tanto
 * en el snapshot "en vivo" (comercios.rating_google/resenas_google) como
 * en la métrica del mes en curso, para que "Detalle mensual" y el gráfico
 * de evolución dejen de depender de una carga manual aparte. "Reseñas
 * nuevas" se calcula solo, comparando contra el total del mes anterior —
 * salvo que el salto sea implausible (ver MAX_RESENAS_NUEVAS_MES), en cuyo
 * caso se toma como una corrección de base (place_id arreglado, primera
 * carga real, etc.) y no como reseñas nuevas de verdad.
 * Visitas/llamadas no se tocan acá — eso lo hace sincronizarRendimiento. */
export async function sincronizarGoogle(id: string): Promise<boolean> {
  const rows = await sql`SELECT google_place_id FROM comercios WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id as string | undefined;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

  // El cron corre apenas pasada la medianoche de Córdoba: este es el total
  // con el que arranca el día, la base de "Reseñas hoy" (ver resenasDeHoy).
  // Solo si todavía no hay base de hoy — un "Sincronizar" a mano a media
  // tarde no puede moverla.
  await fijarInicioDelDia(id, stats.totalReseñas);

  await sql`
    UPDATE comercios SET
      rating_google = ${stats.rating},
      resenas_google = ${stats.totalReseñas},
      google_sync_en = now()
    WHERE id = ${id}
  `;

  const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const anteriores = await sql`
    SELECT resenas_total FROM metricas_mensuales
    WHERE comercio_id = ${id} AND mes < ${mesActual}
    ORDER BY mes DESC LIMIT 1
  `;
  const totalAnterior = anteriores[0] ? Number(anteriores[0].resenas_total) : stats.totalReseñas;
  const salto = Math.max(0, stats.totalReseñas - totalAnterior);
  const resenasNuevas = salto > MAX_RESENAS_NUEVAS_MES ? 0 : salto;

  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio)
    VALUES (${id}, ${mesActual}, ${resenasNuevas}, ${stats.totalReseñas}, ${stats.rating})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio
  `;

  return true;
}

/** Sincroniza todos los comercios que tengan un place_id cargado — usado
 * por el cron diario. Devuelve cuántos se actualizaron correctamente.
 * Ordenado por google_sync_en (los nunca sincronizados o más viejos primero):
 * si el cron corta por el timeout de maxDuration a mitad de la lista, al
 * día siguiente retoma por los que quedaron afuera en vez de repetir
 * siempre los mismos primeros comercios sin avanzar nunca sobre el resto. */
export async function sincronizarGoogleTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`
    SELECT id FROM comercios WHERE google_place_id != ''
    ORDER BY google_sync_en ASC NULLS FIRST
  `;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarGoogle);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

/** Guarda el refresh token que el cliente acaba de autorizar desde su
 * portal. Se llama desde el callback de /api/portal/google/oauth. Cifrado
 * en reposo (ver lib/crypto.ts) — con TOKEN_ENCRYPTION_KEY configurada. */
export async function guardarTokenGoogleComercio(id: string, refreshToken: string): Promise<void> {
  await sql`
    UPDATE comercios SET google_refresh_token = ${cifrar(refreshToken)}, google_conectado_en = now()
    WHERE id = ${id}
  `;
}

/** Desconecta la cuenta de Google de un comercio (a pedido del cliente o
 * del admin) — borra el refresh token y el vínculo de ficha ya resuelto. */
export async function desconectarGoogleComercio(id: string): Promise<void> {
  await sql`
    UPDATE comercios SET google_refresh_token = '', google_location = '', google_conectado_en = NULL
    WHERE id = ${id}
  `;
}

// ---------- Reseñas de hoy ----------
// La API de reseñas de Google (que traería cada reseña con su fecha) todavía
// no está aprobada, así que "reseñas hoy" sale del TOTAL público de Places:
// el total ahora menos el total con que arrancó el día en Córdoba. Antes
// salía de la tabla `resenas`, que sin esa API solo se llena a mano — por
// eso daba 0 aunque hubieran entrado reseñas reales.
// La base del día se guarda en `ajustes` (sin migración de esquema).

const ZONA_HORARIA = "America/Argentina/Cordoba";

/** Fecha de hoy en Córdoba (YYYY-MM-DD), no la de UTC: entre las 21 y las
 * 24 hs locales, UTC ya está en el día siguiente. */
export function fechaHoyCordoba(ahora = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
}

interface InicioDelDia {
  fecha: string;
  total: number;
}

async function fijarInicioDelDia(id: string, totalActual: number): Promise<InicioDelDia> {
  const clave = `resenas_inicio_dia:${id}`;
  const hoy = fechaHoyCordoba();
  const guardado = await getAjuste(clave);
  if (guardado) {
    try {
      const base = JSON.parse(guardado) as InicioDelDia;
      if (base.fecha === hoy && typeof base.total === "number") return base;
    } catch {
      // valor corrupto: se pisa abajo con uno nuevo
    }
  }
  const nueva = { fecha: hoy, total: totalActual };
  await setAjuste(clave, JSON.stringify(nueva));
  return nueva;
}

/** Reseñas que entraron hoy (hora de Córdoba) según el total público de
 * Google. null si no hay forma de saberlo (sin place_id o sin API key) —
 * el portal entonces no muestra el número en vez de mostrar un 0 falso.
 * Usa un total cacheado hasta 30 min: es una API paga y esto corre en cada
 * visita al portal. */
export async function resenasDeHoy(id: string, placeId: string | null): Promise<number | null> {
  if (!placeId) return null;
  const stats = await fetchGooglePlaceStats(placeId, { cacheSegundos: 1800 });
  if (!stats) return null;
  // Si el cron todavía no fijó la base de hoy (local recién dado de alta,
  // o el cron no corrió), se fija ahora: cuenta desde este momento.
  const base = await fijarInicioDelDia(id, stats.totalReseñas);
  return Math.max(0, stats.totalReseñas - base.total);
}

// Historia que se pide la primera vez que se sincroniza un comercio. Google
// guarda unos 18 meses; si rechaza el rango largo se prueba con uno más
// corto antes de darse por vencido.
const DIAS_HISTORIA = [540, 365, 90];
// Google corrige los últimos días durante un tiempo (los publica con 2-3
// días de demora): en cada sync se vuelven a pedir los últimos 10.
const DIAS_REVISION = 10;

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Trae las métricas de Business Profile día por día (visitas al perfil en
 * Maps y en la Búsqueda, llamadas, "cómo llegar", clics a la web, mensajes y
 * reservas) y las guarda en metricas_diarias, usando la cuenta de Google que
 * ESE comercio conectó. La primera vez trae toda la historia que da Google;
 * después, solo los últimos días. Con eso actualiza el mes en curso de
 * metricas_mensuales (como antes) y completa los meses pasados que estaban
 * en 0, sin pisar nada cargado a mano. También trae las palabras de
 * búsqueda de los meses cerrados. Devuelve false (sin romper) si falta
 * cualquier pieza: sin conectar, sin place_id, la cuenta no administra esa
 * ficha, o el refresh token venció. */
export async function sincronizarRendimiento(id: string): Promise<boolean> {
  const token = await accessTokenGBPComercio(id);
  if (!token) return false;

  const location = await resolverLocationGBP(id, token);
  if (!location) return false;

  const hoy = fechaHoyCordoba();
  let ultimaFecha: string | null;
  try {
    const ultima = await sql`SELECT to_char(max(fecha), 'YYYY-MM-DD') AS f FROM metricas_diarias WHERE comercio_id = ${id}`;
    ultimaFecha = (ultima[0]?.f as string | null) ?? null;
  } catch (e) {
    if (!faltaTabla(e)) throw e;
    // Migración 017 todavía sin correr en esta base: se sigue como antes,
    // solo el mes en curso, sin guardar el detalle diario.
    return sincronizarMesSinDiarias(id, token, location, hoy);
  }

  let desde = "";
  let dias: RendimientoDia[] | null = null;
  if (ultimaFecha) {
    desde = sumarDias(ultimaFecha, -DIAS_REVISION);
    dias = await rendimientoDiario(token, location, desde, hoy);
  } else {
    for (const n of DIAS_HISTORIA) {
      desde = sumarDias(hoy, -n);
      dias = await rendimientoDiario(token, location, desde, hoy);
      if (dias) break;
    }
  }
  if (!dias) return false;

  await guardarDias(id, desde, dias);
  await actualizarMesesDesdeDiarias(id, hoy.slice(0, 7));
  // Las búsquedas son un extra: si fallan, el rendimiento igual quedó guardado.
  await sincronizarBusquedas(id, token, location, hoy).catch((e) => console.error("Búsquedas:", e));
  return true;
}

/** Error de Postgres "la tabla no existe" (42P01). */
export function faltaTabla(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "42P01";
}

/** Comportamiento previo a la migración 017: suma los días del mes en curso
 * y actualiza solo metricas_mensuales. */
async function sincronizarMesSinDiarias(id: string, token: string, location: string, hoy: string): Promise<boolean> {
  const dias = await rendimientoDiario(token, location, `${hoy.slice(0, 7)}-01`, hoy);
  if (!dias) return false;
  const suma = (f: (d: RendimientoDia) => number) => dias.reduce((a, d) => a + f(d), 0);
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, visitas_perfil, llamadas, clics_como_llegar)
    VALUES (${id}, ${hoy.slice(0, 7)}, ${suma((d) => d.impresionesMaps + d.impresionesBusqueda)},
      ${suma((d) => d.llamadas)}, ${suma((d) => d.comoLlegar)})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar
  `;
  return true;
}

/** Guarda los días recibidos y completa con 0 los días sin datos entre
 * `desde` y el último día que Google informó (Google omite los días en 0).
 * Después de ese último día no se completa: pueden ser días que Google
 * todavía no publicó, no días sin movimiento. */
async function guardarDias(id: string, desde: string, dias: RendimientoDia[]): Promise<void> {
  if (dias.length === 0) return;
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const hasta = dias[dias.length - 1].fecha;
  const filas: Record<string, string | number>[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const d = porFecha.get(f);
    filas.push({
      comercio_id: id,
      fecha: f,
      impresiones_maps: d?.impresionesMaps ?? 0,
      impresiones_busqueda: d?.impresionesBusqueda ?? 0,
      llamadas: d?.llamadas ?? 0,
      como_llegar: d?.comoLlegar ?? 0,
      clics_web: d?.clicsWeb ?? 0,
      conversaciones: d?.conversaciones ?? 0,
      reservas: d?.reservas ?? 0,
    });
  }
  // De a 500 filas: lejos del límite de parámetros de Postgres.
  for (let i = 0; i < filas.length; i += 500) {
    await sql`
      INSERT INTO metricas_diarias ${sql(filas.slice(i, i + 500))}
      ON CONFLICT (comercio_id, fecha) DO UPDATE SET
        impresiones_maps = EXCLUDED.impresiones_maps,
        impresiones_busqueda = EXCLUDED.impresiones_busqueda,
        llamadas = EXCLUDED.llamadas,
        como_llegar = EXCLUDED.como_llegar,
        clics_web = EXCLUDED.clics_web,
        conversaciones = EXCLUDED.conversaciones,
        reservas = EXCLUDED.reservas,
        actualizado_en = now()
    `;
  }
}

/** El mes en curso de metricas_mensuales sale de sumar sus días (se crea si
 * no existe, como siempre). Los meses pasados solo se completan si ya
 * existen y tienen visitas, llamadas y "cómo llegar" en 0: no se crean filas
 * nuevas en el histórico ni se pisa nada cargado a mano. */
async function actualizarMesesDesdeDiarias(id: string, mesActual: string): Promise<void> {
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, visitas_perfil, llamadas, clics_como_llegar)
    SELECT ${id}, ${mesActual},
      COALESCE(SUM(impresiones_maps + impresiones_busqueda), 0)::int,
      COALESCE(SUM(llamadas), 0)::int,
      COALESCE(SUM(como_llegar), 0)::int
    FROM metricas_diarias
    WHERE comercio_id = ${id} AND to_char(fecha, 'YYYY-MM') = ${mesActual}
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar
  `;
  await sql`
    UPDATE metricas_mensuales m SET
      visitas_perfil = d.visitas,
      llamadas = d.llamadas,
      clics_como_llegar = d.como_llegar
    FROM (
      SELECT to_char(fecha, 'YYYY-MM') AS mes,
        SUM(impresiones_maps + impresiones_busqueda)::int AS visitas,
        SUM(llamadas)::int AS llamadas,
        SUM(como_llegar)::int AS como_llegar
      FROM metricas_diarias
      WHERE comercio_id = ${id}
      GROUP BY 1
    ) d
    WHERE m.comercio_id = ${id} AND m.mes = d.mes AND m.mes < ${mesActual}
      AND m.visitas_perfil = 0 AND m.llamadas = 0 AND m.clics_como_llegar = 0
  `;
}

// Meses cerrados de palabras de búsqueda que se mantienen guardados.
const MESES_BUSQUEDAS = 6;
// Google termina de publicar las búsquedas de un mes unos días después de
// que cierra: el último mes se vuelve a pedir hasta el día 10.
const DIA_BUSQUEDAS_FIRMES = 10;

function mesAnterior(mes: string, n = 1): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

async function sincronizarBusquedas(id: string, token: string, location: string, hoy: string): Promise<void> {
  const mesActual = hoy.slice(0, 7);
  const guardados = new Set(
    (await sql`SELECT DISTINCT mes FROM busquedas_mensuales WHERE comercio_id = ${id}`).map((r) => r.mes as string),
  );
  const ultimoCerrado = mesAnterior(mesActual);
  const refrescarUltimo = Number(hoy.slice(8, 10)) <= DIA_BUSQUEDAS_FIRMES;

  for (let n = 1; n <= MESES_BUSQUEDAS; n++) {
    const mes = mesAnterior(mesActual, n);
    if (guardados.has(mes) && !(mes === ultimoCerrado && refrescarUltimo)) continue;
    const palabras = await palabrasDeBusqueda(token, location, mes);
    if (!palabras) return; // la API rechazó: no insistir con los demás meses hoy
    // Reemplaza el mes de ESTE comercio (nunca toca otros comercios ni meses).
    await sql.begin(async (tx) => {
      await tx`DELETE FROM busquedas_mensuales WHERE comercio_id = ${id} AND mes = ${mes}`;
      if (palabras.length > 0) {
        await tx`
          INSERT INTO busquedas_mensuales ${tx(
            palabras.map((p) => ({
              comercio_id: id,
              mes,
              palabra: p.palabra,
              impresiones: p.impresiones,
              umbral: p.umbral,
            })),
          )}
          ON CONFLICT (comercio_id, mes, palabra) DO NOTHING
        `;
      }
    });
  }
}

export interface DiaRendimiento {
  fecha: string;
  comoLlegar: number;
  llamadas: number;
  visitas: number;
}

/** Métricas diarias de los últimos `dias` días (para lib/conclusiones.ts). */
export async function getMetricasDiarias(comercioId: string, dias = 90): Promise<DiaRendimiento[]> {
  const rows = await sql`
    SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, como_llegar, llamadas,
      impresiones_maps + impresiones_busqueda AS visitas
    FROM metricas_diarias
    WHERE comercio_id = ${comercioId} AND fecha >= (now() AT TIME ZONE ${ZONA_HORARIA})::date - ${dias}::int
    ORDER BY fecha
  `.catch((e) => {
    // Sin la migración 017 el portal sigue andando, sin estas conclusiones.
    if (faltaTabla(e)) return [];
    throw e;
  });
  return rows.map((r) => ({
    fecha: r.fecha as string,
    comoLlegar: Number(r.como_llegar),
    llamadas: Number(r.llamadas),
    visitas: Number(r.visitas),
  }));
}

export interface BusquedaGuardada {
  palabra: string;
  impresiones: number | null;
  umbral: number | null;
}

/** Palabras de búsqueda sumadas de los últimos `meses` meses guardados. Las
 * que en algún mes vinieron solo como "menos de N" suman ese mes como 0 y
 * quedan marcadas con su umbral si nunca tuvieron número. */
export async function getBusquedas(comercioId: string, meses = 3): Promise<BusquedaGuardada[]> {
  const rows = await sql`
    WITH ultimos AS (
      SELECT DISTINCT mes FROM busquedas_mensuales WHERE comercio_id = ${comercioId}
      ORDER BY mes DESC LIMIT ${meses}
    )
    SELECT palabra, SUM(impresiones)::int AS impresiones, MAX(umbral)::int AS umbral
    FROM busquedas_mensuales
    WHERE comercio_id = ${comercioId} AND mes IN (SELECT mes FROM ultimos)
    GROUP BY palabra
    ORDER BY SUM(impresiones) DESC NULLS LAST, palabra
  `.catch((e) => {
    if (faltaTabla(e)) return [];
    throw e;
  });
  return rows.map((r) => ({
    palabra: r.palabra as string,
    impresiones: r.impresiones === null ? null : Number(r.impresiones),
    umbral: r.impresiones === null && r.umbral !== null ? Number(r.umbral) : null,
  }));
}

// Cada cuántos días como máximo se repite el aviso por el MISMO comercio.
// Sin esto el cron diario avisaría todos los días por el mismo cliente hasta
// que reconecte, y el canal se vuelve ruido que nadie mira.
const DIAS_ENTRE_AVISOS = 3;

/**
 * Avisa por el webhook cuando un comercio que HABÍA conectado su Google dejó
 * de estarlo. Mientras la app siga sin verificar por Google (modo Prueba), el
 * permiso vence cada ~7 días y el cliente no se entera solo: su panel deja de
 * actualizar visitas y llamadas en silencio.
 *
 * Detecta la desconexión real —no la fecha— intentando canjear el refresh
 * token: si Google ya no lo acepta, `accessTokenGBPComercio` devuelve null.
 *
 * Se desduplica con la tabla `ajustes` para no necesitar una migración: el
 * entorno no tiene acceso a Neon y cualquier ALTER TABLE hay que correrlo a
 * mano (ver CLAUDE.md).
 */
export async function avisarGoogleDesconectado(): Promise<{ revisados: number; avisados: number }> {
  const rows = await sql`
    SELECT id, nombre, contacto FROM comercios
    WHERE google_refresh_token != '' AND estado != 'baja'
  `;

  let avisados = 0;
  const hoy = new Date();

  for (const row of rows) {
    const id = row.id as string;
    const token = await accessTokenGBPComercio(id);
    if (token) continue; // sigue conectado, nada que avisar

    const clave = `aviso_gbp_desconectado:${id}`;
    const ultimo = await getAjuste(clave);
    if (ultimo) {
      const dias = (hoy.getTime() - new Date(ultimo).getTime()) / (1000 * 60 * 60 * 24);
      if (dias < DIAS_ENTRE_AVISOS) continue;
    }

    const nombre = row.nombre as string;
    const contacto = (row.contacto as string) || "sin WhatsApp cargado";
    await notificar(
      "Se desconectó el Google de un cliente",
      `*${nombre}* dejó de tener el permiso activo — su panel no va a actualizar visitas ni llamadas hasta que reconecte.\n` +
        `Escribirle al ${contacto} con el texto de reconexión.`,
    );
    await setAjuste(clave, hoy.toISOString());
    avisados += 1;
  }

  return { revisados: rows.length, avisados };
}

/** Rendimiento de todos los comercios que tengan su propia cuenta de Google
 * conectada — para el cron diario. */
export async function sincronizarRendimientoTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`SELECT id FROM comercios WHERE google_refresh_token != ''`;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarRendimiento);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

/** Trae reseñas nuevas desde la Reviews API de Google y las carga en el CRM
 * (`resenas`). Las positivas (según el umbral que eligió el cliente en su
 * portal) se responden solas con el mismo generador de respuestas que usa
 * la cola manual, y quedan marcadas `publicadaAutomaticamente`; el resto
 * entra tal cual a la cola manual existente. No hace nada (0 sincronizadas)
 * si falta cualquier pieza — sin conectar, sin ficha vinculada, o mientras
 * `GOOGLE_REVIEWS_API_ENABLED` no esté prendido, porque esa API todavía
 * necesita una aprobación de Google que hoy no tenemos. */
// Una reseña de Google cuenta como "recién llegada" (para avisar o responder
// sola) si se escribió en los últimos días.
const DIAS_RESENA_RECIENTE = 7;

export async function sincronizarResenasGoogle(
  id: string,
): Promise<{ nuevas: number; autoRespondidas: number }> {
  if (!resenasApiHabilitada()) return { nuevas: 0, autoRespondidas: 0 };

  const token = await accessTokenGBPComercio(id);
  if (!token) return { nuevas: 0, autoRespondidas: 0 };
  const location = await resolverLocationGBP(id, token);
  if (!location) return { nuevas: 0, autoRespondidas: 0 };

  const cliente = await getCliente(id);
  if (!cliente) return { nuevas: 0, autoRespondidas: 0 };

  const resenasGoogle = await listarResenasGoogle(token, location);
  let nuevas = 0;
  let autoRespondidas = 0;

  const ahora = Date.now();
  for (const rg of resenasGoogle) {
    const existe = await sql`SELECT id, estado FROM resenas WHERE origen_google_id = ${rg.name}`;
    if (existe.length > 0) {
      // Ya la teníamos: si el dueño la respondió directo en Google, sacarla
      // de "esperando tu respuesta" (también corrige las que se importaron
      // como pendientes antes de mirar esto).
      if (rg.yaRespondida && existe[0].estado === "nueva") {
        await actualizarResena(existe[0].id as number, {
          estado: "respondida",
          respuestaPublicada: true,
          ...(rg.respuesta ? { respuestaSugerida: rg.respuesta } : {}),
        });
      }
      continue;
    }

    const creada = await crearResena(
      id,
      {
        autor: rg.autor,
        estrellas: rg.estrellas,
        texto: rg.texto,
        plataforma: "google",
        fecha: rg.fecha.slice(0, 10),
        creadoEn: rg.fecha,
      },
      rg.name,
    );
    nuevas += 1;

    if (rg.yaRespondida) {
      // Ya respondida en Google: no va a la cola ni dispara nada.
      await actualizarResena(creada.id, {
        estado: "respondida",
        respuestaPublicada: true,
        ...(rg.respuesta ? { respuestaSugerida: rg.respuesta } : {}),
      });
      continue;
    }

    // La primera sincronización trae TODA la historia de la ficha: avisar o
    // responder solo lo reciente. Si no, conectar Google dispara un mail por
    // cada reseña mala de los últimos años y publica de golpe respuestas a
    // reseñas viejas. Las viejas quedan en la cola para responder a mano.
    if (ahora - Date.parse(rg.fecha) > DIAS_RESENA_RECIENTE * 86_400_000) continue;

    const esPositivaSegunUmbral = rg.estrellas >= cliente.autoResponderUmbral;
    if (cliente.autoResponderPositivas && esPositivaSegunUmbral) {
      // Sin nombre: esta respuesta se publica sola con la identidad del
      // comercio, y el nombre de Google lo elige el autor (puede ser cualquier
      // palabra). Las sugeridas que revisa una persona sí lo usan.
      const respuesta = generarRespuestaSugerida("", rg.estrellas, rg.texto, cliente.tonoMarca, 0);
      const publicada = await responderResenaGoogle(token, rg.name, respuesta);
      if (publicada) {
        await actualizarResena(creada.id, {
          estado: "respondida",
          respuestaSugerida: respuesta,
          respuestaPublicada: true,
          publicadaAutomaticamente: true,
        });
        autoRespondidas += 1;
      }
    } else if (rg.estrellas <= 3) {
      // No se respondió sola (es mala, o la automatización está apagada) —
      // avisarle al dueño ya, no esperar a que abra el portal por las
      // suyas.
      await alertarResenaMala(cliente, { autor: rg.autor, estrellas: rg.estrellas, texto: rg.texto });
    }
  }

  await sql`UPDATE comercios SET resenas_sync_en = now() WHERE id = ${id}`;
  return { nuevas, autoRespondidas };
}

/** Publica la respuesta a UNA reseña puntual en Google — usado desde
 * "Aprobar respuesta" en el portal del cliente (accionAprobarResenaPortal),
 * no solo desde el auto-responder de sincronizarResenasGoogle. Antes, ese
 * botón solo guardaba la respuesta en el CRM y le pedía al dueño que la
 * copie y pegue a mano SIEMPRE, aunque la Reviews API ya estuviera
 * habilitada y la reseña viniera de Google — ahora publica de una en cuanto
 * estén dadas las tres condiciones. Devuelve false sin tirar excepción si
 * falta cualquiera (API sin habilitar, sin token válido, Google la
 * rechaza) — quien llama cae al comportamiento de siempre: guardarla para
 * copiar y pegar. */
export async function responderResenaEnGoogle(
  comercioId: string,
  origenGoogleId: string,
  respuesta: string,
): Promise<boolean> {
  if (!resenasApiHabilitada()) return false;
  const token = await accessTokenGBPComercio(comercioId);
  if (!token) return false;
  return responderResenaGoogle(token, origenGoogleId, respuesta);
}

/** Reseñas de todos los comercios con Google conectado — para el cron diario. */
export async function sincronizarResenasGoogleTodos(): Promise<{
  total: number;
  nuevas: number;
  autoRespondidas: number;
}> {
  const rows = await sql`SELECT id FROM comercios WHERE google_refresh_token != ''`;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarResenasGoogle);
  let nuevas = 0;
  let autoRespondidas = 0;
  for (const r of resultados) {
    nuevas += r.nuevas;
    autoRespondidas += r.autoRespondidas;
  }
  return { total: ids.length, nuevas, autoRespondidas };
}

/** Toggle de automatización que el cliente elige desde su portal. */
export async function actualizarAutomatizacionResenas(
  id: string,
  datos: { autoResponderPositivas: boolean; autoResponderUmbral: 4 | 5 },
): Promise<void> {
  await sql`
    UPDATE comercios SET
      auto_responder_positivas = ${datos.autoResponderPositivas},
      auto_responder_umbral = ${datos.autoResponderUmbral}
    WHERE id = ${id}
  `;
}
