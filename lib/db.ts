import "server-only";
import crypto from "node:crypto";
import { sql } from "./sql";
import { fetchGooglePlaceStats } from "./places";
import { accessTokenDesdeRefresh } from "./google-oauth";
import { listarUbicaciones, rendimientoDelMes } from "./gbp";
import { listarResenasGoogle, responderResenaGoogle, resenasApiHabilitada } from "./google-reviews";
import { generarRespuestaSugerida } from "./respuestas";
import { hashearPin, pinCoincide } from "./pin";
import { alertarResenaMala, enviarResumenMensual } from "./alertas";
import type {
  AuditGEOResultado,
  BenchmarkMes,
  ChecklistItemSEO,
  Cliente,
  Cobro,
  Competidor,
  DestinoLink,
  EstadoCliente,
  EstadoProspecto,
  EstadoResena,
  FormatoNFC,
  LinkNFC,
  MetricaMensual,
  Plan,
  PlataformaIA,
  Prospecto,
  ResenaCRM,
  Rubro,
  TipoSoporte,
  TonoMarca,
  VentaNFC,
  Zona,
} from "./types";
import { CHECKLIST_SEO_ITEMS } from "./types";

// Capa de acceso a datos: Postgres puro (sin ORM), consultas en SQL directo
// vía el driver `postgres`. Cada función mapea filas de snake_case (columnas
// SQL) a los tipos camelCase de lib/types.ts.

// ---------- Mappers ----------

function mapMetrica(r: Record<string, unknown>): MetricaMensual {
  return {
    mes: r.mes as string,
    resenasNuevas: Number(r.resenas_nuevas),
    resenasTotal: Number(r.resenas_total),
    ratingPromedio: Number(r.rating_promedio),
    visitasPerfil: Number(r.visitas_perfil),
    llamadas: Number(r.llamadas),
    clicsComoLlegar: Number(r.clics_como_llegar),
    citasChatGPT: r.citas_chatgpt === null ? undefined : Number(r.citas_chatgpt),
    citasCopilot: r.citas_copilot === null ? undefined : Number(r.citas_copilot),
    citasPerplexity: r.citas_perplexity === null ? undefined : Number(r.citas_perplexity),
  };
}

function mapVenta(r: Record<string, unknown>): VentaNFC {
  return {
    formato: r.formato as FormatoNFC,
    cantidad: Number(r.cantidad),
    precioUnitario: Number(r.precio_unitario),
    fecha: fechaISO(r.fecha),
  };
}

function fechaISO(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function mapClienteBase(
  row: Record<string, unknown>,
  historico: MetricaMensual[],
  ventasNFC: VentaNFC[],
): Cliente {
  return {
    id: row.id as string,
    codigoAcceso: row.codigo_acceso as string,
    nombre: row.nombre as string,
    rubro: row.rubro as Rubro,
    zona: row.zona as Zona,
    plan: row.plan as Plan,
    estado: row.estado as EstadoCliente,
    contacto: row.contacto as string,
    fechaAlta: fechaISO(row.fecha_alta),
    googleReviewUrl: row.google_review_url as string,
    busquedaClave: row.busqueda_clave as string,
    fee: Number(row.fee),
    tonoMarca: (row.tono_marca as TonoMarca) ?? "cercano",
    historico,
    ventasNFC,
    googlePlaceId: (row.google_place_id as string) ?? "",
    googleLocation: (row.google_location as string) ?? "",
    ratingGoogle: row.rating_google === null ? null : Number(row.rating_google),
    resenasGoogle: row.resenas_google === null ? null : Number(row.resenas_google),
    googleSyncEn: row.google_sync_en ? new Date(row.google_sync_en as string).toISOString() : null,
    googleConectadoEn: row.google_conectado_en
      ? new Date(row.google_conectado_en as string).toISOString()
      : null,
    autoResponderPositivas: Boolean(row.auto_responder_positivas),
    autoResponderUmbral: (Number(row.auto_responder_umbral) as 4 | 5) || 4,
    resenasSyncEn: row.resenas_sync_en ? new Date(row.resenas_sync_en as string).toISOString() : null,
    emailNotificaciones: (row.email_notificaciones as string) ?? "",
  };
}

async function ensambleCliente(row: Record<string, unknown>): Promise<Cliente> {
  const id = row.id as string;
  const [historico, ventasNFC] = await Promise.all([
    sql`SELECT * FROM metricas_mensuales WHERE comercio_id = ${id} ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc WHERE comercio_id = ${id} ORDER BY fecha ASC`,
  ]);
  return mapClienteBase(row, historico.map(mapMetrica), ventasNFC.map(mapVenta));
}

// ---------- Lectura: clientes ----------

export async function getClientes(): Promise<Cliente[]> {
  // 3 consultas totales, sin depender de la cantidad de clientes. La
  // versión anterior (2 consultas POR cliente vía ensambleCliente) era un
  // N+1 que castigaba todas las páginas del panel que listan clientes.
  const [comercios, metricas, ventas] = await Promise.all([
    sql`SELECT * FROM comercios ORDER BY fecha_alta ASC`,
    sql`SELECT * FROM metricas_mensuales ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc ORDER BY fecha ASC`,
  ]);

  const metricasPor = new Map<string, MetricaMensual[]>();
  for (const r of metricas) {
    const lista = metricasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapMetrica(r));
    else metricasPor.set(r.comercio_id as string, [mapMetrica(r)]);
  }
  const ventasPor = new Map<string, VentaNFC[]>();
  for (const r of ventas) {
    const lista = ventasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapVenta(r));
    else ventasPor.set(r.comercio_id as string, [mapVenta(r)]);
  }

  return comercios.map((row) =>
    mapClienteBase(
      row,
      metricasPor.get(row.id as string) ?? [],
      ventasPor.get(row.id as string) ?? [],
    ),
  );
}

