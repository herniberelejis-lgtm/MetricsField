const { sql } = require("../sql");
const { limpiarUrl } = require("../utils");
const { cifrar } = require("../crypto");
const { getLink } = require("./tap");

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

async function actualizarLink(linkId, datos) {
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
  return mapLink({ ...l, taps: l.taps });
}

async function getTapsPorDiaPorSoporte(comercioId, dias = 14) {
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
  return rows.map((r) => ({ fecha: r.fecha, nfc: Number(r.nfc), qr: Number(r.qr) }));
}

async function getBenchmarkMensual(comercioId) {
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

  const propiaPorMes = new Map();
  for (const r of propias) {
    propiaPorMes.set(r.mes, {
      resenas: Number(r.resenas_total),
      rating: Number(r.rating_promedio),
    });
  }

  const porMes = new Map();
  for (const r of snaps) {
    const mes = r.mes;
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
      nombre: r.nombre,
      rating: r.rating === null ? null : Number(r.rating),
      totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    });
  }

  return [...porMes.values()];
}

async function actualizarAutomatizacionResenas(comercioId, datos) {
  await sql`
    UPDATE comercios SET
      auto_responder_positivas = ${datos.autoResponderPositivas},
      auto_responder_umbral = ${datos.autoResponderUmbral}
    WHERE id = ${comercioId}
  `;
}

async function desconectarGoogleComercio(id) {
  await sql`
    UPDATE comercios SET google_refresh_token = '', google_location = '', google_conectado_en = NULL
    WHERE id = ${id}
  `;
}

async function guardarTokenGoogleComercio(id, refreshToken) {
  await sql`
    UPDATE comercios SET google_refresh_token = ${cifrar(refreshToken)}, google_conectado_en = now()
    WHERE id = ${id}
  `;
}

module.exports = {
  getLinks,
  actualizarLink,
  getTapsPorDiaPorSoporte,
  getBenchmarkMensual,
  actualizarAutomatizacionResenas,
  desconectarGoogleComercio,
  guardarTokenGoogleComercio,
};
