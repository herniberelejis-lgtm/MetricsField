const { sql } = require("../sql");

async function esAdminPermitido(email) {
  const rows = await sql`SELECT 1 FROM admins WHERE lower(email) = lower(${email})`;
  return rows.length > 0;
}

async function getAdmins() {
  const rows = await sql`SELECT * FROM admins ORDER BY creado_en ASC`;
  return rows.map((r) => ({
    email: r.email,
    nombre: r.nombre,
    creadoEn: String(r.creado_en),
  }));
}

async function agregarAdmin(email, nombre) {
  const limpio = email.trim().toLowerCase();
  if (!limpio) throw new Error("Falta el email.");
  await sql`
    INSERT INTO admins (email, nombre) VALUES (${limpio}, ${nombre})
    ON CONFLICT (email) DO UPDATE SET nombre = ${nombre}
  `;
}

async function eliminarAdmin(email) {
  await sql`DELETE FROM admins WHERE lower(email) = lower(${email})`;
}

module.exports = { esAdminPermitido, getAdmins, agregarAdmin, eliminarAdmin };
