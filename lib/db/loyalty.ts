import "server-only";
import { sql } from "../sql";
import { sqlLoyalty } from "../sql-loyalty";
import { hashToken } from "../loyalty/identidad";
import { claveIdempotenciaVisita } from "../loyalty/cooldown";

export { claveIdempotenciaVisita };

// Capa de datos del módulo Loyalty — reescrita completa (L3, motor de
// puntos). Ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §5 y §6 para el
// razonamiento de cada decisión. El bug que esto corrige: la versión
// anterior insertaba el movimiento y RECIÉN DESPUÉS sumaba el saldo, en
// dos sentencias sin transacción — dos canjes simultáneos podían leer el
// mismo saldo, los dos ver fondos, los dos descontar, dejando saldo
// negativo. Acá el saldo se actualiza y se audita en una sola transacción
// con un UPDATE condicional que hace de candado.

export type Motivo = "bienvenida" | "visita" | "mision" | "canje" | "ajuste_manual";
export type TipoEventoLoyalty =
  | "tap"
  | "registro"
  | "wallet_guardada"
  | "visita"
  | "canje_pedido"
  | "canje_confirmado"
  | "canje_vencido"
  | "cooldown_bloqueado";
export type Plataforma = "android" | "ios" | "otro";

// ---------- Consulta pública: entitlement y programa ----------
// Estas dos leen `public.comercios` (rol admin, sql de lib/sql.ts) y
// `loyalty.programas` (rol app_loyalty, sqlLoyalty) respectivamente — es
// la única lectura cruzada entre los dos esquemas en todo este archivo,
// y es de solo lectura sobre columnas puntuales, coherente con el GRANT
// acotado de db/migrations/013_loyalty_rol.sql.

/** Lo mínimo para el router del tap y la landing pública: si el comercio
 * existe y tiene el entitlement de Loyalty. No expone nada más de
 * `comercios` — el resto del panel de admin sigue leyendo por su propio
 * mapper en lib/db.ts, sin tocar este archivo. */
export async function getComercioLoyalty(
  comercioId: string,
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

export interface Programa {
  id: string;
  cuentaId: string;
  codigoPublico: string;
  puntosBienvenida: number;
  puntosPorVisita: number;
  activo: boolean;
}

/** El programa de fidelización de una CUENTA (nunca de una sucursal —
 * ver §2 del documento de arquitectura). null si el comercio tiene el
 * entitlement pero el programa todavía no se inicializó (alta pendiente,
 * L4). */
export async function getProgramaPorCuenta(cuentaId: string): Promise<Programa | null> {
  const rows = await sqlLoyalty`
    SELECT id, cuenta_id, codigo_publico, puntos_bienvenida, puntos_por_visita, activo
    FROM loyalty.programas
    WHERE cuenta_id = ${cuentaId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    cuentaId: r.cuenta_id as string,
    codigoPublico: r.codigo_publico as string,
    puntosBienvenida: Number(r.puntos_bienvenida),
    puntosPorVisita: Number(r.puntos_por_visita),
    activo: Boolean(r.activo),
  };
}

/** El programa por su segmento público (`/l/<codigoPublico>`) — lo que
 * realmente usa la landing, a diferencia del router del tap (que ya
 * conoce el `comercio.id` y busca por getProgramaPorCuenta). */
export async function getProgramaPorCodigoPublico(codigoPublico: string): Promise<Programa | null> {
  const rows = await sqlLoyalty`
    SELECT id, cuenta_id, codigo_publico, puntos_bienvenida, puntos_por_visita, activo
    FROM loyalty.programas
    WHERE codigo_publico = ${codigoPublico}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    cuentaId: r.cuenta_id as string,
    codigoPublico: r.codigo_publico as string,
    puntosBienvenida: Number(r.puntos_bienvenida),
    puntosPorVisita: Number(r.puntos_por_visita),
    activo: Boolean(r.activo),
  };
}

/** El `UPDATE ... AND saldo + delta >= 0` de registrarMovimiento no
 * afectó ninguna fila: o la membresía no existe, o no le alcanzan los
 * puntos para este movimiento. */
export class SaldoInsuficiente extends Error {
  constructor(membresiaId: string) {
    super(`Saldo insuficiente (o membresía inexistente) para aplicar el movimiento sobre ${membresiaId}`);
    this.name = "SaldoInsuficiente";
  }
}

/** El `idem_clave` ya existía: este movimiento (o el cooldown que
 * codifica) ya se había aplicado antes. NO es un error para quien llama
 * — es la señal de "esto ya estaba hecho", ver registrarMovimiento. */
