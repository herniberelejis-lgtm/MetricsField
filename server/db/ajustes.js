const { sql } = require("../sql");

async function getAjuste(clave) {
  const rows = await sql`SELECT valor FROM ajustes WHERE clave = ${clave}`;
  return rows.length ? rows[0].valor : null;
}

async function setAjuste(clave, valor) {
  await sql`
    INSERT INTO ajustes (clave, valor) VALUES (${clave}, ${valor})
    ON CONFLICT (clave) DO UPDATE SET valor = ${valor}, actualizado_en = now()
  `;
}

module.exports = { getAjuste, setAjuste };
