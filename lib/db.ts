import "server-only";
import crypto from "node:crypto";
import { sql } from "./sql";
import { fetchGooglePlaceStats } from "./places";
import { accessTokenDesdeRefresh } from "./google-oauth";
import { listarUbicaciones, rendimientoDelMes } from "./gbp";
import type {
  AuditGEOResultado,
  BenchmarkMes,
  ChecklistItemSEO,
  Cliente,
  Cobro,
  Competidor,
  DestinoLink,
  EstadoCliente,
  EstadoFeedback,
  EstadoProspecto,
  EstadoResena,
  Feedback,
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

async function ensambleCliente(row: Record<string, unknown>): Promise<Cliente> {
  const id = row.id as string;
  const [historico, ventasNFC] = await Promise.all([
    sql`SELECT * FROM metricas_mensuales WHERE comercio_id = ${id} ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc WHERE comercio_id = ${id} ORDER BY fecha ASC`,
  ]);
  return {
    id,
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
    historico: historico.map(mapMetrica),
    ventasNFC: ventasNFC.map(mapVenta),
    googlePlaceId: (row.google_place_id as string) ?? "",
    googleLocation: (row.google_location as string) ?? "",
    ratingGoogle: row.rating_google === null ? null : Number(row.rating_google),
    resenasGoogle: row.resenas_google === null ? null : Number(row.resenas_google),
    googleSyncEn: row.google_sync_en ? new Date(row.google_sync_en as string).toISOString() : null,
    googleConectadoEn: row.google_conectado_en
      ? new Date(row.google_conectado_en as string).toISOString()
      : null,
  };
}

// ---------- Lectura: clientes ----------

export async function getClientes(): Promise<Cliente[]> {
  const rows = await sql`SELECT * FROM comercios ORDER BY fecha_alta ASC`;
  return Promise.all(rows.map(ensambleCliente));
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

/** Resuelve un comercio por el slug de su link de mostrador por defecto o
 * cualquiera de sus links — usado por /t/[slug] indirectamente vía getLink. */
export async function getClientePorLinkId(linkId: string): Promise<Cliente | undefined> {
  const rows = await sql`
    SELECT co.* FROM comercios co
    JOIN links_nfc l ON l.comercio_id = co.id
    WHERE l.id = ${linkId}
  `;
  if (rows.length === 0) return undefined;
  return ensambleCliente(rows[0]);
}

// ---------- Escritura: clientes ----------

export function generarCodigo(): string {
  return crypto.randomBytes(4).toString("hex");
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
  datos: Omit<Cliente, "id" | "codigoAcceso" | "ventasNFC" | "historico" | "ratingGoogle" | "resenasGoogle" | "googleSyncEn" | "googleLocation" | "googleConectadoEn">,
): Promise<Cliente> {
  let id = slugify(datos.nombre) || "comercio";
  // asegurar unicidad del id/slug
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM comercios WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugify(datos.nombre)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  const codigoAcceso = generarCodigo();
  await sql`
    INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto, google_review_url, busqueda_clave, fee, tono_marca, fecha_alta, google_place_id)
    VALUES (${id}, ${codigoAcceso}, ${datos.nombre}, ${datos.rubro}, ${datos.zona}, ${datos.plan}, ${datos.estado}, ${datos.contacto}, ${datos.googleReviewUrl}, ${datos.busquedaClave}, ${datos.fee}, ${datos.tonoMarca ?? "cercano"}, ${datos.fechaAlta}, ${datos.googlePlaceId ?? ""})
  `;
  // link de mostrador por defecto, para que el gestor de links no arranque vacío
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
    VALUES (${`${id}-mostrador`}, ${id}, ${"Mostrador"}, ${"resena"})
  `;
  const c = await getCliente(id);
  if (!c) throw new Error("No se pudo crear el comercio.");
  return c;
}

export async function actualizarCliente(
  id: string,
  datos: Partial<Omit<Cliente, "id" | "ventasNFC" | "historico">>,
): Promise<Cliente> {
  const actual = await getCliente(id);
  if (!actual) throw new Error(`Comercio no encontrado: ${id}`);
  const nuevo = { ...actual, ...datos };
  await sql`
    UPDATE comercios SET
      codigo_acceso = ${nuevo.codigoAcceso},
      nombre = ${nuevo.nombre},
      rubro = ${nuevo.rubro},
      zona = ${nuevo.zona},
      plan = ${nuevo.plan},
      estado = ${nuevo.estado},
      contacto = ${nuevo.contacto},
      google_review_url = ${nuevo.googleReviewUrl},
      busqueda_clave = ${nuevo.busquedaClave},
      fee = ${nuevo.fee},
      tono_marca = ${nuevo.tonoMarca},
      google_place_id = ${nuevo.googlePlaceId},
      google_location = ${nuevo.googleLocation}
    WHERE id = ${id}
  `;
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

/** Sincroniza todos los comercios que tengan un place_id cargado — usado
 * por el cron diario. Devuelve cuántos se actualizaron correctamente. */
export async function sincronizarGoogleTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`SELECT id FROM comercios WHERE google_place_id != ''`;
  let actualizados = 0;
  for (const row of rows) {
    if (await sincronizarGoogle(row.id as string)) actualizados += 1;
  }
  return { total: rows.length, actualizados };
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

  const rows = await sql`SELECT google_place_id, google_location FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return false;
  let location = rows[0].google_location as string;
  const placeId = rows[0].google_place_id as string;

  if (!location) {
    if (!placeId) return false;
    const ubicaciones = await listarUbicaciones(token);
    const match = ubicaciones.find((u) => u.placeId === placeId);
    if (!match) return false;
    location = match.location;
    await sql`UPDATE comercios SET google_location = ${location} WHERE id = ${id}`;
  }

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
  let actualizados = 0;
  for (const row of rows) {
    if (await sincronizarRendimiento(row.id as string)) actualizados += 1;
  }
  return { total: rows.length, actualizados };
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
  datos: { etiqueta: string; tipo?: TipoSoporte; destino: DestinoLink; urlDestino?: string | null },
): Promise<LinkNFC> {
  let id = slugLink(datos.etiqueta);
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM links_nfc WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugLink(datos.etiqueta)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, destino, url_destino)
    VALUES (${id}, ${comercioId}, ${datos.etiqueta}, ${datos.tipo ?? "nfc"}, ${datos.destino}, ${datos.urlDestino ?? null})
  `;
  const l = await getLink(id);
  if (!l) throw new Error("No se pudo crear el link.");
  return l;
}

export async function actualizarLink(
  linkId: string,
  datos: Partial<{ etiqueta: string; tipo: TipoSoporte; destino: DestinoLink; urlDestino: string | null; activo: boolean }>,
): Promise<LinkNFC> {
  const actual = await getLink(linkId);
  if (!actual) throw new Error(`Link no encontrado: ${linkId}`);
  const nuevo = { ...actual, ...datos };
  await sql`
    UPDATE links_nfc SET
      etiqueta = ${nuevo.etiqueta},
      tipo = ${nuevo.tipo},
      destino = ${nuevo.destino},
      url_destino = ${nuevo.urlDestino},
      activo = ${nuevo.activo}
    WHERE id = ${linkId}
  `;
  const l = await getLink(linkId);
  if (!l) throw new Error(`Link no encontrado: ${linkId}`);
  return l;
}

export async function eliminarLink(linkId: string): Promise<void> {
  await sql`DELETE FROM links_nfc WHERE id = ${linkId}`;
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
  const rows = await sql`
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
    await sql`
      INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino)
      VALUES (${id}, NULL, '', ${tipo}, ${lote}, 'resena')
    `;
  }

  const creadas = await sql`SELECT *, 0 AS taps FROM links_nfc WHERE id = ANY(${nuevas})`;
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
  datos: { etiqueta: string; tipo?: TipoSoporte; destino: DestinoLink; urlDestino?: string | null },
): Promise<LinkNFC> {
  const rows = await sql`
    UPDATE links_nfc SET
      comercio_id = ${comercioId},
      etiqueta = ${datos.etiqueta},
      tipo = COALESCE(${datos.tipo ?? null}, tipo),
      destino = ${datos.destino},
      url_destino = ${datos.urlDestino ?? null}
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

export async function getTapsPorDia(comercioId: string, dias = 14): Promise<TapsPorDia[]> {
  const rows = await sql`
    SELECT to_char(t.creado_en::date, 'YYYY-MM-DD') AS fecha, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha as string, taps: Number(r.taps) }));
}