export class MovimientoDuplicado extends Error {
  constructor(idemClave: string) {
    super(`El movimiento con idem_clave "${idemClave}" ya fue aplicado`);
    this.name = "MovimientoDuplicado";
  }
}

export interface ResultadoMovimiento {
  saldo: number;
  /** false = esta llamada NO aplicó nada porque el movimiento (o la
   * ventana de cooldown que representa) ya estaba aplicado. El saldo
   * devuelto sigue siendo el real y actual — tratar como éxito, no como
   * error: quien llama no debe reintentar ni alertar por esto. */
  aplicado: boolean;
}

/** Inserta un movimiento en el ledger append-only y actualiza
 * `membresias.saldo` en la MISMA transacción. El `UPDATE ... WHERE saldo
 * + delta >= 0` hace de candado: bloquea la fila y, si el delta deja el
 * saldo negativo, no actualiza nada — no hace falta un SELECT previo
 * para "chequear" el saldo, eso es exactamente el read-modify-write sin
 * lock que causaba el bug. `idem_clave` decide si el movimiento es nuevo
 * o un reintento: en ese segundo caso la transacción se aborta entera
 * (incluido el UPDATE del saldo, que se revierte solo) y se informa el
 * saldo real con una lectura aparte — más cara, pero es el camino raro. */
export async function registrarMovimiento(datos: {
  membresiaId: string;
  delta: number;
  motivo: Motivo;
  idemClave: string;
  actor?: string;
}): Promise<ResultadoMovimiento> {
  try {
    return await sqlLoyalty.begin(async (tx) => {
      const filas = await tx`
        UPDATE loyalty.membresias
           SET saldo = saldo + ${datos.delta}
         WHERE id = ${datos.membresiaId}
           AND saldo + ${datos.delta} >= 0
        RETURNING saldo
      `;
      if (filas.length === 0) throw new SaldoInsuficiente(datos.membresiaId);

      const mov = await tx`
        INSERT INTO loyalty.movimientos (membresia_id, delta, saldo_despues, motivo, idem_clave, actor)
        VALUES (
          ${datos.membresiaId}, ${datos.delta}, ${filas[0].saldo as number},
          ${datos.motivo}, ${datos.idemClave}, ${datos.actor ?? ""}
        )
        ON CONFLICT (idem_clave) DO NOTHING
        RETURNING id
      `;
      if (mov.length === 0) throw new MovimientoDuplicado(datos.idemClave);

      return { saldo: Number(filas[0].saldo), aplicado: true };
    });
  } catch (error) {
    if (error instanceof MovimientoDuplicado) {
      const actual = await sqlLoyalty`SELECT saldo FROM loyalty.membresias WHERE id = ${datos.membresiaId}`;
      if (actual.length === 0) throw new Error(`Membresía ${datos.membresiaId} no existe`);
      return { saldo: Number(actual[0].saldo), aplicado: false };
    }
    throw error;
  }
}

export async function obtenerSaldo(membresiaId: string): Promise<number> {
  const filas = await sqlLoyalty`SELECT saldo FROM loyalty.membresias WHERE id = ${membresiaId}`;
  if (filas.length === 0) throw new Error(`Membresía ${membresiaId} no existe`);
  return Number(filas[0].saldo);
}

// ---------- Cooldown de visitas, derivado del ledger (sin Redis) ----------
// claveIdempotenciaVisita vive en lib/loyalty/cooldown.ts (sin acceso a la
// base) y se reexporta arriba — ver el comentario de ese archivo.

/** Registra una visita repetida (tap fuera del registro inicial). Si la
 * membresía ya sumó una visita en las últimas 20h, `aplicado` vuelve
 * `false` y NO hay que mostrar error — es el cooldown funcionando, se
 * muestra "ya sumaste tu sello hoy". `puntosPorVisita` lo resuelve quien
 * llama desde `programas.puntos_por_visita` (esta función no hace el
 * join: no le corresponde, mantiene una sola responsabilidad). */
export async function registrarVisita(membresiaId: string, puntosPorVisita: number): Promise<ResultadoMovimiento> {
  return registrarMovimiento({
    membresiaId,
    delta: puntosPorVisita,
    motivo: "visita",
    idemClave: claveIdempotenciaVisita(membresiaId),
  });
}

// ---------- Identidad: cliente final y membresía ----------

export interface Cliente {
  id: string;
  programaId: string;
}

