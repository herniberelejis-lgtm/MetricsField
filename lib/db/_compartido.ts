import "server-only";
import { sql } from "../sql";
import { accessTokenDesdeRefresh } from "../google-oauth";
import { listarUbicaciones } from "../gbp";
import { descifrar } from "../crypto";
import { reportarFalla } from "../monitor";
import type {
  Cliente,
  EstadoCliente,
  FormatoNFC,
  MetricaMensual,
  Plan,
  Rubro,
  TonoMarca,
  VentaNFC,
  Zona,
} from "../types";

// Mappers y helpers internos compartidos por varios dominios de lib/db/.
// No se reexportan desde el barrel lib/db.ts — solo los importan los
// módulos de esta carpeta que los necesitan, para no duplicarlos.

// ---------- Mappers ----------

export function mapMetrica(r: Record<string, unknown>): MetricaMensual {
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

export function mapVenta(r: Record<string, unknown>): VentaNFC {
  return {
    formato: r.formato as FormatoNFC,
    cantidad: Number(r.cantidad),
    precioUnitario: Number(r.precio_unitario),
    fecha: fechaISO(r.fecha),
  };
}

export function fechaISO(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function mapClienteBase(
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
    comercioPadreId: (row.comercio_padre_id as string | null) ?? null,
  };
}

export async function ensambleCliente(row: Record<string, unknown>): Promise<Cliente> {
  const id = row.id as string;
  const [historico, ventasNFC] = await Promise.all([
    sql`SELECT * FROM metricas_mensuales WHERE comercio_id = ${id} ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc WHERE comercio_id = ${id} ORDER BY fecha ASC`,
  ]);
  return mapClienteBase(row, historico.map(mapMetrica), ventasNFC.map(mapVenta));
}

/** Saca saltos de línea y caracteres de control de una URL cargada a mano
 * (googleReviewUrl, urlDestino) antes de guardarla — un enter de más al
 * copiar el link (pasa seguido con Google Reviews) queda guardado en la
 * columna y después revienta `redirect()` en /t/[slug] con "Invalid
 * character in header content" al ponerlo en el header Location. La
 * defensa real vive en /t/[slug]/page.tsx (corre en cada tap, cubre datos
 * ya guardados de antes); esto es para no volver a guardar algo sucio. */
export function limpiarUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  // eslint-disable-next-line no-control-regex
  return url.replace(/[\x00-\x1f\x7f]/g, "").trim() as T;
}

export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ---------- Sync de Google: helpers compartidos ----------

// Syncs masivos del cron en lotes de a 5 en paralelo: secuencial era
// demasiado lento (moría por timeout con la lista creciendo) y todo junto
// castigaría la cuota de las APIs de Google. Un fallo en un comercio no
// corta el resto, pero queda logueado — sin esto los rechazos se tragaban
// y el cron reportaba conteos sanos con comercios sin sincronizar.
export const LOTE_SYNC = 5;

export async function sincronizarEnLotes<Id, T>(
  ids: Id[],
  fn: (id: Id) => Promise<T>,
): Promise<T[]> {
  const exitosos: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE_SYNC) {
    const lote = ids.slice(i, i + LOTE_SYNC);
    const resultados = await Promise.allSettled(lote.map(fn));
    resultados.forEach((r, j) => {
      if (r.status === "fulfilled") exitosos.push(r.value);
      else void reportarFalla("sync", r.reason, { comercio: String(lote[j]) });
    });
  }
  return exitosos;
}

export async function accessTokenGBPComercio(id: string): Promise<string | null> {
  const rows = await sql`SELECT google_refresh_token FROM comercios WHERE id = ${id}`;
  const refresh = rows[0]?.google_refresh_token as string | undefined;
  if (!refresh) return null;
  return accessTokenDesdeRefresh(descifrar(refresh));
}

/** Resuelve (y cachea en la fila del comercio) el resource name de su ficha
 * en Business Profile, matcheando por place_id contra las ubicaciones que
 * administra la cuenta conectada. Compartido por rendimiento y reseñas —
 * ambas APIs identifican la ficha de la misma forma. null si falta
 * cualquier pieza: sin place_id cargado, o la cuenta conectada no administra
 * esa ficha. */
export async function resolverLocationGBP(id: string, token: string): Promise<string | null> {
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
