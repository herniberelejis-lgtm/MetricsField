const { sql } = require("../sql");
const { fechaISO } = require("../utils");

function mapAudit(r) {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id,
    fecha: fechaISO(r.fecha),
    pregunta: r.pregunta,
    plataforma: r.plataforma,
    aparece: Boolean(r.aparece),
    competidoresMencionados: r.competidores_mencionados,
  };
}

async function getAudits(comercioId) {
  const rows = await sql`
    SELECT * FROM audits_geo WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapAudit);
}

module.exports = { getAudits };
