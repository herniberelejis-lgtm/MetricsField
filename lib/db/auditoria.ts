import "server-only";
import { sql } from "../sql";

// ---------- Auditoría ----------

export interface EntradaAuditoria {
  id: number;
  adminEmail: string;
  accion: string;
  detalle: string;
  creadoEn: string;
}

/** Registra una acción del panel. adminEmail viene null si quien actuó
 * entró con la contraseña compartida (sin identidad) — se guarda como
 * cadena vacía y la UI lo muestra como "equipo (sin identificar)". Nunca
 * tira si falla: la auditoría no debe romper la acción real que registra. */
export async function registrarAuditoria(
  adminEmail: string | null,
  accion: string,
  detalle = "",
): Promise<void> {
  try {
    await sql`
      INSERT INTO auditoria (admin_email, accion, detalle)
      VALUES (${adminEmail ?? ""}, ${accion}, ${detalle})
    `;
  } catch (err) {
    console.error("No se pudo registrar en auditoría:", err);
  }
}

export async function getAuditoria(limite = 200): Promise<EntradaAuditoria[]> {
  const rows = await sql`SELECT * FROM auditoria ORDER BY creado_en DESC LIMIT ${limite}`;
  return rows.map((r) => ({
    id: Number(r.id),
    adminEmail: r.admin_email as string,
    accion: r.accion as string,
    detalle: r.detalle as string,
    creadoEn: String(r.creado_en),
  }));
}