export async function getCliente(id: string): Promise<Cliente | undefined> {
  const rows = await sql`SELECT * FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return ensambleCliente(rows[0]);
}

export async function getClientePorCodigo(codigo: string): Promise<Cliente | undefined> {
  if (!codigo) return undefined;
  const rows = await sql`SELECT * FROM comercios WHERE codigo_acceso = ${codigo}`;
  if (rows.length === 0) return undefined;
  return ensambleCliente(rows[0]);
}

/** Lo mínimo que necesita /t/[slug] en UNA consulta: el link y, si está
 * asignado, lo poco del comercio que usa la página del tap. Nada de histórico,
 * ventas ni conteo de taps — esta es la ruta más caliente del producto
 * (cada tap de un cliente final pasa por acá). */
export interface DatosTap {
  link: Pick<
    LinkNFC,
    "id" | "destino" | "urlDestino" | "activo" | "usarFiltro" | "autogestionado" | "nombreNegocio"
  >;
  comercio: { id: string; nombre: string; rubro: Rubro; googleReviewUrl: string } | null;
}

export async function getDatosTap(slug: string): Promise<DatosTap | undefined> {
  const rows = await sql`
    SELECT l.id, l.destino, l.url_destino, l.activo, l.usar_filtro,
           l.autogestionado, l.nombre_negocio,
           co.id AS comercio_id, co.nombre, co.rubro, co.google_review_url
    FROM links_nfc l
    LEFT JOIN comercios co ON co.id = l.comercio_id
    WHERE l.id = ${slug}
  `;
  if (rows.length === 0) return undefined;
  const r = rows[0];
  return {
    link: {
      id: r.id as string,
      destino: r.destino as DestinoLink,
      urlDestino: (r.url_destino as string | null) ?? null,
      activo: Boolean(r.activo),
      // las columnas son NOT NULL y siempre vienen en el SELECT
      usarFiltro: Boolean(r.usar_filtro),
      autogestionado: Boolean(r.autogestionado),
      nombreNegocio: (r.nombre_negocio as string) ?? "",
    },
    comercio: r.comercio_id
      ? {
          id: r.comercio_id as string,
          nombre: r.nombre as string,
          rubro: r.rubro as Rubro,
          googleReviewUrl: r.google_review_url as string,
        }
      : null,
  };
}

// ---------- Escritura: clientes ----------

export function generarCodigo(): string {
  // 8 bytes = 64 bits de entropía. Es la credencial permanente del portal
  // del cliente (sin expiración): 4 bytes eran un margen demasiado fino
  // contra enumeración. Solo afecta códigos nuevos o regenerados.
  return crypto.randomBytes(8).toString("hex");
}

function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function crearCliente(
  datos: Omit<
    Cliente,
    | "id"
    | "codigoAcceso"
    | "ventasNFC"
    | "historico"
    | "ratingGoogle"
    | "resenasGoogle"
    | "googleSyncEn"
    | "googleLocation"
    | "googleConectadoEn"
    | "autoResponderPositivas"
    | "autoResponderUmbral"
    | "resenasSyncEn"
    | "emailNotificaciones"
  >,
): Promise<Cliente> {
  let id = slugify(datos.nombre) || "comercio";
  // asegurar unicidad del id/slug
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM comercios WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugify(datos.nombre)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  const codigoAcceso = generarCodigo();
  // Transacción: el comercio y su link de mostrador por defecto nacen
  // juntos o no nace ninguno — sin esto, un fallo en el segundo INSERT
  // dejaba un comercio sin link, estado que la UI asume imposible.
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto, google_review_url, busqueda_clave, fee, tono_marca, fecha_alta, google_place_id)
      VALUES (${id}, ${codigoAcceso}, ${datos.nombre}, ${datos.rubro}, ${datos.zona}, ${datos.plan}, ${datos.estado}, ${datos.contacto}, ${datos.googleReviewUrl}, ${datos.busquedaClave}, ${datos.fee}, ${datos.tonoMarca ?? "cercano"}, ${datos.fechaAlta}, ${datos.googlePlaceId ?? ""})
    `;
    // link de mostrador por defecto, para que el gestor de links no arranque vacío
    await tx`
      INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
      VALUES (${`${id}-mostrador`}, ${id}, ${"Mostrador"}, ${"resena"})
    `;
  });
  const c = await getCliente(id);
  if (!c) throw new Error("No se pudo crear el comercio.");
  return c;
}

export async function actualizarCliente(
  id: string,
  datos: Partial<Omit<Cliente, "id" | "ventasNFC" | "historico">>,
): Promise<Cliente> {
  // Un solo UPDATE atómico: cada campo ausente conserva su valor actual en
  // SQL. El viejo leer-mezclar-escribir en JS permitía que dos ediciones
  // concurrentes se pisaran (lost update).
  const rows = await sql`
    UPDATE comercios SET
      codigo_acceso = ${datos.codigoAcceso === undefined ? sql`codigo_acceso` : datos.codigoAcceso},
      nombre = ${datos.nombre === undefined ? sql`nombre` : datos.nombre},
      rubro = ${datos.rubro === undefined ? sql`rubro` : datos.rubro},
      zona = ${datos.zona === undefined ? sql`zona` : datos.zona},
      plan = ${datos.plan === undefined ? sql`plan` : datos.plan},
      estado = ${datos.estado === undefined ? sql`estado` : datos.estado},
      contacto = ${datos.contacto === undefined ? sql`contacto` : datos.contacto},
      google_review_url = ${datos.googleReviewUrl === undefined ? sql`google_review_url` : datos.googleReviewUrl},
      busqueda_clave = ${datos.busquedaClave === undefined ? sql`busqueda_clave` : datos.busquedaClave},
      fee = ${datos.fee === undefined ? sql`fee` : datos.fee},
      tono_marca = ${datos.tonoMarca === undefined ? sql`tono_marca` : datos.tonoMarca},
      google_place_id = ${datos.googlePlaceId === undefined ? sql`google_place_id` : datos.googlePlaceId},
      google_location = ${datos.googleLocation === undefined ? sql`google_location` : datos.googleLocation},
      email_notificaciones = ${datos.emailNotificaciones === undefined ? sql`email_notificaciones` : datos.emailNotificaciones}
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Comercio no encontrado: ${id}`);
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

/** Borra el cliente y todo lo que dependía de él (reseñas, links, taps,
 * métricas, feedback, checklist, audits, competencia) — encadenado por
 * ON DELETE CASCADE en el schema. No se puede deshacer. */
export async function eliminarCliente(id: string): Promise<void> {
  await sql`DELETE FROM comercios WHERE id = ${id}`;
}

/** Trae rating/reseñas actuales de Google Places API y los guarda — tanto
 * en el snapshot "en vivo" (comercios.rating_google/resenas_google) como
 * en la métrica del mes en curso, para que "Detalle mensual" y el gráfico
 * de evolución dejen de depender de una carga manual aparte. "Reseñas
 * nuevas" se calcula solo, comparando contra el total del mes anterior.
 * Visitas/llamadas no se tocan acá — eso lo hace sincronizarRendimiento. */
