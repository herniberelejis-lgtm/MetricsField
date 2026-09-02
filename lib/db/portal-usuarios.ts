import "server-only";
import { sql } from "../sql";

// ---------- Usuarios del portal (login por Google, allowlist por comercio) ----------
//
// Siempre contra la cuenta raíz — igual que codigo_acceso, una sucursal
// nunca tiene su propia fila acá (ver resolverCuenta en clientes.ts).

export interface UsuarioPortal {
  email: string;
  nombre: string;
  creadoEn: string;
}

function mapUsuarioPortal(r: Record<string, unknown>): UsuarioPortal {
  return {
    email: r.email as string,
    nombre: r.nombre as string,
    creadoEn: String(r.creado_en),
  };
}

export async function getUsuariosPortal(comercioId: string): Promise<UsuarioPortal[]> {
  const rows = await sql`
    SELECT * FROM portal_usuarios WHERE comercio_id = ${comercioId} ORDER BY creado_en ASC
  `;
  return rows.map(mapUsuarioPortal);
}

/** true si este comercio exige login con Google para ver su portal — apenas
 * tiene un email cargado. Sin ninguno, el portal sigue abierto solo con el
 * código (comportamiento de siempre). */
export async function portalRequiereLoginGoogle(comercioId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM portal_usuarios WHERE comercio_id = ${comercioId} LIMIT 1`;
  return rows.length > 0;
}

export async function esEmailAutorizadoPortal(comercioId: string, email: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM portal_usuarios WHERE comercio_id = ${comercioId} AND lower(email) = lower(${email})
  `;
  return rows.length > 0;
}

export async function agregarUsuarioPortal(
  comercioId: string,
  email: string,
  nombre: string,
): Promise<void> {
  const limpio = email.trim().toLowerCase();
  if (!limpio) throw new Error("Falta el email.");
  await sql`
    INSERT INTO portal_usuarios (comercio_id, email, nombre) VALUES (${comercioId}, ${limpio}, ${nombre})
    ON CONFLICT (comercio_id, email) DO UPDATE SET nombre = ${nombre}
  `;
}

export async function quitarUsuarioPortal(comercioId: string, email: string): Promise<void> {
  await sql`
    DELETE FROM portal_usuarios WHERE comercio_id = ${comercioId} AND lower(email) = lower(${email})
  `;
}
