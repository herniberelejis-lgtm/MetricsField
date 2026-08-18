const crypto = require("node:crypto");
const { sql } = require("../sql");
const { limpiarUrl, slugify } = require("../utils");

const TZ_COMERCIO = "America/Argentina/Cordoba";

function mapLink(r) {
  return {
    id: r.id,
    comercioId: r.comercio_id ?? null,
    etiqueta: r.etiqueta,
    tipo: r.tipo ?? "nfc",
    lote: r.lote ?? "",
    destino: r.destino,
    urlDestino: r.url_destino ?? null,
    activo: Boolean(r.activo),
    autogestionado: Boolean(r.autogestionado),
    nombreNegocio: r.nombre_negocio ?? "",
    nombreEmpleado: r.nombre_empleado ?? "",
    creadoEn: String(r.creado_en),
    taps: Number(r.taps ?? 0),
  };
}

async function getLinks(comercioId) {
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

async function getLink(linkId) {
  const rows = await sql`
    SELECT l.*, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN taps t ON t.link_id = l.id
    WHERE l.id = ${linkId}
    GROUP BY l.id
  `;
  if (rows.length === 0) return null;
  return mapLink(rows[0]);
}

function slugLink(etiqueta) {
  return slugify(etiqueta).slice(0, 24) || "link";
}

async function crearLink(comercioId, datos) {
  let id = slugLink(datos.etiqueta);
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM links_nfc WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugLink(datos.etiqueta)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, destino, url_destino, nombre_empleado)
    VALUES (
      ${id}, ${comercioId}, ${datos.etiqueta}, ${datos.tipo ?? "nfc"}, ${datos.destino},
      ${limpiarUrl(datos.urlDestino) ?? null}, ${datos.nombreEmpleado ?? ""}
    )
  `;
  const l = await getLink(id);
  if (!l) throw new Error("No se pudo crear el link.");
  return l;
}

async function actualizarLinkAdmin(linkId, datos) {
  const rows = await sql`
    UPDATE links_nfc SET
      etiqueta = ${datos.etiqueta === undefined ? sql`etiqueta` : datos.etiqueta},
      tipo = ${datos.tipo === undefined ? sql`tipo` : datos.tipo},
      destino = ${datos.destino === undefined ? sql`destino` : datos.destino},
      url_destino = ${datos.urlDestino === undefined ? sql`url_destino` : limpiarUrl(datos.urlDestino)},
      activo = ${datos.activo === undefined ? sql`activo` : datos.activo},
      nombre_empleado = ${datos.nombreEmpleado === undefined ? sql`nombre_empleado` : datos.nombreEmpleado}
    WHERE id = ${linkId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Link no encontrado: ${linkId}`);
  const l = await getLink(linkId);
  if (!l) throw new Error(`Link no encontrado: ${linkId}`);
  return l;
}

async function eliminarLink(linkId) {
  await sql`DELETE FROM links_nfc WHERE id = ${linkId}`;
}

async function getTapsPorDia(comercioId, dias = 14) {
  const rows = await sql`
    SELECT to_char((t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date, 'YYYY-MM-DD') AS fecha, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha, taps: Number(r.taps) }));
}

async function getTapsPorHora(comercioId, fecha) {
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

module.exports = {
  getLinks,
  getLink,
  crearLink,
  actualizarLinkAdmin,
  eliminarLink,
  getTapsPorDia,
  getTapsPorHora,
};