export async function sincronizarGoogle(id: string): Promise<boolean> {
  const rows = await sql`SELECT google_place_id FROM comercios WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id as string | undefined;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

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
  const resenasNuevas = Math.max(0, stats.totalReseñas - totalAnterior);

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

// Syncs masivos del cron en lotes de a 5 en paralelo: secuencial era
// demasiado lento (moría por timeout con la lista creciendo) y todo junto
// castigaría la cuota de las APIs de Google. Un fallo en un comercio no
// corta el resto, pero queda logueado — sin esto los rechazos se tragaban
// y el cron reportaba conteos sanos con comercios sin sincronizar.
const LOTE_SYNC = 5;

async function sincronizarEnLotes<Id, T>(
  ids: Id[],
  fn: (id: Id) => Promise<T>,
): Promise<T[]> {
  const exitosos: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE_SYNC) {
    const lote = ids.slice(i, i + LOTE_SYNC);
    const resultados = await Promise.allSettled(lote.map(fn));
    resultados.forEach((r, j) => {
      if (r.status === "fulfilled") exitosos.push(r.value);
      else console.error(`Sync falló para ${lote[j]}:`, r.reason);
    });
  }
  return exitosos;
}

/** Sincroniza todos los comercios que tengan un place_id cargado — usado
 * por el cron diario. Devuelve cuántos se actualizaron correctamente. */
export async function sincronizarGoogleTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`SELECT id FROM comercios WHERE google_place_id != ''`;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarGoogle);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

// ---------- Ajustes (clave/valor de la agencia) ----------

export async function getAjuste(clave: string): Promise<string | null> {
  const rows = await sql`SELECT valor FROM ajustes WHERE clave = ${clave}`;
  return rows.length ? (rows[0].valor as string) : null;
}

export async function setAjuste(clave: string, valor: string): Promise<void> {
  await sql`
    INSERT INTO ajustes (clave, valor) VALUES (${clave}, ${valor})
    ON CONFLICT (clave) DO UPDATE SET valor = ${valor}, actualizado_en = now()
  `;
}

// ---------- Rendimiento (Business Profile Performance API) ----------
// Modelo por cliente: cada comercio autoriza con SU PROPIA cuenta de
// Google desde su portal (/portal/[codigo] → "Conectar tu Google Business
// Profile"), no con una cuenta de la agencia. Así el dato sigue llegando
// aunque la agencia no administre la ficha, y queda listo para funcionar
// sin fricción el día que la app esté verificada por Google.

async function accessTokenGBPComercio(id: string): Promise<string | null> {
  const rows = await sql`SELECT google_refresh_token FROM comercios WHERE id = ${id}`;
  const refresh = rows[0]?.google_refresh_token as string | undefined;
  if (!refresh) return null;
  return accessTokenDesdeRefresh(refresh);
}

/** Guarda el refresh token que el cliente acaba de autorizar desde su
 * portal. Se llama desde el callback de /api/portal/google/oauth. */
export async function guardarTokenGoogleComercio(id: string, refreshToken: string): Promise<void> {
  await sql`
    UPDATE comercios SET google_refresh_token = ${refreshToken}, google_conectado_en = now()
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

/** Resuelve (y cachea en la fila del comercio) el resource name de su ficha
 * en Business Profile, matcheando por place_id contra las ubicaciones que
 * administra la cuenta conectada. Compartido por rendimiento y reseñas —
 * ambas APIs identifican la ficha de la misma forma. null si falta
 * cualquier pieza: sin place_id cargado, o la cuenta conectada no administra
 * esa ficha. */
async function resolverLocationGBP(id: string, token: string): Promise<string | null> {
  const rows = await sql`SELECT google_place_id, google_location FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const location = rows[0].google_location as string;
  if (location) return location;

  const placeId = rows[0].google_place_id as string;
  if (!placeId) return null;
  const ubicaciones = await listarUbicaciones(token);
  const match = ubicaciones.find((u) => u.placeId === placeId);
  if (!match) return null;
  await sql`UPDATE comercios SET google_location = ${match.location} WHERE id = ${id}`;
  return match.location;
}

/** Trae visitas al perfil, llamadas y clics "cómo llegar" del mes en curso
 * y los guarda en metricas_mensuales, usando la cuenta de Google que ESE
 * comercio conectó. Vincula la ficha sola la primera vez, matcheando por
 * place_id contra las ubicaciones que administra esa cuenta. Devuelve false
 * (sin romper) si falta cualquier pieza: sin conectar, sin place_id, la
 * cuenta no administra esa ficha, o el refresh token venció (app en modo
 * Testing: hay que reconectar cada ~7 días hasta que Google verifique la app). */
export async function sincronizarRendimiento(id: string): Promise<boolean> {
  const token = await accessTokenGBPComercio(id);
  if (!token) return false;

  const location = await resolverLocationGBP(id, token);
  if (!location) return false;

  const hoy = new Date();
  const r = await rendimientoDelMes(token, location, hoy.getFullYear(), hoy.getMonth() + 1);
  if (!r) return false;

  const mes = hoy.toISOString().slice(0, 7);
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, visitas_perfil, llamadas, clics_como_llegar)
    VALUES (${id}, ${mes}, ${r.visitas}, ${r.llamadas}, ${r.comoLlegar})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar
  `;
  return true;
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

  for (const rg of resenasGoogle) {
    const existe = await sql`SELECT 1 FROM resenas WHERE origen_google_id = ${rg.name}`;
    if (existe.length > 0) continue;

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

    const esPositivaSegunUmbral = rg.estrellas >= cliente.autoResponderUmbral;
    if (!rg.yaRespondida && cliente.autoResponderPositivas && esPositivaSegunUmbral) {
      const respuesta = generarRespuestaSugerida(rg.autor, rg.estrellas, rg.texto, cliente.tonoMarca, 0);
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

export async function guardarMetrica(id: string, m: MetricaMensual): Promise<Cliente> {
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity)
    VALUES (${id}, ${m.mes}, ${m.resenasNuevas}, ${m.resenasTotal}, ${m.ratingPromedio}, ${m.visitasPerfil}, ${m.llamadas}, ${m.clicsComoLlegar}, ${m.citasChatGPT ?? null}, ${m.citasCopilot ?? null}, ${m.citasPerplexity ?? null})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio,
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar,
      citas_chatgpt = EXCLUDED.citas_chatgpt,
      citas_copilot = EXCLUDED.citas_copilot,
      citas_perplexity = EXCLUDED.citas_perplexity
  `;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

export async function eliminarMetrica(id: string, mes: string): Promise<Cliente> {
  await sql`DELETE FROM metricas_mensuales WHERE comercio_id = ${id} AND mes = ${mes}`;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

export async function registrarVentaNFC(id: string, venta: VentaNFC): Promise<Cliente> {
  await sql`
    INSERT INTO ventas_nfc (comercio_id, formato, cantidad, precio_unitario, fecha)
    VALUES (${id}, ${venta.formato}, ${venta.cantidad}, ${venta.precioUnitario}, ${venta.fecha})
  `;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

export async function regenerarCodigo(id: string): Promise<Cliente> {
  return actualizarCliente(id, { codigoAcceso: generarCodigo() });
}

// ---------- Links NFC + taps ----------

function mapLink(r: Record<string, unknown>): LinkNFC {
  return {
    id: r.id as string,
    comercioId: (r.comercio_id as string | null) ?? null,
    etiqueta: r.etiqueta as string,
    tipo: (r.tipo as TipoSoporte) ?? "nfc",
    lote: (r.lote as string) ?? "",
    destino: r.destino as DestinoLink,
    urlDestino: (r.url_destino as string | null) ?? null,
    activo: Boolean(r.activo),
    usarFiltro: r.usar_filtro === undefined ? false : Boolean(r.usar_filtro),
    autogestionado: Boolean(r.autogestionado),
    nombreNegocio: (r.nombre_negocio as string) ?? "",
    creadoEn: String(r.creado_en),
    taps: Number(r.taps ?? 0),
  };
}

export async function getLinks(comercioId: string): Promise<LinkNFC[]> {
  const rows = await sql`
    SELECT l.*, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN taps t ON t.link_id = l.id
    WHERE l.comercio_id = ${comercioId}
    GROUP BY l.id
    ORDER BY l.creado_en ASC
  `;
  return rows.map(mapLink);
}

export async function getLink(linkId: string): Promise<LinkNFC | undefined> {
  const rows = await sql`
    SELECT l.*, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN taps t ON t.link_id = l.id
    WHERE l.id = ${linkId}
    GROUP BY l.id
  `;
  if (rows.length === 0) return undefined;
  return mapLink(rows[0]);
}

function slugLink(etiqueta: string): string {
  return (
    slugify(etiqueta).slice(0, 24) || "link"
  );
}

export async function crearLink(
  comercioId: string,
  datos: {
    etiqueta: string;
    tipo?: TipoSoporte;
    destino: DestinoLink;
    urlDestino?: string | null;
    usarFiltro?: boolean;
  },
): Promise<LinkNFC> {
  let id = slugLink(datos.etiqueta);
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM links_nfc WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugLink(datos.etiqueta)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, destino, url_destino, usar_filtro)
    VALUES (${id}, ${comercioId}, ${datos.etiqueta}, ${datos.tipo ?? "nfc"}, ${datos.destino}, ${datos.urlDestino ?? null}, ${datos.usarFiltro ?? false})
  `;
  const l = await getLink(id);
  if (!l) throw new Error("No se pudo crear el link.");
  return l;
}

export async function actualizarLink(
  linkId: string,
  datos: Partial<{
    etiqueta: string;
    tipo: TipoSoporte;
    destino: DestinoLink;
    urlDestino: string | null;
    activo: boolean;
    usarFiltro: boolean;
  }>,
): Promise<LinkNFC> {
  // Mismo criterio que actualizarCliente: UPDATE atómico, sin leer-mezclar-
  // escribir. urlDestino distingue "no tocar" (undefined) de "borrar" (null).
  const rows = await sql`
    UPDATE links_nfc SET
      etiqueta = ${datos.etiqueta === undefined ? sql`etiqueta` : datos.etiqueta},
      tipo = ${datos.tipo === undefined ? sql`tipo` : datos.tipo},
      destino = ${datos.destino === undefined ? sql`destino` : datos.destino},
      url_destino = ${datos.urlDestino === undefined ? sql`url_destino` : datos.urlDestino},
      activo = ${datos.activo === undefined ? sql`activo` : datos.activo},
      usar_filtro = ${datos.usarFiltro === undefined ? sql`usar_filtro` : datos.usarFiltro}
    WHERE id = ${linkId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Link no encontrado: ${linkId}`);
  const l = await getLink(linkId);
  if (!l) throw new Error(`Link no encontrado: ${linkId}`);
  return l;
}

export async function eliminarLink(linkId: string): Promise<void> {
  await sql`DELETE FROM links_nfc WHERE id = ${linkId}`;
}

// ---------- Autogestión de hardware (canal Mercado Libre) ----------
// Piezas del inventario libre (comercio_id NULL) que su propio comprador
// activa desde /t/<id> — sin admin, sin fila en `comercios`. El PIN de
// edición vive hasheado acá (scrypt, lib/pin.ts) y nunca sale de estas dos
// funciones: mapLink no lo expone, así que ninguna pantalla puede filtrarlo
// por accidente.
//
// Estas piezas van siempre directo al link cargado por su comprador,
// para cualquiera que las toque — coherente con vender solo el hardware,
// sin portal ni panel detrás.

export async function activarAutogestion(
  slug: string,
  datos: { nombreNegocio: string; urlDestino: string; pin: string },
): Promise<LinkNFC> {
  const { hash, salt } = hashearPin(datos.pin);
  // Condición en el WHERE, no un chequeo previo: si dos pestañas activan la
  // misma pieza a la vez, solo una gana — la otra recibe este error en vez
  // de pisar el PIN que ya eligió la primera.
  const rows = await sql`
    UPDATE links_nfc SET
      autogestionado = TRUE,
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${datos.urlDestino},
      usar_filtro = FALSE,
      pin_hash = ${hash},
      pin_salt = ${salt}
    WHERE id = ${slug} AND comercio_id IS NULL AND autogestionado = FALSE
    RETURNING id
  `;
  if (rows.length === 0) {
    throw new Error("Esta pieza ya fue activada, o no está disponible para autogestión.");
  }
  const l = await getLink(slug);
  if (!l) throw new Error(`Pieza no encontrada: ${slug}`);
  return l;
}

export async function editarAutogestion(
  slug: string,
  pin: string,
  datos: { nombreNegocio: string; urlDestino: string },
): Promise<LinkNFC> {
  const rows = await sql`
    SELECT pin_hash, pin_salt FROM links_nfc
    WHERE id = ${slug} AND comercio_id IS NULL AND autogestionado = TRUE
  `;
  if (rows.length === 0) throw new Error("Pieza no encontrada o todavía no fue activada.");
  const pinHash = rows[0].pin_hash as string | null;
  const pinSalt = rows[0].pin_salt as string | null;
  if (!pinHash || !pinSalt || !pinCoincide(pin, pinHash, pinSalt)) {
    throw new Error("PIN incorrecto.");
  }

  const actualizado = await sql`
    UPDATE links_nfc SET
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${datos.urlDestino}
    WHERE id = ${slug}
    RETURNING id
  `;
  if (actualizado.length === 0) throw new Error(`Pieza no encontrada: ${slug}`);
  const l = await getLink(slug);
  if (!l) throw new Error(`Pieza no encontrada: ${slug}`);
  return l;
}

// ---------- Inventario de hardware (piezas pre-generadas en lote) ----------
// El circuito real: se generan N piezas ANTES de saber a qué cliente van
// (código fijo tipo "p-0001", listo para imprimir/programar), se mandan los
// QR al proveedor, y recién cuando se vende un cliente se ASIGNA una pieza
// libre — el código impreso nunca cambia, solo el destino al que redirige.

export interface PiezaHardware extends LinkNFC {
  clienteNombre: string | null;
}

function mapPiezaHardware(r: Record<string, unknown>): PiezaHardware {
  return { ...mapLink(r), clienteNombre: (r.cliente_nombre as string | null) ?? null };
}

/** Genera `cantidad` piezas nuevas, libres (sin cliente), con código fijo
 * correlativo ("p-0001", "p-0002"...) que continúa donde quedó el último
 * lote — nunca reutiliza un código ya emitido, aunque se hayan borrado
 * piezas viejas. */
export async function generarLotePiezas(
  cantidad: number,
  tipo: TipoSoporte,
  lote: string,
): Promise<PiezaHardware[]> {
  // Transacción + lock consultivo: dos lotes generándose a la vez leían el
  // mismo correlativo y colisionaban en la PK a mitad de lote, dejando el
  // inventario a medias. El lock es de transacción (se suelta solo) y
  // funciona igual detrás del pooler de Neon.
  const creadas = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('taply_lote_piezas'))`;

    const rows = await tx`
      SELECT id FROM links_nfc WHERE id LIKE 'p-%'
    `;
    let max = 0;
    for (const r of rows) {
      const n = Number((r.id as string).slice(2));
      if (Number.isFinite(n) && n > max) max = n;
    }

    const nuevas: string[] = [];
    for (let i = 1; i <= cantidad; i++) {
      nuevas.push(`p-${String(max + i).padStart(4, "0")}`);
    }

    for (const id of nuevas) {
      await tx`
        INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino)
        VALUES (${id}, NULL, '', ${tipo}, ${lote}, 'resena')
      `;
    }

    return tx`SELECT *, 0 AS taps FROM links_nfc WHERE id = ANY(${nuevas})`;
  });
  return creadas.map(mapPiezaHardware);
}

/** Todo el inventario de hardware — libre y asignado, de todos los
 * clientes — para saber de un vistazo cuántas piezas hay, cuáles están
 * libres y a quién le toca cada una de las asignadas. */
export async function getInventarioHardware(): Promise<PiezaHardware[]> {
  const rows = await sql`
    SELECT l.*, co.nombre AS cliente_nombre, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN comercios co ON co.id = l.comercio_id
    LEFT JOIN taps t ON t.link_id = l.id
    GROUP BY l.id, co.nombre
    ORDER BY (l.comercio_id IS NULL) DESC, l.id ASC
  `;
  return rows.map(mapPiezaHardware);
}

/** Asigna una pieza libre del inventario a un cliente — el código (y por lo
 * tanto el QR/NFC ya impreso) no cambia, solo pasa de "libre" a
 * pertenecerle a ese comercio con su etiqueta/destino. Falla si la pieza ya
 * estaba asignada, para no pisar una asignación existente por error. */
export async function asignarPiezaACliente(
  id: string,
  comercioId: string,
  datos: {
    etiqueta: string;
    tipo?: TipoSoporte;
    destino: DestinoLink;
    urlDestino?: string | null;
    usarFiltro?: boolean;
  },
): Promise<LinkNFC> {
  const rows = await sql`
    UPDATE links_nfc SET
      comercio_id = ${comercioId},
      etiqueta = ${datos.etiqueta},
      tipo = COALESCE(${datos.tipo ?? null}, tipo),
      destino = ${datos.destino},
      url_destino = ${datos.urlDestino ?? null},
      usar_filtro = ${datos.usarFiltro ?? false}
    WHERE id = ${id} AND comercio_id IS NULL
    RETURNING *
  `;
  if (rows.length === 0) {
    throw new Error("Esa pieza no está libre (ya fue asignada, o el código no existe).");
  }
  const l = await getLink(id);
  if (!l) throw new Error(`Pieza no encontrada: ${id}`);
  return l;
}

export async function registrarTap(linkId: string, userAgent: string | null): Promise<void> {
  await sql`INSERT INTO taps (link_id, user_agent) VALUES (${linkId}, ${userAgent})`;
}

export interface TapsPorDia {
  fecha: string;
  taps: number;
}

// Los timestamps se guardan en UTC (TIMESTAMPTZ) pero los comercios y sus
// clientes viven en Argentina (UTC-3): agrupar por t.creado_en::date pelado
// usa la fecha UTC, y un tap de las 21:00-23:59 locales caía en el día
// SIGUIENTE del gráfico. Todo lo que agrupa por día/hora convierte antes.
const TZ_COMERCIO = "America/Argentina/Cordoba";

export async function getTapsPorDia(comercioId: string, dias = 14): Promise<TapsPorDia[]> {
  const rows = await sql`
    SELECT to_char((t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date, 'YYYY-MM-DD') AS fecha, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha as string, taps: Number(r.taps) }));
}

