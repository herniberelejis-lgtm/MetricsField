const { sql } = require("../sql");
const { hashearPin, pinCoincide } = require("../pin");
const { limpiarUrl } = require("../utils");

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

async function getDatosTap(slug) {
  const rows = await sql`
    SELECT l.id, l.destino, l.url_destino, l.activo,
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
      id: r.id,
      destino: r.destino,
      urlDestino: r.url_destino ?? null,
      activo: Boolean(r.activo),
      autogestionado: Boolean(r.autogestionado),
      nombreNegocio: r.nombre_negocio ?? "",
    },
    comercio: r.comercio_id
      ? {
          id: r.comercio_id,
          nombre: r.nombre,
          rubro: r.rubro,
          googleReviewUrl: r.google_review_url,
        }
      : null,
  };
}

async function getLink(linkId) {
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

async function registrarTap(linkId, userAgent) {
  await sql`INSERT INTO taps (link_id, user_agent) VALUES (${linkId}, ${userAgent})`;
}

async function activarAutogestion(slug, datos) {
  const { hash, salt } = hashearPin(datos.pin);
  const rows = await sql`
    UPDATE links_nfc SET
      autogestionado = TRUE,
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${limpiarUrl(datos.urlDestino)},
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

async function editarAutogestion(slug, pin, datos) {
  const rows = await sql`
    SELECT pin_hash, pin_salt FROM links_nfc
    WHERE id = ${slug} AND comercio_id IS NULL AND autogestionado = TRUE
  `;
  if (rows.length === 0) throw new Error("Pieza no encontrada o todavía no fue activada.");
  const pinHash = rows[0].pin_hash;
  const pinSalt = rows[0].pin_salt;
  if (!pinHash || !pinSalt || !pinCoincide(pin, pinHash, pinSalt)) {
    throw new Error("PIN incorrecto.");
  }

  const actualizado = await sql`
    UPDATE links_nfc SET
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${limpiarUrl(datos.urlDestino)}
    WHERE id = ${slug}
    RETURNING id
  `;
  if (actualizado.length === 0) throw new Error(`Pieza no encontrada: ${slug}`);
  const l = await getLink(slug);
  if (!l) throw new Error(`Pieza no encontrada: ${slug}`);
  return l;
}

module.exports = {
  getDatosTap,
  getLink,
  registrarTap,
  activarAutogestion,
  editarAutogestion,
};
