import "server-only";
import { sql } from "../sql";
import type { ProgramaLoyalty } from "../types";

// Capa de datos del módulo Loyalty. Vive en lib/db/ (no en lib/db.ts) porque
// el brief original ya anticipó este split — a diferencia de lib/types.ts,
// acá no hay colisión de convención: lib/db.ts sigue existiendo intacto,
// este archivo es aditivo puro. Mismo patrón que el resto del repo: SQL
// directo (sin ORM), mapeo explícito snake_case -> camelCase, prefijo `get`
// para lecturas (igual que getCliente/getClientes en lib/db.ts).

/** Lo mínimo para la landing de Loyalty: no usa getCliente() de lib/db.ts a
 * propósito — ese mapea el objeto Cliente completo (usado en todo el panel
 * de admin) y no expone tiene_loyalty todavía. Tocar ese mapper para A2 es
 * más superficie de la que hace falta; se hace en A7 (sección admin) si
 * hace falta ahí. Acá alcanza con una consulta chica y propia. */
export async function getComercioLoyalty(
  comercioId: string
): Promise<{ id: string; nombre: string; tieneLoyalty: boolean } | null> {
  const rows = await sql`
    SELECT id, nombre, tiene_loyalty FROM comercios WHERE id = ${comercioId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tieneLoyalty: Boolean(r.tiene_loyalty),
  };
}

/** Devuelve el programa de fidelización de un comercio, o null si nunca se
 * creó uno (comercio sin `tiene_loyalty`, o con el flag pero sin programa
 * inicializado todavía — eso lo resuelve A4 al dar de alta la primera vez). */
export async function getProgramaLoyalty(comercioId: string): Promise<ProgramaLoyalty | null> {
  const rows = await sql`
    SELECT comercio_id, google_class_id, apple_pass_type_id, puntos_bienvenida, activo
    FROM programas_loyalty
    WHERE comercio_id = ${comercioId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    comercioId: r.comercio_id as string,
    googleClassId: r.google_class_id as string,
    applePassTypeId: r.apple_pass_type_id as string,
    puntosBienvenida: Number(r.puntos_bienvenida),
    activo: Boolean(r.activo),
  };
}
