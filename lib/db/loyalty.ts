import "server-only";
import crypto from "node:crypto";
import { sql } from "../sql";
import type { ProgramaLoyalty } from "../types";
import type { TipoEventoLoyalty } from "../loyalty-antifraude";

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

// ---------- Identidad y membresía ----------

export interface Membresia {
  id: string;
  clienteFinalId: string;
  comercioId: string;
  googleObjectId: string;
  appleSerialNumber: string;
  estadoGoogle: "pendiente" | "emitido" | "error";
  estadoApple: "pendiente" | "emitido" | "error";
}

/** Da de alta un cliente final por teléfono, o devuelve el existente si ya
 * se registró antes (acá o en cualquier otro comercio — la identidad es
 * global). Upsert por `telefono` para no duplicar personas. */
export async function registrarClienteFinal(datos: {
  telefono: string;
  nombre?: string;
  email?: string;
}): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO clientes_finales (id, telefono, nombre, email)
    VALUES (${crypto.randomUUID()}, ${datos.telefono}, ${datos.nombre ?? ""}, ${datos.email ?? ""})
    ON CONFLICT (telefono) DO UPDATE SET
      nombre = CASE WHEN excluded.nombre <> '' THEN excluded.nombre ELSE clientes_finales.nombre END,
      email  = CASE WHEN excluded.email  <> '' THEN excluded.email  ELSE clientes_finales.email  END
    RETURNING id
  `;
  return { id: rows[0].id as string };
}

/** Devuelve la membresía de un cliente en un comercio, o la crea con el
 * movimiento de bienvenida ya cargado (idempotente: si ya existe, no
 * duplica ni el alta ni los puntos de bienvenida). */
export async function obtenerOCrearMembresia(
  clienteFinalId: string,
  comercioId: string
): Promise<Membresia> {
  const existente = await sql`
    SELECT id, cliente_final_id, comercio_id, google_object_id, apple_serial_number,
           estado_google, estado_apple
    FROM membresias
    WHERE cliente_final_id = ${clienteFinalId} AND comercio_id = ${comercioId}
  `;
  if (existente.length > 0) return mapearMembresia(existente[0]);

  const programa = await getProgramaLoyalty(comercioId);
  const membresiaId = crypto.randomUUID();
  const creada = await sql`
    INSERT INTO membresias (id, cliente_final_id, comercio_id)
    VALUES (${membresiaId}, ${clienteFinalId}, ${comercioId})
    ON CONFLICT (cliente_final_id, comercio_id) DO UPDATE SET comercio_id = excluded.comercio_id
    RETURNING id, cliente_final_id, comercio_id, google_object_id, apple_serial_number,
              estado_google, estado_apple
  `;
  const membresia = mapearMembresia(creada[0]);

  // Puntos de bienvenida — un solo movimiento, protegido por idem_clave
  // (si dos requests concurrentes llegan acá por la misma membresía nueva,
  // el segundo INSERT choca contra la UNIQUE y no duplica el saldo).
  if (programa && programa.puntosBienvenida > 0) {
    await registrarMovimiento({
      membresiaId: membresia.id,
      delta: programa.puntosBienvenida,
      motivo: "bienvenida",
      idemClave: `bienvenida:${membresia.id}`,
    });
  }
  return membresia;
}

function mapearMembresia(r: Record<string, unknown>): Membresia {
  return {
    id: r.id as string,
    clienteFinalId: r.cliente_final_id as string,
    comercioId: r.comercio_id as string,
    googleObjectId: r.google_object_id as string,
    appleSerialNumber: r.apple_serial_number as string,
    estadoGoogle: r.estado_google as Membresia["estadoGoogle"],
    estadoApple: r.estado_apple as Membresia["estadoApple"],
  };
}

// ---------- Ledger de puntos (append-only) ----------

/** Inserta un movimiento en el ledger y devuelve el saldo resultante.
 * `idemClave` es la defensa contra doble-submit: un mismo movimiento
 * reenviado (doble click, retry de red) no duplica puntos porque choca
 * contra el UNIQUE y no inserta una segunda fila — ON CONFLICT DO NOTHING
 * hace esto explícito en vez de dejar que la excepción se propague. */
export async function registrarMovimiento(datos: {
  membresiaId: string;
  delta: number;
  motivo: "bienvenida" | "mision" | "canje" | "ajuste_manual";
  idemClave: string;
  misionId?: string;
}): Promise<{ saldo: number; aplicado: boolean }> {
  const insertado = await sql`
    INSERT INTO movimientos_puntos (membresia_id, delta, motivo, mision_id, idem_clave)
    VALUES (${datos.membresiaId}, ${datos.delta}, ${datos.motivo}, ${datos.misionId ?? null}, ${datos.idemClave})
    ON CONFLICT (idem_clave) DO NOTHING
    RETURNING id
  `;
  const saldo = await calcularSaldo(datos.membresiaId);
  return { saldo, aplicado: insertado.length > 0 };
}

export async function calcularSaldo(membresiaId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(delta), 0) AS saldo FROM movimientos_puntos WHERE membresia_id = ${membresiaId}
  `;
  return Number(rows[0].saldo);
}

// ---------- Eventos ----------
// hashearIp y verificarCooldownTap viven en lib/loyalty-antifraude.ts (no
// acá) porque no tocan la base — separarlos los hace testeables sin
// DATABASE_URL configurada, igual que el resto de test/.

export async function registrarEventoLoyalty(datos: {
  comercioId: string;
  clienteFinalId?: string;
  tipo: TipoEventoLoyalty;
  detalle?: string;
  ipHash?: string;
}): Promise<void> {
  await sql`
    INSERT INTO eventos_loyalty (comercio_id, cliente_final_id, tipo, detalle, ip_hash)
    VALUES (${datos.comercioId}, ${datos.clienteFinalId ?? null}, ${datos.tipo}, ${datos.detalle ?? ""}, ${datos.ipHash ?? null})
  `;
}