export interface TapsPorDiaSoporte {
  fecha: string;
  nfc: number;
  qr: number;
}

/** Igual que getTapsPorDia, pero separando cuánto vino de un link puramente
 * NFC vs. uno con QR habilitado (tipo 'qr' o 'ambos') — para el portal del
 * cliente. Un link 'ambos' no permite saber si ESE tap puntual fue toque o
 * escaneo (Google/nosotros no lo distinguimos), así que cuenta del lado QR
 * como aproximación honesta, no como atribución exacta. */
export async function getTapsPorDiaPorSoporte(comercioId: string, dias = 14): Promise<TapsPorDiaSoporte[]> {
  const rows = await sql`
    SELECT
      to_char((t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date, 'YYYY-MM-DD') AS fecha,
      COUNT(*) FILTER (WHERE l.tipo = 'nfc')::int AS nfc,
      COUNT(*) FILTER (WHERE l.tipo IN ('qr', 'ambos'))::int AS qr
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha as string, nfc: Number(r.nfc), qr: Number(r.qr) }));
}

export interface TapsPorHora {
  hora: number; // 0-23, hora local del comercio en el momento del tap
  taps: number;
}

/** Desglose hora a hora de un día puntual — para expandir el panel de
 * "Taps por día" del portal. Siempre devuelve las 24 horas (con 0 en las
 * que no hubo nada), así el gráfico no salta huecos. */
export async function getTapsPorHora(comercioId: string, fecha: string): Promise<TapsPorHora[]> {
  const rows = await sql`
    SELECT EXTRACT(HOUR FROM t.creado_en AT TIME ZONE ${TZ_COMERCIO})::int AS hora, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND (t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date = ${fecha}::date
    GROUP BY 1
  `;
  const porHora = new Map(rows.map((r) => [Number(r.hora), Number(r.taps)]));
  return Array.from({ length: 24 }, (_, hora) => ({ hora, taps: porHora.get(hora) ?? 0 }));
}

// ---------- CRM de reseñas ----------

function mapResena(r: Record<string, unknown>): ResenaCRM {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    autor: r.autor as string,
    estrellas: Number(r.estrellas) as 1 | 2 | 3 | 4 | 5,
    texto: r.texto as string,
    plataforma: r.plataforma as "google" | "otra",
    estado: r.estado as EstadoResena,
    respuestaSugerida: (r.respuesta_sugerida as string | null) ?? null,
    respuestaPublicada: Boolean(r.respuesta_publicada),
    responsable: (r.responsable as string | null) ?? null,
    notas: r.notas as string,
    fecha: fechaISO(r.fecha),
    origenGoogleId: (r.origen_google_id as string | null) ?? null,
    publicadaAutomaticamente: Boolean(r.publicada_automaticamente),
    creadoEn: r.creado_en ? new Date(r.creado_en as string).toISOString() : null,
  };
}

export async function getResenas(comercioId: string): Promise<ResenaCRM[]> {
  const rows = await sql`
    SELECT * FROM resenas WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapResena);
}

