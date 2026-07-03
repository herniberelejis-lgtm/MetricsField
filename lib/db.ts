import "server-only";
import crypto from "node:crypto";
import { sql } from "./sql";
import type {
  AuditGEOResultado,
  ChecklistItemSEO,
  Cliente,
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
    posicionMaps: Number(r.posicion_maps),
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
  datos: Omit<Cliente, "id" | "codigoAcceso" | "ventasNFC" | "historico">,
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
    INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto, google_review_url, busqueda_clave, fee, tono_marca, fecha_alta)
    VALUES (${id}, ${codigoAcceso}, ${datos.nombre}, ${datos.rubro}, ${datos.zona}, ${datos.plan}, ${datos.estado}, ${datos.contacto}, ${datos.googleReviewUrl}, ${datos.busquedaClave}, ${datos.fee}, ${datos.tonoMarca ?? "cercano"}, ${datos.fechaAlta})
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
      tono_marca = ${nuevo.tonoMarca}
    WHERE id = ${id}
  `;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

export async function guardarMetrica(id: string, m: MetricaMensual): Promise<Cliente> {
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, posicion_maps, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity)
    VALUES (${id}, ${m.mes}, ${m.resenasNuevas}, ${m.resenasTotal}, ${m.ratingPromedio}, ${m.posicionMaps}, ${m.visitasPerfil}, ${m.llamadas}, ${m.clicsComoLlegar}, ${m.citasChatGPT ?? null}, ${m.citasCopilot ?? null}, ${m.citasPerplexity ?? null})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio,
      posicion_maps = EXCLUDED.posicion_maps,
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
    comercioId: r.comercio_id as string,
    etiqueta: r.etiqueta as string,
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
  datos: { etiqueta: string; destino: DestinoLink; urlDestino?: string | null },
): Promise<LinkNFC> {
  let id = slugLink(datos.etiqueta);
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM links_nfc WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugLink(datos.etiqueta)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, destino, url_destino)
    VALUES (${id}, ${comercioId}, ${datos.etiqueta}, ${datos.destino}, ${datos.urlDestino ?? null})
  `;
  const l = await getLink(id);
  if (!l) throw new Error("No se pudo crear el link.");
  return l;
}

export async function actualizarLink(
  linkId: string,
  datos: Partial<{ etiqueta: string; destino: DestinoLink; urlDestino: string | null; activo: boolean }>,
): Promise<LinkNFC> {
  const actual = await getLink(linkId);
  if (!actual) throw new Error(`Link no encontrado: ${linkId}`);
  const nuevo = { ...actual, ...datos };
  await sql`
    UPDATE links_nfc SET
      etiqueta = ${nuevo.etiqueta},
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