/** Total de taps del mes en curso — para el portal del cliente. */
export async function getTapsDelMesActual(comercioId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND date_trunc('month', t.creado_en) = date_trunc('month', now())
  `;
  return Number(rows[0]?.taps ?? 0);
}

// ---------- Feedback privado ----------

function mapFeedback(r: Record<string, unknown>): Feedback {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    estrellas: Number(r.estrellas) as 1 | 2 | 3,
    texto: r.texto as string,
    contacto: (r.contacto as string | null) ?? null,
    estado: r.estado as EstadoFeedback,
    notasInternas: r.notas_internas as string,
    creadoEn: String(r.creado_en),
    actualizadoEn: String(r.actualizado_en),
  };
}

export async function getFeedback(comercioId: string): Promise<Feedback[]> {
  const rows = await sql`
    SELECT * FROM feedback WHERE comercio_id = ${comercioId} ORDER BY creado_en DESC
  `;
  return rows.map(mapFeedback);
}

export async function crearFeedback(
  comercioId: string,
  datos: { estrellas: 1 | 2 | 3; texto: string; contacto?: string | null },
): Promise<Feedback> {
  const rows = await sql`
    INSERT INTO feedback (comercio_id, estrellas, texto, contacto)
    VALUES (${comercioId}, ${datos.estrellas}, ${datos.texto}, ${datos.contacto ?? null})
    RETURNING *
  `;
  return mapFeedback(rows[0]);
}

export async function actualizarFeedback(
  id: number,
  datos: Partial<{ estado: EstadoFeedback; notasInternas: string }>,
): Promise<Feedback> {
  const rows = await sql`
    UPDATE feedback SET
      estado = COALESCE(${datos.estado ?? null}, estado),
      notas_internas = COALESCE(${datos.notasInternas ?? null}, notas_internas),
      actualizado_en = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error(`Feedback no encontrado: ${id}`);
  return mapFeedback(rows[0]);
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
  },
): Promise<ResenaCRM> {
  const rows = await sql`
    INSERT INTO resenas (comercio_id, autor, estrellas, texto, plataforma, fecha)
    VALUES (${comercioId}, ${datos.autor}, ${datos.estrellas}, ${datos.texto}, ${datos.plataforma}, ${datos.fecha})
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
  }>,
): Promise<ResenaCRM> {
  const rows = await sql`
    UPDATE resenas SET
      estado = COALESCE(${datos.estado ?? null}, estado),
      respuesta_sugerida = COALESCE(${datos.respuestaSugerida ?? null}, respuesta_sugerida),
      respuesta_publicada = COALESCE(${datos.respuestaPublicada ?? null}, respuesta_publicada),
      responsable = COALESCE(${datos.responsable ?? null}, responsable),
      notas = COALESCE(${datos.notas ?? null}, notas)
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

export async function toggleChecklistItem(
  comercioId: string,
  itemKey: string,
  hecho: boolean,
): Promise<void> {
  await sql`
    INSERT INTO checklist_seo (comercio_id, item_key, hecho)
    VALUES (${comercioId}, ${itemKey}, ${hecho})
    ON CONFLICT (comercio_id, item_key) DO UPDATE SET hecho = ${hecho}, actualizado_en = now()
  `;
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

export async function crearAudit(
  comercioId: string,
  datos: { pregunta: string; plataforma: PlataformaIA; aparece: boolean; competidoresMencionados?: string },
): Promise<AuditGEOResultado> {
  const rows = await sql`
    INSERT INTO audits_geo (comercio_id, pregunta, plataforma, aparece, competidores_mencionados)
    VALUES (${comercioId}, ${datos.pregunta}, ${datos.plataforma}, ${datos.aparece}, ${datos.competidoresMencionados ?? ""})
    RETURNING *
  `;
  return mapAudit(rows[0]);
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
  datos: Partial<{ nombre: string; rating: number | null; totalResenas: number | null }>,
): Promise<Competidor> {
  const rows = await sql`
    UPDATE competidores SET
      nombre = COALESCE(${datos.nombre ?? null}, nombre),
      rating = ${datos.rating === undefined ? sql`rating` : datos.rating},
      total_resenas = ${datos.totalResenas === undefined ? sql`total_resenas` : datos.totalResenas},
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
  const rows = await sql`SELECT capturas FROM prospectos WHERE id = ${id}`;
  if (rows.length === 0) return;
  const capturas = [...((rows[0].capturas as string[]) ?? []), ...nuevas];
  await sql`UPDATE prospectos SET capturas = ${sql.json(capturas)} WHERE id = ${id}`;
}

export async function eliminarCaptura(id: string, index: number): Promise<void> {
  const rows = await sql`SELECT capturas FROM prospectos WHERE id = ${id}`;
  if (rows.length === 0) return;
  const capturas = (rows[0].capturas as string[]) ?? [];
  capturas.splice(index, 1);
  await sql`UPDATE prospectos SET capturas = ${sql.json(capturas)} WHERE id = ${id}`;
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