export async function crearResena(
  comercioId: string,
  datos: {
    autor: string;
    estrellas: 1 | 2 | 3 | 4 | 5;
    texto: string;
    plataforma: "google" | "otra";
    fecha: string;
    /** Hora exacta si se conoce — default ahora mismo (carga manual sin
     * hora propia) o el createTime real de Google si viene del sync. */
    creadoEn?: string;
  },
  origenGoogleId: string | null = null,
): Promise<ResenaCRM> {
  const rows = await sql`
    INSERT INTO resenas (comercio_id, autor, estrellas, texto, plataforma, fecha, origen_google_id, creado_en)
    VALUES (${comercioId}, ${datos.autor}, ${datos.estrellas}, ${datos.texto}, ${datos.plataforma}, ${datos.fecha}, ${origenGoogleId}, ${datos.creadoEn ?? new Date().toISOString()})
    RETURNING *
  `;
  return mapResena(rows[0]);
}

export async function actualizarResena(
  id: number,
  datos: Partial<{
    estado: EstadoResena;
    respuestaSugerida: string;
    respuestaPublicada: boolean;
    responsable: string;
    notas: string;
    publicadaAutomaticamente: boolean;
  }>,
): Promise<ResenaCRM> {
  const rows = await sql`
    UPDATE resenas SET
      estado = COALESCE(${datos.estado ?? null}, estado),
      respuesta_sugerida = COALESCE(${datos.respuestaSugerida ?? null}, respuesta_sugerida),
      respuesta_publicada = COALESCE(${datos.respuestaPublicada ?? null}, respuesta_publicada),
      responsable = COALESCE(${datos.responsable ?? null}, responsable),
      notas = COALESCE(${datos.notas ?? null}, notas),
      publicada_automaticamente = COALESCE(${datos.publicadaAutomaticamente ?? null}, publicada_automaticamente)
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error(`Reseña no encontrada: ${id}`);
  return mapResena(rows[0]);
}

// ---------- Checklist SEO ----------

export async function getChecklist(comercioId: string): Promise<ChecklistItemSEO[]> {
  const rows = await sql`
    SELECT item_key, hecho FROM checklist_seo WHERE comercio_id = ${comercioId}
  `;
  const hechos = new Map(rows.map((r) => [r.item_key as string, Boolean(r.hecho)]));
  return CHECKLIST_SEO_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    hecho: hechos.get(item.key) ?? false,
  }));
}

// ---------- Audit GEO ----------

function mapAudit(r: Record<string, unknown>): AuditGEOResultado {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    fecha: fechaISO(r.fecha),
    pregunta: r.pregunta as string,
    plataforma: r.plataforma as PlataformaIA,
    aparece: Boolean(r.aparece),
    competidoresMencionados: r.competidores_mencionados as string,
  };
}

export async function getAudits(comercioId: string): Promise<AuditGEOResultado[]> {
  const rows = await sql`
    SELECT * FROM audits_geo WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapAudit);
}

