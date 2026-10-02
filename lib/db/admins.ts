import "server-only";
import { sql } from "../sql";

// ---------- Administradores (login por Google, allowlist del equipo) ----------

export interface Admin {
  email: string;
  nombre: string;
  creadoEn: string;
}

function mapAdmin(r: Record<string, unknown>): Admin {
  return {
    email: r.email as string,
    nombre: r.nombre as string,
    creadoEn: String(r.creado_en),
  };
}

export async function getAdmins(): Promise<Admin[]> {
  const rows = await sql`SELECT * FROM admins ORDER BY creado_en ASC`;
  return rows.map(mapAdmin);
}

export async function esAdminPermitido(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM admins WHERE lower(email) = lower(${email})`;
  return rows.length > 0;
}

export async function agregarAdmin(email: string, nombre: string): Promise<void> {
  const limpio = email.trim().toLowerCase();
  if (!limpio) throw new Error("Falta el email.");
  await sql`
    INSERT INTO admins (email, nombre) VALUES (${limpio}, ${nombre})
    ON CONFLICT (email) DO UPDATE SET nombre = ${nombre}
  `;
}

/** Con el panel solo por Google, borrar al último admin deja a todo el
 * equipo afuera (y sin forma de volver a entrar salvo tocando la base a
 * mano). Devuelve false si no se borró porque era el último. */
export async function eliminarAdmin(email: string): Promise<boolean> {
  const borrados = await sql`
    DELETE FROM admins
    WHERE lower(email) = lower(${email}) AND (SELECT count(*) FROM admins) > 1
    RETURNING email
  `;
  if (borrados.length > 0) return true;
  return !(await esAdminPermitido(email)); // no existía: nada que borrar, no es error
}
