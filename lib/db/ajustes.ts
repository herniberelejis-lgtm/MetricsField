import "server-only";
import { sql } from "../sql";

// ---------- Ajustes (clave/valor de la agencia) ----------

export async function getAjuste(clave: string): Promise<string | null> {
  const rows = await sql`SELECT valor FROM ajustes WHERE clave = ${clave}`;
  return rows.length ? (rows[0].valor as string) : null;
}

export async function setAjuste(clave: string, valor: string): Promise<void> {
  await sql`
    INSERT INTO ajustes (clave, valor) VALUES (${clave}, ${valor})
    ON CONFLICT (clave) DO UPDATE SET valor = ${valor}, actualizado_en = now()
  `;
}

/** Todos los ajustes cuya clave empieza con `prefijo` (clave sin el prefijo). */
export async function getAjustesConPrefijo(prefijo: string): Promise<Map<string, string>> {
  const rows = await sql`SELECT clave, valor FROM ajustes WHERE clave LIKE ${prefijo.replace(/[%_\\]/g, "\\$&") + "%"}`;
  return new Map(rows.map((r) => [(r.clave as string).slice(prefijo.length), r.valor as string]));
}