// ---------- Competencia ----------

function mapCompetidor(r: Record<string, unknown>): Competidor {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    nombre: r.nombre as string,
    rating: r.rating === null ? null : Number(r.rating),
    totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    googlePlaceId: (r.google_place_id as string | null) ?? null,
    actualizadoEn: String(r.actualizado_en),
  };
}

export async function getCompetidores(comercioId: string): Promise<Competidor[]> {
  const rows = await sql`
    SELECT * FROM competidores WHERE comercio_id = ${comercioId} ORDER BY rating DESC NULLS LAST
  `;
  return rows.map(mapCompetidor);
}

export async function crearCompetidor(
  comercioId: string,
  datos: { nombre: string; rating?: number | null; totalResenas?: number | null; googlePlaceId?: string | null },
): Promise<Competidor> {
  const rows = await sql`
    INSERT INTO competidores (comercio_id, nombre, rating, total_resenas, google_place_id)
    VALUES (${comercioId}, ${datos.nombre}, ${datos.rating ?? null}, ${datos.totalResenas ?? null}, ${datos.googlePlaceId ?? null})
    RETURNING *
  `;
  return mapCompetidor(rows[0]);
}

export async function actualizarCompetidor(
  id: number,
  datos: Partial<{ nombre: string; rating: number | null; totalResenas: number | null; googlePlaceId: string | null }>,
): Promise<Competidor> {
  const rows = await sql`
    UPDATE competidores SET
      nombre = COALESCE(${datos.nombre ?? null}, nombre),
      rating = ${datos.rating === undefined ? sql`rating` : datos.rating},
      total_resenas = ${datos.totalResenas === undefined ? sql`total_resenas` : datos.totalResenas},
      google_place_id = ${datos.googlePlaceId === undefined ? sql`google_place_id` : datos.googlePlaceId},
      actualizado_en = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error(`Competidor no encontrado: ${id}`);
  return mapCompetidor(rows[0]);
}

export async function eliminarCompetidor(id: number): Promise<void> {
  await sql`DELETE FROM competidores WHERE id = ${id}`;
}

/** Trae rating/reseñas actuales de un competidor desde Google Places API —
 * mismo mecanismo que sincronizarGoogle() para el propio comercio, pero acá
 * no hace falta ningún permiso del dueño: el place_id de un negocio ajeno
 * es dato público. Si no tiene place_id cargado, no hace nada (el
 * competidor sigue siendo editable a mano). */
export async function sincronizarCompetidor(id: number): Promise<boolean> {
  const rows = await sql`SELECT google_place_id FROM competidores WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id as string | null | undefined;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

  await sql`
    UPDATE competidores SET
      rating = ${stats.rating},
      total_resenas = ${stats.totalReseñas},
      actualizado_en = now()
    WHERE id = ${id}
  `;
  return true;
}

