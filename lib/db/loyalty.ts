import "server-only";
import { sql } from "../sql";
import { sqlLoyalty } from "../sql-loyalty";
import { hashToken } from "../loyalty/identidad";
import { claveIdempotenciaVisita } from "../loyalty/cooldown";
import {
  calcularExpiracionCanje,
  claveIdempotenciaCanje,
  type MotivoFalloConfirmacion,
} from "../loyalty/canje";
import type { TransactionSql } from "postgres";

export { claveIdempotenciaVisita };

// =================================================================
// CONEXIONES — este es el archivo hub de todo el módulo: casi nada
// escribe en la base de Loyalty sin pasar por acá.
//
//   Depende de:
//     - lib/sql.ts        → esquema `public` (SOLO getComercioLoyalty:
//                            lee comercios.id/nombre/tiene_loyalty,
//                            rol admin, mismo cliente que usa Reviews)
//     - lib/sql-loyalty.ts → esquema `loyalty` (todo lo demás, rol
//                            app_loyalty de permisos mínimos — ver
//                            db/migrations/013_loyalty_rol.sql)
//     - lib/loyalty/identidad.ts  → hashToken (para resolver membresías)
//     - lib/loyalty/cooldown.ts   → claveIdempotenciaVisita (re-exportada)
//
//   Tablas que tocan las funciones de este archivo (esquema `loyalty`,
//   salvo donde se indica):
//     programas, clientes, membresias, movimientos, beneficios, canjes,
//     consentimientos, eventos · public.comercios (solo lectura)
//
//   Lo usan:
//     - app/(loyalty)/l/[codigo]/actions.ts  → registro público (L4)
//     - app/(loyalty)/l/[codigo]/page.tsx    → landing (lectura de programa)
//     - app/(loyalty)/tarjeta/*              → sesión del cliente (L4/L5)
//     - app/portal/[codigo]/canjes/*         → confirmación de canje (L5)
//     - test/loyalty-ledger.test.ts          → SOLO claveIdempotenciaVisita
//       (todo lo demás de este archivo requiere una base real — ver la
//       nota de "no verificado" en el commit de L3)
//
//   Por qué NO vive acá: claveIdempotenciaVisita, hashToken, y el resto
//   de lib/loyalty/*.ts son funciones PURAS (sin import de lib/sql.ts ni
//   lib/sql-loyalty.ts) — mezclarlas en este archivo las volvería
//   intestables sin una base real, porque ambos clientes Postgres tiran
//   apenas se importan si falta su variable de entorno.
// =================================================================

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
  googleClassId: string;
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
    SELECT id, cuenta_id, codigo_publico, google_class_id, puntos_bienvenida, puntos_por_visita, activo
    FROM loyalty.programas
    WHERE cuenta_id = ${cuentaId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    cuentaId: r.cuenta_id as string,
    codigoPublico: r.codigo_publico as string,
    googleClassId: r.google_class_id as string,
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
    SELECT id, cuenta_id, codigo_publico, google_class_id, puntos_bienvenida, puntos_por_visita, activo
    FROM loyalty.programas
    WHERE codigo_publico = ${codigoPublico}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    cuentaId: r.cuenta_id as string,
    codigoPublico: r.codigo_publico as string,
    googleClassId: r.google_class_id as string,
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
    return await sqlLoyalty.begin((tx) => aplicarMovimientoEnTx(tx, datos));
  } catch (error) {
    if (error instanceof MovimientoDuplicado) {
      const actual = await sqlLoyalty`SELECT saldo FROM loyalty.membresias WHERE id = ${datos.membresiaId}`;
      if (actual.length === 0) throw new Error(`Membresía ${datos.membresiaId} no existe`);
      return { saldo: Number(actual[0].saldo), aplicado: false };
    }
    throw error;
  }
}

/** El UPDATE condicional + INSERT del ledger, SIN abrir transacción propia:
 * corre dentro de la que le pasa quien llama. Existe para que confirmarCanje
 * pueda marcar el canje y descontar los puntos en una única transacción
 * (si el descuento falla, la confirmación se revierte sola). Lanza
 * SaldoInsuficiente o MovimientoDuplicado — quien llama decide qué hacer. */
