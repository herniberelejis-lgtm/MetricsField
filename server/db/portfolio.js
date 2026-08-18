const { sql } = require("../sql");

const TZ_COMERCIO = "America/Argentina/Cordoba";

async function getResenasResumenPortfolio(desde, hasta) {
  const rows = await sql`
    SELECT r.estrellas, COUNT(*)::int AS n
    FROM resenas r
    JOIN comercios c ON c.id = r.comercio_id
    WHERE c.estado = 'activo' AND r.fecha BETWEEN ${desde}::date AND ${hasta}::date
    GROUP BY r.estrellas
  `;
  const porEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let negativas = 0;
  for (const r of rows) {
    const estrellas = Number(r.estrellas);
    const n = Number(r.n);
    porEstrellas[estrellas] = n;
    total += n;
    if (estrellas <= 3) negativas += n;
  }
  return { total, negativas, porEstrellas };
}

async function getTapsResumenPortfolio(desde, hasta) {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE l.tipo = 'nfc')::int AS nfc,
      COUNT(*) FILTER (WHERE l.tipo IN ('qr', 'ambos'))::int AS qr
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    JOIN comercios c ON c.id = l.comercio_id
    WHERE c.estado = 'activo'
      AND (t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date BETWEEN ${desde}::date AND ${hasta}::date
  `;
  return { nfc: Number(rows[0]?.nfc ?? 0), qr: Number(rows[0]?.qr ?? 0) };
}

async function getVisitasPerfilPortfolio(mesDesde, mesHasta) {
  const rows = await sql`
    SELECT c.id AS comercio_id, c.nombre, COALESCE(SUM(m.visitas_perfil), 0)::int AS visitas
    FROM comercios c
    LEFT JOIN metricas_mensuales m
      ON m.comercio_id = c.id AND m.mes BETWEEN ${mesDesde} AND ${mesHasta}
    WHERE c.estado = 'activo'
    GROUP BY c.id, c.nombre
    ORDER BY visitas DESC, c.nombre ASC
  `;
  const porCliente = rows.map((r) => ({
    comercioId: r.comercio_id,
    nombre: r.nombre,
    visitas: Number(r.visitas),
  }));
  const total = porCliente.reduce((acc, r) => acc + r.visitas, 0);
  return { total, porCliente };
}

module.exports = {
  getResenasResumenPortfolio,
  getTapsResumenPortfolio,
  getVisitasPerfilPortfolio,
};