/** Sincroniza todos los competidores con place_id cargado — corre en el
 * cron diario, antes de congelar la foto mensual (snapshotCompetenciaMensual),
 * así el benchmarking histórico se arma con datos frescos y no con lo
 * último que alguien tipeó a mano. */
export async function sincronizarCompetidoresTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`
    SELECT id FROM competidores WHERE google_place_id IS NOT NULL AND google_place_id != ''
  `;
  const ids = rows.map((r) => Number(r.id));
  const resultados = await sincronizarEnLotes(ids, sincronizarCompetidor);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

// ---------- Benchmarking histórico (fotos mensuales de competencia) ----------

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Guarda la foto del mes en curso de TODOS los competidores cargados: su
 * rating y total de reseñas actuales. Idempotente por (competidor, mes) —
 * correrla varias veces en el mismo mes solo actualiza la fila; al cambiar
 * de mes, la del mes anterior queda congelada. Pensada para el cron diario. */
export async function snapshotCompetenciaMensual(mes = mesActual()): Promise<number> {
  const rows = await sql`
    INSERT INTO competidores_snapshots (competidor_id, comercio_id, nombre, mes, rating, total_resenas)
    SELECT id, comercio_id, nombre, ${mes}, rating, total_resenas FROM competidores
    ON CONFLICT (competidor_id, mes) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      rating = EXCLUDED.rating,
      total_resenas = EXCLUDED.total_resenas,
      comercio_id = EXCLUDED.comercio_id,
      capturado_en = now()
    RETURNING competidor_id
  `;
  return rows.length;
}

/** Benchmarking mensual de un comercio: por cada mes con foto de competencia,
 * nuestras métricas de ese mes (del histórico propio) + la foto de cada
 * competidor. Orden descendente por mes (más reciente primero). */
export async function getBenchmarkMensual(comercioId: string): Promise<BenchmarkMes[]> {
  const [snaps, propias] = await Promise.all([
    sql`
      SELECT mes, nombre, rating, total_resenas
      FROM competidores_snapshots
      WHERE comercio_id = ${comercioId}
      ORDER BY mes DESC, nombre ASC
    `,
    sql`
      SELECT mes, resenas_total, rating_promedio
      FROM metricas_mensuales
      WHERE comercio_id = ${comercioId}
    `,
  ]);

  const propiaPorMes = new Map<string, { resenas: number; rating: number }>();
  for (const r of propias) {
    propiaPorMes.set(r.mes as string, {
      resenas: Number(r.resenas_total),
      rating: Number(r.rating_promedio),
    });
  }

  const porMes = new Map<string, BenchmarkMes>();
  for (const r of snaps) {
    const mes = r.mes as string;
    let fila = porMes.get(mes);
    if (!fila) {
      const propia = propiaPorMes.get(mes);
      fila = {
        mes,
        propioResenas: propia ? propia.resenas : null,
        propioRating: propia ? propia.rating : null,
        competidores: [],
      };
      porMes.set(mes, fila);
    }
    fila.competidores.push({
      nombre: r.nombre as string,
      rating: r.rating === null ? null : Number(r.rating),
      totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    });
  }

  return [...porMes.values()];
}

// ---------- Finanzas (cobros) ----------

function mapCobro(r: Record<string, unknown>): Cobro {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    periodo: r.periodo as string,
    concepto: r.concepto as string,
    monto: Number(r.monto),
    estado: r.estado as Cobro["estado"],
    metodo: r.metodo as string,
    venceEl: r.vence_el === null ? null : fechaISO(r.vence_el),
    pagadoEl: r.pagado_el === null ? null : fechaISO(r.pagado_el),
    nota: r.nota as string,
    creadoEn: String(r.creado_en),
  };
}

/** Todos los cobros con el nombre del comercio, para el historial de cobranza. */
export async function getCobrosConComercio(): Promise<(Cobro & { comercioNombre: string })[]> {
  const rows = await sql`
    SELECT c.*, m.nombre AS comercio_nombre
    FROM cobros c
    JOIN comercios m ON m.id = c.comercio_id
    ORDER BY c.periodo DESC, c.creado_en DESC
  `;
  return rows.map((r) => ({ ...mapCobro(r), comercioNombre: r.comercio_nombre as string }));
}

export async function getCobrosDeComercio(comercioId: string): Promise<Cobro[]> {
  const rows = await sql`
    SELECT * FROM cobros WHERE comercio_id = ${comercioId} ORDER BY periodo DESC, creado_en DESC
  `;
  return rows.map(mapCobro);
}

export async function crearCobro(datos: {
  comercioId: string;
  periodo: string;
  concepto?: string;
  monto: number;
  metodo?: string;
  venceEl?: string | null;
  estado?: Cobro["estado"];
  pagadoEl?: string | null;
  nota?: string;
}): Promise<Cobro> {
  const rows = await sql`
    INSERT INTO cobros (comercio_id, periodo, concepto, monto, estado, metodo, vence_el, pagado_el, nota)
    VALUES (
      ${datos.comercioId}, ${datos.periodo}, ${datos.concepto ?? "abono"}, ${datos.monto},
      ${datos.estado ?? "pendiente"}, ${datos.metodo ?? ""}, ${datos.venceEl ?? null},
      ${datos.pagadoEl ?? null}, ${datos.nota ?? ""}
    )
    RETURNING *
  `;
  return mapCobro(rows[0]);
}

/** Marca un cobro como pagado (o lo revierte a pendiente si pagado=false). */
export async function marcarCobroPagado(id: number, pagado: boolean): Promise<void> {
  await sql`
    UPDATE cobros SET
      estado = ${pagado ? "pagado" : "pendiente"},
      pagado_el = ${pagado ? sql`CURRENT_DATE` : sql`NULL`}
    WHERE id = ${id}
  `;
}