async function aplicarMovimientoEnTx(
  tx: TransactionSql,
  datos: { membresiaId: string; delta: number; motivo: Motivo; idemClave: string; actor?: string },
): Promise<ResultadoMovimiento> {
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

// ---------- Consentimiento (Ley 25.326) ----------

/** Append-only: SIEMPRE se inserta una fila nueva, nunca se actualiza una
 * existente — es la única forma de poder probar después qué aceptó la
 * persona y cuándo, sea alta nueva o recuperación de una membresía ya
 * existente (ver §9 del documento de arquitectura). */
export async function registrarConsentimiento(datos: {
  clienteId: string;
  programaId: string;
  version: string;
  textoHash: Buffer;
  datos: boolean;
  wallet: boolean;
  marketing: boolean;
  edadDeclarada: boolean;
  userAgent: string;
  ipHmac?: Buffer;
}): Promise<void> {
  await sqlLoyalty`
    INSERT INTO loyalty.consentimientos
      (cliente_id, programa_id, version, texto_hash, datos, wallet, marketing, edad_declarada, user_agent, ip_hmac)
    VALUES (
      ${datos.clienteId}, ${datos.programaId}, ${datos.version}, ${datos.textoHash},
      ${datos.datos}, ${datos.wallet}, ${datos.marketing}, ${datos.edadDeclarada},
      ${datos.userAgent}, ${datos.ipHmac ?? null}
    )
  `;
}

// ---------- Estado de emisión en las wallets ----------
// La base propia es la fuente de verdad: si Google o Apple no responden,
// la membresía queda con estado 'error' o 'pendiente' y el registro no
// falla por eso (ver §11 del documento de producto — nunca se pierde un
// punto por una caída externa de un tercero).

/** Se llama una sola vez por programa, la primera vez que hace falta
 * emitir un pase de Google (alta lazy de la clase — no hay todavía un
 * flujo de admin que la cree por adelantado). Idempotente por columna:
 * si el programa ya tenía un google_class_id, esto lo pisa con el mismo
 * valor sin efecto. */
export async function actualizarClaseGoogle(programaId: string, googleClassId: string): Promise<void> {
  await sqlLoyalty`UPDATE loyalty.programas SET google_class_id = ${googleClassId} WHERE id = ${programaId}`;
}

export async function marcarWalletGoogleEmitida(membresiaId: string, googleObjectId: string): Promise<void> {
  await sqlLoyalty`
    UPDATE loyalty.membresias
       SET google_object_id = ${googleObjectId}, estado_google = 'emitido'
     WHERE id = ${membresiaId}
  `;
}

export async function marcarWalletGoogleError(membresiaId: string): Promise<void> {
  await sqlLoyalty`UPDATE loyalty.membresias SET estado_google = 'error' WHERE id = ${membresiaId}`;
}

// ---------- Resolución de sesión: membresía a partir del token ----------

export interface MembresiaCompleta {
  id: string;
  saldo: number;
  visitas: number;
  clienteId: string;
  /** Buffer cifrado (AES-256-GCM) — descifrar con lib/loyalty/identidad.ts
   * antes de mostrar. Deliberadamente no se descifra acá: esta capa no
   * decide para qué se va a usar el nombre (mostrar en pantalla, armar el
   * pkpass, etc.), así que no vale la pena importar identidad.ts en el
   * archivo que ya de por sí es el más sensible del módulo. */
  nombreCifrado: Buffer;
  programaId: string;
  cuentaId: string;
  nombreComercio: string;
  googleObjectId: string;
  googleClassId: string;
  appleSerial: string;
}

/** Resuelve la membresía a partir del HASH del token de la cookie de
 * sesión (hashToken() en lib/loyalty/identidad.ts — el token crudo nunca
 * llega a la base). Es la única forma de "iniciar sesión" en Loyalty: no
 * hay búsqueda por teléfono ni por nombre desde el lado público. */
export async function obtenerMembresiaPorTokenHash(tokenHash: Buffer): Promise<MembresiaCompleta | null> {
  const filas = await sqlLoyalty`
    SELECT
      m.id, m.saldo, m.visitas, m.cliente_id, c.nombre_cif,
      m.programa_id, p.cuenta_id, p.google_class_id,
      m.google_object_id, m.apple_serial
    FROM loyalty.membresias m
    JOIN loyalty.clientes c ON c.id = m.cliente_id
    JOIN loyalty.programas p ON p.id = m.programa_id
    WHERE m.token_hash = ${tokenHash}
  `;
  if (filas.length === 0) return null;
  const r = filas[0];

  const comercio = await getComercioLoyalty(r.cuenta_id as string);

  return {
    id: r.id as string,
    saldo: Number(r.saldo),
    visitas: Number(r.visitas),
    clienteId: r.cliente_id as string,
    nombreCifrado: r.nombre_cif as Buffer,
    programaId: r.programa_id as string,
    cuentaId: r.cuenta_id as string,
    nombreComercio: comercio?.nombre ?? "",
    googleObjectId: r.google_object_id as string,
    googleClassId: r.google_class_id as string,
    appleSerial: r.apple_serial as string,
  };
}

// ---------- Canje (§6 del documento de arquitectura) ----------

export interface Beneficio {
  id: string;
  nombre: string;
  costoPuntos: number;
}

/** Beneficios activos de un programa, del más barato al más caro. */
export async function listarBeneficios(programaId: string): Promise<Beneficio[]> {
  const filas = await sqlLoyalty`
    SELECT id, nombre, costo_puntos
    FROM loyalty.beneficios
    WHERE programa_id = ${programaId} AND activo
    ORDER BY costo_puntos ASC, nombre ASC
  `;
  return filas.map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    costoPuntos: Number(r.costo_puntos),
  }));
}

