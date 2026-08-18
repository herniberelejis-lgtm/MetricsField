const { sql } = require("../sql");
const { fechaISO } = require("../utils");

function mapResena(r) {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id,
    autor: r.autor,
    estrellas: Number(r.estrellas),
    texto: r.texto,
    plataforma: r.plataforma,
    estado: r.estado,
    respuestaSugerida: r.respuesta_sugerida ?? null,
    respuestaPublicada: Boolean(r.respuesta_publicada),
    responsable: r.responsable ?? null,
    notas: r.notas,
    fecha: fechaISO(r.fecha),
    origenGoogleId: r.origen_google_id ?? null,
    publicadaAutomaticamente: Boolean(r.publicada_automaticamente),
    creadoEn: r.creado_en ? new Date(r.creado_en).toISOString() : null,
  };
}

async function getResenas(comercioId) {
  const rows = await sql`
    SELECT * FROM resenas WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapResena);
}

async function crearResena(comercioId, datos, origenGoogleId = null) {
  const rows = await sql`
    INSERT INTO resenas (comercio_id, autor, estrellas, texto, plataforma, fecha, origen_google_id, creado_en)
    VALUES (
      ${comercioId}, ${datos.autor}, ${datos.estrellas}, ${datos.texto}, ${datos.plataforma},
      ${datos.fecha}, ${origenGoogleId}, ${datos.creadoEn ?? new Date().toISOString()}
    )
    RETURNING *
  `;
  return mapResena(rows[0]);
}

async function actualizarResena(id, datos) {
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

module.exports = { getResenas, crearResena, actualizarResena, mapResena };
