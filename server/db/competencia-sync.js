const { sincronizarCompetidor } = require("./competencia");

async function sincronizarCompetidoresTodos() {
  const { sql } = require("../sql");
  const { sincronizarEnLotes } = require("./sync-shared");
  const rows = await sql`
    SELECT id FROM competidores WHERE google_place_id IS NOT NULL AND google_place_id != ''
  `;
  const ids = rows.map((r) => Number(r.id));
  const resultados = await sincronizarEnLotes(ids, sincronizarCompetidor);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

function mesActual() {
  return new Date().toISOString().slice(0, 7);
}

async function snapshotCompetenciaMensual(mes = mesActual()) {
  const { sql } = require("../sql");
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

module.exports = {
  sincronizarCompetidoresTodos,
  snapshotCompetenciaMensual,
};
