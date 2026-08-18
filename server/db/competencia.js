const { sql } = require("../sql");
const { fetchGooglePlaceStats } = require("../places");

function mapCompetidor(r) {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id,
    nombre: r.nombre,
    rating: r.rating === null ? null : Number(r.rating),
    totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    googlePlaceId: r.google_place_id ?? null,
    actualizadoEn: String(r.actualizado_en),
  };
}

async function getCompetidores(comercioId) {
  const rows = await sql`
    SELECT * FROM competidores WHERE comercio_id = ${comercioId} ORDER BY rating DESC NULLS LAST
  `;
  return rows.map(mapCompetidor);
}

async function crearCompetidor(comercioId, datos) {
  const rows = await sql`
    INSERT INTO competidores (comercio_id, nombre, rating, total_resenas, google_place_id)
    VALUES (${comercioId}, ${datos.nombre}, ${datos.rating ?? null}, ${datos.totalResenas ?? null}, ${datos.googlePlaceId ?? null})
    RETURNING *
  `;
  return mapCompetidor(rows[0]);
}

async function actualizarCompetidor(id, datos) {
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

async function eliminarCompetidor(id) {
  await sql`DELETE FROM competidores WHERE id = ${id}`;
}

async function sincronizarCompetidor(id) {
  const rows = await sql`SELECT google_place_id FROM competidores WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id;
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

module.exports = {
  getCompetidores,
  crearCompetidor,
  actualizarCompetidor,
  eliminarCompetidor,
  sincronizarCompetidor,
};