export async function crearBeneficio(datos: {
  programaId: string;
  nombre: string;
  costoPuntos: number;
}): Promise<void> {
  await sqlLoyalty`
    INSERT INTO loyalty.beneficios (programa_id, nombre, costo_puntos)
    VALUES (${datos.programaId}, ${datos.nombre}, ${datos.costoPuntos})
  `;
}

/** Baja lógica: los canjes ya pedidos conservan su costo congelado y su
 * FK, así que nunca se borra la fila. Acotado por programa_id. */
export async function desactivarBeneficio(programaId: string, beneficioId: string): Promise<void> {
  await sqlLoyalty`
    UPDATE loyalty.beneficios SET activo = FALSE
    WHERE id = ${beneficioId} AND programa_id = ${programaId}
  `;
}

export type ResultadoPedirCanje =
  | { ok: true; canjeId: string; expiraEn: Date }
  | { ok: false; motivo: "beneficio_invalido" | "saldo_insuficiente" | "ya_pendiente" };

/** Crea un canje 'pendiente' con vigencia de 5 minutos. NO descuenta
 * puntos (se descuenta al confirmar, ver confirmarCanje). Chequea saldo
 * solo como cortesía al cliente — la garantía real es el UPDATE
 * condicional de la confirmación. El beneficio se busca acotado al
 * programa de la membresía: un beneficio_id de otro comercio no existe
 * para este cliente. Un solo canje pendiente por membresía. */
export async function pedirCanje(datos: {
  membresiaId: string;
  programaId: string;
  beneficioId: string;
}): Promise<ResultadoPedirCanje> {
  return sqlLoyalty.begin(async (tx): Promise<ResultadoPedirCanje> => {
    const beneficio = await tx`
      SELECT id, costo_puntos FROM loyalty.beneficios
      WHERE id = ${datos.beneficioId} AND programa_id = ${datos.programaId} AND activo
    `;
    if (beneficio.length === 0) return { ok: false, motivo: "beneficio_invalido" };
    const costo = Number(beneficio[0].costo_puntos);

    // El FOR UPDATE serializa los pedidos de una misma membresía: el
    // chequeo de "ya hay uno pendiente" de más abajo no compite con otro
    // pedido simultáneo.
    const membresia = await tx`
      SELECT saldo FROM loyalty.membresias
      WHERE id = ${datos.membresiaId} AND programa_id = ${datos.programaId}
      FOR UPDATE
    `;
    if (membresia.length === 0) return { ok: false, motivo: "beneficio_invalido" };
    if (Number(membresia[0].saldo) < costo) return { ok: false, motivo: "saldo_insuficiente" };

    const pendiente = await tx`
      SELECT 1 FROM loyalty.canjes
      WHERE membresia_id = ${datos.membresiaId} AND estado = 'pendiente' AND expira_en > now()
    `;
    if (pendiente.length > 0) return { ok: false, motivo: "ya_pendiente" };

    const expiraEn = calcularExpiracionCanje();
    const fila = await tx`
      INSERT INTO loyalty.canjes (membresia_id, programa_id, beneficio_id, costo_puntos, expira_en)
      VALUES (${datos.membresiaId}, ${datos.programaId}, ${datos.beneficioId}, ${costo}, ${expiraEn})
      RETURNING id
    `;
    return { ok: true, canjeId: fila[0].id as string, expiraEn };
  });
}

export interface CanjePendiente {
  id: string;
  beneficioNombre: string;
  costoPuntos: number;
  /** Cifrado (AES-256-GCM): lo descifra la capa de arriba, igual que en la tarjeta. */
  nombreCifrado: Buffer;
  expiraEn: Date;
}