/** Da de alta (o actualiza) un cliente final por teléfono, DENTRO de un
 * programa puntual — la identidad es por programa, nunca global entre
 * comercios (ver §2 del documento de arquitectura). Idempotente por
 * (programa_id, telefono_hmac): volver a registrar el mismo teléfono en
 * el mismo programa actualiza nombre/teléfono cifrados y conserva el
 * email existente si esta vez no se pasó uno nuevo. */
export async function upsertCliente(datos: {
  programaId: string;
  telefonoHmac: Buffer;
  telefonoCifrado: Buffer;
  nombreCifrado: Buffer;
  emailCifrado?: Buffer;
}): Promise<Cliente> {
  const filas = await sqlLoyalty`
    INSERT INTO loyalty.clientes (programa_id, telefono_hmac, telefono_cif, nombre_cif, email_cif)
    VALUES (
      ${datos.programaId}, ${datos.telefonoHmac}, ${datos.telefonoCifrado},
      ${datos.nombreCifrado}, ${datos.emailCifrado ?? null}
    )
    ON CONFLICT (programa_id, telefono_hmac) DO UPDATE SET
      telefono_cif = excluded.telefono_cif,
      nombre_cif   = excluded.nombre_cif,
      email_cif    = COALESCE(excluded.email_cif, loyalty.clientes.email_cif)
    RETURNING id, programa_id
  `;
  return { id: filas[0].id as string, programaId: filas[0].programa_id as string };
}

export interface Membresia {
  id: string;
  clienteId: string;
  programaId: string;
  saldo: number;
  /** true si ESTA llamada creó la membresía — quien llama debe acreditar
   * los puntos de bienvenida solo en ese caso (ver más abajo). false si
   * ya existía y esto fue una RECUPERACIÓN: el cliente perdió su cookie o
   * cambió de dispositivo y volvió a registrarse con el mismo teléfono.
   * El token viejo queda invalidado (deseable si el dispositivo perdido
   * no era de confianza) y el saldo/las visitas se conservan intactos. */
  esNueva: boolean;
}

/** Obtiene la membresía de un cliente en un programa, o la crea con un
 * token nuevo. `tokenNuevo` lo genera quien llama (generarToken() en
 * lib/loyalty/identidad.ts) — acá solo se guarda su hash. El INSERT con
 * `ON CONFLICT ... DO NOTHING` primero, y el UPDATE condicional después,
 * evitan una condición de carrera entre dos registros simultáneos del
 * mismo cliente sin depender de columnas de sistema de Postgres. */
export async function obtenerOCrearMembresia(
  clienteId: string,
  programaId: string,
  tokenNuevo: string,
): Promise<Membresia> {
  const tokenHash = hashToken(tokenNuevo);

  return sqlLoyalty.begin(async (tx) => {
    const creada = await tx`
      INSERT INTO loyalty.membresias (cliente_id, programa_id, token_hash)
      VALUES (${clienteId}, ${programaId}, ${tokenHash})
      ON CONFLICT (cliente_id, programa_id) DO NOTHING
      RETURNING id, cliente_id, programa_id, saldo
    `;
    if (creada.length > 0) {
      return mapearMembresia(creada[0], true);
    }

    const existente = await tx`
      UPDATE loyalty.membresias
         SET token_hash = ${tokenHash}
       WHERE cliente_id = ${clienteId} AND programa_id = ${programaId}
      RETURNING id, cliente_id, programa_id, saldo
    `;
    return mapearMembresia(existente[0], false);
  });
}

function mapearMembresia(r: Record<string, unknown>, esNueva: boolean): Membresia {
  return {
    id: r.id as string,
    clienteId: r.cliente_id as string,
    programaId: r.programa_id as string,
    saldo: Number(r.saldo),
    esNueva,
  };
}

// ---------- Eventos ----------

export async function registrarEvento(datos: {
  programaId: string;
  membresiaId?: string;
  tipo: TipoEventoLoyalty;
  plataforma?: Plataforma;
  ipHmac?: Buffer;
  detalle?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await sqlLoyalty`
    INSERT INTO loyalty.eventos (programa_id, membresia_id, tipo, plataforma, ip_hmac, detalle)
    VALUES (
      ${datos.programaId},
      ${datos.membresiaId ?? null},
      ${datos.tipo},
      ${datos.plataforma ?? "otro"},
      ${datos.ipHmac ?? null},
      ${sqlLoyalty.json(datos.detalle ?? {})}
    )
  `;
}
