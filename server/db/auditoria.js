const { sql } = require("../sql");

async function registrarAuditoria(adminEmail, accion, detalle = "") {
  try {
    await sql`
      INSERT INTO auditoria (admin_email, accion, detalle)
      VALUES (${adminEmail ?? ""}, ${accion}, ${detalle})
    `;
  } catch (err) {
    console.error("No se pudo registrar en auditoría:", err);
  }
}

async function getAuditoria(limite = 200) {
  const rows = await sql`SELECT * FROM auditoria ORDER BY creado_en DESC LIMIT ${limite}`;
  return rows.map((r) => ({
    id: Number(r.id),
    adminEmail: r.admin_email,
    accion: r.accion,
    detalle: r.detalle,
    creadoEn: String(r.creado_en),
  }));
}

module.exports = { registrarAuditoria, getAuditoria };