/** Canjes vivos de un programa para la pantalla del comercio. */
export async function listarCanjesPendientes(programaId: string): Promise<CanjePendiente[]> {
  const filas = await sqlLoyalty`
    SELECT ca.id, ca.costo_puntos, ca.expira_en, b.nombre AS beneficio_nombre, c.nombre_cif
    FROM loyalty.canjes ca
    JOIN loyalty.beneficios b ON b.id = ca.beneficio_id
    JOIN loyalty.membresias m ON m.id = ca.membresia_id
    JOIN loyalty.clientes c ON c.id = m.cliente_id
    WHERE ca.programa_id = ${programaId} AND ca.estado = 'pendiente' AND ca.expira_en > now()
    ORDER BY ca.creado_en ASC
  `;
  return filas.map((r) => ({
    id: r.id as string,
    beneficioNombre: r.beneficio_nombre as string,
    costoPuntos: Number(r.costo_puntos),
    nombreCifrado: r.nombre_cif as Buffer,
    expiraEn: new Date(r.expira_en as string),
  }));
}

/** El canje pendiente vigente de una membresía, si tiene — para que la
 * tarjeta muestre "mostrale esto al mozo" en vez de dejar pedir otro. */
export async function obtenerCanjePendienteDeMembresia(
  membresiaId: string,
): Promise<{ id: string; beneficioNombre: string; expiraEn: Date } | null> {
  const filas = await sqlLoyalty`
    SELECT ca.id, ca.expira_en, b.nombre AS beneficio_nombre
    FROM loyalty.canjes ca
    JOIN loyalty.beneficios b ON b.id = ca.beneficio_id
    WHERE ca.membresia_id = ${membresiaId} AND ca.estado = 'pendiente' AND ca.expira_en > now()
    ORDER BY ca.creado_en DESC
    LIMIT 1
  `;
  if (filas.length === 0) return null;
  return {
    id: filas[0].id as string,
    beneficioNombre: filas[0].beneficio_nombre as string,
    expiraEn: new Date(filas[0].expira_en as string),
  };
}

export type ResultadoConfirmarCanje =
  | { ok: true; saldo: number }
  | { ok: false; motivo: MotivoFalloConfirmacion };

/** Confirma la entrega y descuenta los puntos en UNA transacción. El
 * UPDATE con todas las condiciones en el WHERE (estado, vigencia y
 * programa_id) es la verificación Y la escritura a la vez: nunca se lee
 * primero para decidir después. Cero filas = ya entregado, vencido o de
 * otro comercio, y se informa con el mismo motivo a propósito. Si el
 * descuento falla por saldo, la excepción revierte también la
 * confirmación y el canje queda 'pendiente'. */
export async function confirmarCanje(datos: {
  canjeId: string;
  programaId: string;
  confirmadoPor: string;
}): Promise<ResultadoConfirmarCanje> {
  try {
    return await sqlLoyalty.begin(async (tx): Promise<ResultadoConfirmarCanje> => {
      const filas = await tx`
        UPDATE loyalty.canjes
           SET estado = 'entregado', confirmado_en = now(), confirmado_por = ${datos.confirmadoPor}
         WHERE id = ${datos.canjeId}
           AND programa_id = ${datos.programaId}
           AND estado = 'pendiente'
           AND expira_en > now()
        RETURNING membresia_id, costo_puntos
      `;
      if (filas.length === 0) return { ok: false, motivo: "no_disponible" };

      const { saldo } = await aplicarMovimientoEnTx(tx, {
        membresiaId: filas[0].membresia_id as string,
        delta: -Number(filas[0].costo_puntos),
        motivo: "canje",
        idemClave: claveIdempotenciaCanje(datos.canjeId),
        actor: datos.confirmadoPor,
      });
      return { ok: true, saldo };
    });
  } catch (error) {
    if (error instanceof SaldoInsuficiente) return { ok: false, motivo: "saldo_insuficiente" };
    if (error instanceof MovimientoDuplicado) return { ok: false, motivo: "no_disponible" };
    throw error;
  }
}

/** Marca como 'vencido' los canjes pendientes cuya vigencia pasó. Solo
 * higiene y métricas: confirmarCanje ya rechaza los vencidos por su
 * cuenta, con o sin este job. Devuelve cuántos marcó. */
export async function vencerCanjes(): Promise<number> {
  const filas = await sqlLoyalty`
    UPDATE loyalty.canjes SET estado = 'vencido'
    WHERE estado = 'pendiente' AND expira_en <= now()
    RETURNING programa_id, membresia_id
  `;
  for (const f of filas) {
    await registrarEvento({
      programaId: f.programa_id as string,
      membresiaId: f.membresia_id as string,
      tipo: "canje_vencido",
    });
  }
  return filas.length;
}