export async function eliminarCobro(id: number): Promise<void> {
  await sql`DELETE FROM cobros WHERE id = ${id}`;
}

// ---------- Prospectos ----------

function mapProspecto(r: Record<string, unknown>): Prospecto {
  return {
    id: r.id as string,
    local: r.local as string,
    zona: r.zona as string,
    contacto: r.contacto as string,
    redes: r.redes as string,
    web: r.web as string,
    resenas: r.resenas as string,
    producto: r.producto as string,
    precio: r.precio as string,
    estado: r.estado as EstadoProspecto,
    segFecha: r.seg_fecha as string,
    segTexto: r.seg_texto as string,
    notas: r.notas as string,
    capturas: (r.capturas as string[]) ?? [],
    creadoEn: fechaISO(r.creado_en),
  };
}

export async function getProspectos(): Promise<Prospecto[]> {
  const rows = await sql`SELECT * FROM prospectos ORDER BY creado_en DESC`;
  return rows.map(mapProspecto);
}

export async function crearProspecto(local = ""): Promise<Prospecto> {
  const id = `prospecto-${crypto.randomBytes(4).toString("hex")}`;
  await sql`INSERT INTO prospectos (id, local) VALUES (${id}, ${local})`;
  const rows = await sql`SELECT * FROM prospectos WHERE id = ${id}`;
  return mapProspecto(rows[0]);
}

export async function actualizarProspecto(
  id: string,
  datos: Partial<Omit<Prospecto, "id" | "capturas" | "creadoEn">>,
): Promise<void> {
  const rows = await sql`SELECT * FROM prospectos WHERE id = ${id}`;
  if (rows.length === 0) throw new Error(`Prospecto no encontrado: ${id}`);
  const n = { ...mapProspecto(rows[0]), ...datos };
  await sql`
    UPDATE prospectos SET
      local = ${n.local}, zona = ${n.zona}, contacto = ${n.contacto},
      redes = ${n.redes}, web = ${n.web}, resenas = ${n.resenas},
      producto = ${n.producto}, precio = ${n.precio}, estado = ${n.estado},
      seg_fecha = ${n.segFecha}, seg_texto = ${n.segTexto}, notas = ${n.notas}
    WHERE id = ${id}
  `;
}

export async function eliminarProspecto(id: string): Promise<void> {
  await sql`DELETE FROM prospectos WHERE id = ${id}`;
}

export async function agregarCapturas(id: string, nuevas: string[]): Promise<void> {
  // Concatenación jsonb atómica en SQL: el viejo leer-modificar-escribir
  // perdía capturas si dos subidas llegaban a la vez.
  if (nuevas.length === 0) return;
  await sql`
    UPDATE prospectos SET capturas = capturas || ${sql.json(nuevas)}
    WHERE id = ${id}
  `;
}

export async function eliminarCaptura(id: string, index: number): Promise<void> {
  // jsonb - int borra por posición de forma atómica (el cast evita que
  // Postgres resuelva al operador jsonb - text). Negativos contarían desde
  // el final — no es lo que la UI manda, se rechazan.
  const i = Math.trunc(index);
  if (!Number.isFinite(i) || i < 0) return;
  await sql`
    UPDATE prospectos SET capturas = capturas - ${i}::int
    WHERE id = ${id}
  `;
}

// ---------- Administradores (login por Google, allowlist del equipo) ----------

export interface Admin {
  email: string;
  nombre: string;
  creadoEn: string;
}

function mapAdmin(r: Record<string, unknown>): Admin {
  return {
    email: r.email as string,
    nombre: r.nombre as string,
    creadoEn: String(r.creado_en),
  };
}

export async function getAdmins(): Promise<Admin[]> {
  const rows = await sql`SELECT * FROM admins ORDER BY creado_en ASC`;
  return rows.map(mapAdmin);
}

export async function esAdminPermitido(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM admins WHERE lower(email) = lower(${email})`;
  return rows.length > 0;
}

export async function agregarAdmin(email: string, nombre: string): Promise<void> {
  const limpio = email.trim().toLowerCase();
  if (!limpio) throw new Error("Falta el email.");
  await sql`
    INSERT INTO admins (email, nombre) VALUES (${limpio}, ${nombre})
    ON CONFLICT (email) DO UPDATE SET nombre = ${nombre}
  `;
}

export async function eliminarAdmin(email: string): Promise<void> {
  await sql`DELETE FROM admins WHERE lower(email) = lower(${email})`;
}

// ---------- Auditoría ----------

export interface EntradaAuditoria {
  id: number;
  adminEmail: string;
  accion: string;
  detalle: string;
  creadoEn: string;
}

/** Registra una acción del panel. adminEmail viene null si quien actuó
 * entró con la contraseña compartida (sin identidad) — se guarda como
 * cadena vacía y la UI lo muestra como "equipo (sin identificar)". Nunca
 * tira si falla: la auditoría no debe romper la acción real que registra. */
export async function registrarAuditoria(
  adminEmail: string | null,
  accion: string,
  detalle = "",
): Promise<void> {
  try {
    await sql`
      INSERT INTO auditoria (admin_email, accion, detalle)
      VALUES (${adminEmail ?? ""}, ${accion}, ${detalle})
    `;
  } catch (err) {
    console.error("No se pudo registrar en auditoría:", err);
  }
}

export async function getAuditoria(limite = 200): Promise<EntradaAuditoria[]> {
  const rows = await sql`SELECT * FROM auditoria ORDER BY creado_en DESC LIMIT ${limite}`;
  return rows.map((r) => ({
    id: Number(r.id),
    adminEmail: r.admin_email as string,
    accion: r.accion as string,
    detalle: r.detalle as string,
    creadoEn: String(r.creado_en),
  }));
}

// ---------- Resumen mensual por email ----------

/** Manda el resumen mensual a cada comercio activo que cargó un email de
 * notificaciones. Se llama una vez al mes desde el cron diario (chequeando
 * el día del mes ahí, no acá) — si el cron falla justo ese día, no hay
 * reintento automático hasta el mes que viene; aceptable para un resumen,
 * no para una alerta urgente (esas van por evento, no por fecha). */
export async function enviarResumenesMensuales(): Promise<{ total: number; enviados: number }> {
  const rows = await sql`
    SELECT id FROM comercios WHERE estado = 'activo' AND email_notificaciones != ''
  `;
  let enviados = 0;
  for (const row of rows) {
    const cliente = await getCliente(row.id as string);
    if (cliente && (await enviarResumenMensual(cliente))) enviados += 1;
  }
  return { total: rows.length, enviados };
}
