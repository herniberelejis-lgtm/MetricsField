import "server-only";
import crypto from "node:crypto";
import { sql } from "../sql";
import type { BeneficioLoyalty, MisionLoyalty, ProgramaLoyalty, TipoMisionLoyalty } from "../types";
import type { TipoEventoLoyalty } from "../loyalty-antifraude";

// Capa de datos del módulo Loyalty. Vive en lib/db/ (no en lib/db.ts) porque
// el brief original ya anticipó este split — a diferencia de lib/types.ts,
// acá no hay colisión de convención: lib/db.ts sigue existiendo intacto,
// este archivo es aditivo puro. Mismo patrón que el resto del repo: SQL
// directo (sin ORM), mapeo explícito snake_case -> camelCase, prefijo `get`
// para lecturas (igual que getCliente/getClientes en lib/db.ts).
//
// Regla del ledger: el saldo es SIEMPRE SUM(delta) de movimientos_puntos,
// nunca un número guardado aparte. Toda escritura de puntos lleva una
// idem_clave única, así un doble click o un reintento de red no duplican.

const VENTANA_VISITA = "20 hours";
const MAX_REFERIDOS = 20;
const CANJE_VALIDEZ_MIN = 15;

// ---------- Comercio y programa ----------

export interface ComercioLoyalty {
  id: string;
  nombre: string;
  tieneLoyalty: boolean;
  /** "baja" = el comercio dejó de ser cliente: Loyalty se apaga con él. */
  estado: string;
  googleReviewUrl: string;
  tieneLogo: boolean;
}

/** Lo mínimo para la landing de Loyalty: no usa getCliente() de lib/db.ts a
 * propósito — ese mapea el objeto Cliente completo (usado en todo el panel
 * de admin). Acá alcanza con una consulta chica y propia. */
export async function getComercioLoyalty(comercioId: string): Promise<ComercioLoyalty | null> {
  const rows = await sql`
    SELECT co.id, co.nombre, co.tiene_loyalty, co.estado, co.google_review_url,
           EXISTS (SELECT 1 FROM comercio_logos l WHERE l.comercio_id = co.id) AS tiene_logo
    FROM comercios co WHERE co.id = ${comercioId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tieneLoyalty: Boolean(r.tiene_loyalty),
    estado: (r.estado as string) ?? "",
    googleReviewUrl: (r.google_review_url as string) ?? "",
    tieneLogo: Boolean(r.tiene_logo),
  };
}

export async function setTieneLoyalty(comercioId: string, valor: boolean): Promise<void> {
  await sql`UPDATE comercios SET tiene_loyalty = ${valor} WHERE id = ${comercioId}`;
}

function mapPrograma(r: Record<string, unknown>): ProgramaLoyalty {
  return {
    comercioId: r.comercio_id as string,
    googleClassId: r.google_class_id as string,
    applePassTypeId: r.apple_pass_type_id as string,
    puntosBienvenida: Number(r.puntos_bienvenida),
    puntosPorVisita: Number(r.puntos_por_visita),
    activo: Boolean(r.activo),
  };
}

/** El programa de fidelización de un comercio, o null si nunca se creó. */
export async function getProgramaLoyalty(comercioId: string): Promise<ProgramaLoyalty | null> {
  const rows = await sql`
    SELECT comercio_id, google_class_id, apple_pass_type_id, puntos_bienvenida,
           puntos_por_visita, activo
    FROM programas_loyalty
    WHERE comercio_id = ${comercioId}
  `;
  return rows.length === 0 ? null : mapPrograma(rows[0]);
}

export async function guardarProgramaLoyalty(
  comercioId: string,
  datos: { puntosBienvenida: number; puntosPorVisita: number; activo: boolean },
): Promise<ProgramaLoyalty> {
  const rows = await sql`
    INSERT INTO programas_loyalty (comercio_id, puntos_bienvenida, puntos_por_visita, activo)
    VALUES (${comercioId}, ${datos.puntosBienvenida}, ${datos.puntosPorVisita}, ${datos.activo})
    ON CONFLICT (comercio_id) DO UPDATE SET
      puntos_bienvenida = EXCLUDED.puntos_bienvenida,
      puntos_por_visita = EXCLUDED.puntos_por_visita,
      activo = EXCLUDED.activo,
      actualizado_en = now()
    RETURNING comercio_id, google_class_id, apple_pass_type_id, puntos_bienvenida,
              puntos_por_visita, activo
  `;
  return mapPrograma(rows[0]);
}

export async function setGoogleClassId(comercioId: string, classId: string): Promise<void> {
  await sql`
    UPDATE programas_loyalty SET google_class_id = ${classId}, actualizado_en = now()
    WHERE comercio_id = ${comercioId}
  `;
}

// ---------- Catálogo: beneficios y misiones ----------

function mapBeneficio(r: Record<string, unknown>): BeneficioLoyalty {
  return {
    id: r.id as string,
    comercioId: r.comercio_id as string,
    nombre: r.nombre as string,
    costoPuntos: Number(r.costo_puntos),
    activo: Boolean(r.activo),
  };
}

export async function getBeneficios(comercioId: string, soloActivos = false): Promise<BeneficioLoyalty[]> {
  const rows = soloActivos
    ? await sql`SELECT * FROM beneficios WHERE comercio_id = ${comercioId} AND activo ORDER BY costo_puntos, nombre`
    : await sql`SELECT * FROM beneficios WHERE comercio_id = ${comercioId} ORDER BY activo DESC, costo_puntos, nombre`;
  return rows.map(mapBeneficio);
}

export async function getBeneficio(comercioId: string, id: string): Promise<BeneficioLoyalty | null> {
  const rows = await sql`SELECT * FROM beneficios WHERE id = ${id} AND comercio_id = ${comercioId}`;
  return rows.length === 0 ? null : mapBeneficio(rows[0]);
}

export async function crearBeneficio(comercioId: string, nombre: string, costoPuntos: number): Promise<void> {
  await sql`
    INSERT INTO beneficios (id, comercio_id, nombre, costo_puntos)
    VALUES (${crypto.randomUUID()}, ${comercioId}, ${nombre}, ${costoPuntos})
  `;
}

/** Los beneficios no se borran (un canje viejo los referencia): se apagan. */
export async function setBeneficioActivo(comercioId: string, id: string, activo: boolean): Promise<void> {
  await sql`UPDATE beneficios SET activo = ${activo} WHERE id = ${id} AND comercio_id = ${comercioId}`;
}

function mapMision(r: Record<string, unknown>): MisionLoyalty {
  return {
    id: r.id as string,
    comercioId: r.comercio_id as string,
    tipo: r.tipo as TipoMisionLoyalty,
    puntos: Number(r.puntos),
    verificacion: r.verificacion as MisionLoyalty["verificacion"],
    url: (r.url as string) ?? "",
    activa: Boolean(r.activa),
  };
}

export async function getMisiones(comercioId: string, soloActivas = false): Promise<MisionLoyalty[]> {
  const rows = soloActivas
    ? await sql`SELECT * FROM misiones WHERE comercio_id = ${comercioId} AND activa ORDER BY creado_en`
    : await sql`SELECT * FROM misiones WHERE comercio_id = ${comercioId} ORDER BY activa DESC, creado_en`;
  return rows.map(mapMision);
}

export async function crearMision(
  comercioId: string,
  datos: { tipo: TipoMisionLoyalty; puntos: number; url: string },
): Promise<void> {
  // Solo el referido se verifica solo (el amigo tiene que registrarse de
  // verdad); reseña y redes son sistema de honor — ver §6 del doc.
  const verificacion = datos.tipo === "referido" ? "automatica" : "autodeclarada";
  await sql`
    INSERT INTO misiones (id, comercio_id, tipo, puntos, verificacion, url)
    VALUES (${crypto.randomUUID()}, ${comercioId}, ${datos.tipo}, ${datos.puntos}, ${verificacion}, ${datos.url})
  `;
}

export async function setMisionActiva(comercioId: string, id: string, activa: boolean): Promise<void> {
  await sql`UPDATE misiones SET activa = ${activa} WHERE id = ${id} AND comercio_id = ${comercioId}`;
}

// ---------- Identidad del cliente final ----------

export interface ClienteFinal {
  id: string;
  telefono: string;
  nombre: string;
  email: string;
}

export async function getClienteFinal(id: string): Promise<ClienteFinal | null> {
  const rows = await sql`SELECT id, telefono, nombre, email FROM clientes_finales WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return { id: r.id as string, telefono: r.telefono as string, nombre: r.nombre as string, email: r.email as string };
}

/** Alta por teléfono (ya normalizado). Si el teléfono ya existe NO toca sus
 * datos y avisa con `existente`: sin verificar el número (no hay SMS), quien
 * escribe un teléfono ajeno no puede pisar el nombre de esa persona ni
 * quedarse con su tarjeta. La forma de recuperar la tarjeta propia es el
 * link "Ver mis puntos" que viene dentro del pase de Wallet. */
export async function crearClienteFinal(datos: {
  telefono: string;
  nombre: string;
  email: string;
}): Promise<{ id: string; existente: boolean }> {
  const rows = await sql`
    INSERT INTO clientes_finales (id, telefono, nombre, email)
    VALUES (${crypto.randomUUID()}, ${datos.telefono}, ${datos.nombre}, ${datos.email})
    ON CONFLICT (telefono) DO NOTHING
    RETURNING id
  `;
  if (rows.length > 0) return { id: rows[0].id as string, existente: false };
  const previo = await sql`SELECT id FROM clientes_finales WHERE telefono = ${datos.telefono}`;
  return { id: previo[0].id as string, existente: true };
}

/** Consentimiento versionado (Ley 25.326): append-only, nunca se edita. */
export async function registrarConsentimiento(datos: {
  clienteFinalId: string;
  comercioId: string;
  version: string;
  datos: boolean;
  wallet: boolean;
  marketing: boolean;
}): Promise<void> {
  await sql`
    INSERT INTO consentimientos (cliente_final_id, comercio_id, version, datos, wallet, marketing)
    VALUES (${datos.clienteFinalId}, ${datos.comercioId}, ${datos.version}, ${datos.datos}, ${datos.wallet}, ${datos.marketing})
  `;
}

// ---------- Membresías ----------

export interface Membresia {
  id: string;
  clienteFinalId: string;
  comercioId: string;
  googleObjectId: string;
  appleSerialNumber: string;
  estadoGoogle: "pendiente" | "emitido" | "error";
  estadoApple: "pendiente" | "emitido" | "error";
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

export async function getMembresia(clienteFinalId: string, comercioId: string): Promise<Membresia | null> {
  const rows = await sql`
    SELECT * FROM membresias WHERE cliente_final_id = ${clienteFinalId} AND comercio_id = ${comercioId}
  `;
  return rows.length === 0 ? null : mapearMembresia(rows[0]);
}

export async function getMembresiaPorId(id: string): Promise<Membresia | null> {
  const rows = await sql`SELECT * FROM membresias WHERE id = ${id}`;
  return rows.length === 0 ? null : mapearMembresia(rows[0]);
}

/** Devuelve la membresía de un cliente en un comercio, o la crea con el
 * movimiento de bienvenida ya cargado (idempotente: si ya existe, no
 * duplica ni el alta ni los puntos de bienvenida). */
export async function obtenerOCrearMembresia(
  clienteFinalId: string,
  comercioId: string,
): Promise<Membresia & { nueva: boolean }> {
  const existente = await getMembresia(clienteFinalId, comercioId);
  if (existente) return { ...existente, nueva: false };

  const creada = await sql`
    INSERT INTO membresias (id, cliente_final_id, comercio_id)
    VALUES (${crypto.randomUUID()}, ${clienteFinalId}, ${comercioId})
    ON CONFLICT (cliente_final_id, comercio_id) DO NOTHING
    RETURNING *
  `;
  // Otra request concurrente la creó en el medio: devolver esa.
  if (creada.length === 0) {
    const otra = await getMembresia(clienteFinalId, comercioId);
    return { ...(otra as Membresia), nueva: false };
  }
  const membresia = mapearMembresia(creada[0]);

  const programa = await getProgramaLoyalty(comercioId);
  if (programa && programa.puntosBienvenida > 0) {
    await registrarMovimiento({
      membresiaId: membresia.id,
      delta: programa.puntosBienvenida,
      motivo: "bienvenida",
      idemClave: `bienvenida:${membresia.id}`,
    });
  }
  return { ...membresia, nueva: true };
}

export async function marcarEstadoGoogle(
  membresiaId: string,
  estado: Membresia["estadoGoogle"],
  objectId?: string,
): Promise<void> {
  if (objectId) {
    await sql`UPDATE membresias SET estado_google = ${estado}, google_object_id = ${objectId} WHERE id = ${membresiaId}`;
  } else {
    await sql`UPDATE membresias SET estado_google = ${estado} WHERE id = ${membresiaId}`;
  }
}

/** Baja pedida por el propio cliente (derecho de supresión, Ley 25.326):
 * borra su membresía en este comercio con sus puntos y canjes. Si ya no le
 * queda ninguna otra, borra también su identidad y sus consentimientos.
 * Los eventos quedan, pero anónimos (cliente_final_id pasa a NULL). */
export async function eliminarMembresiaYDatos(clienteFinalId: string, membresiaId: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM membresias WHERE id = ${membresiaId} AND cliente_final_id = ${clienteFinalId}`;
    const quedan = await tx`SELECT 1 FROM membresias WHERE cliente_final_id = ${clienteFinalId} LIMIT 1`;
    if (quedan.length === 0) {
      await tx`DELETE FROM clientes_finales WHERE id = ${clienteFinalId}`;
    }
  });
}

// ---------- Ledger de puntos (append-only) ----------

export type MotivoMovimiento = "bienvenida" | "visita" | "mision" | "referido" | "canje" | "ajuste_manual";

/** Inserta un movimiento en el ledger y devuelve el saldo resultante.
 * `idemClave` es la defensa contra doble-submit: un mismo movimiento
 * reenviado (doble click, retry de red) no duplica puntos porque choca
 * contra el UNIQUE y no inserta una segunda fila. */
export async function registrarMovimiento(datos: {
  membresiaId: string;
  delta: number;
  motivo: MotivoMovimiento;
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

/** Suma una visita si no hubo otra en las últimas 20 h (antifraude Nivel 1).
 * El chequeo y el insert van en la misma transacción con un lock por
 * membresía: dos taps simultáneos no pueden sumar dos veces. La base es la
 * fuente de verdad del cooldown — no el rate limit en memoria, que en
 * serverless es por instancia. */
export async function acreditarVisita(
  membresiaId: string,
  puntos: number,
): Promise<{ aplicado: boolean; saldo: number }> {
  const aplicado = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`visita:${membresiaId}`}))`;
    const reciente = await tx`
      SELECT 1 FROM movimientos_puntos
      WHERE membresia_id = ${membresiaId} AND motivo IN ('visita', 'bienvenida')
        AND creado_en > now() - ${VENTANA_VISITA}::interval
      LIMIT 1
    `;
    if (reciente.length > 0 || puntos <= 0) return false;
    await tx`
      INSERT INTO movimientos_puntos (membresia_id, delta, motivo, idem_clave)
      VALUES (${membresiaId}, ${puntos}, 'visita', ${`visita:${membresiaId}:${crypto.randomUUID()}`})
    `;
    return true;
  });
  return { aplicado, saldo: await calcularSaldo(membresiaId) };
}

/** Ids de las misiones que esta membresía ya cobró (cada una paga una vez). */
export async function getMisionesCumplidas(membresiaId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT DISTINCT mision_id FROM movimientos_puntos
    WHERE membresia_id = ${membresiaId} AND motivo = 'mision' AND mision_id IS NOT NULL
  `;
  return new Set(rows.map((r) => r.mision_id as string));
}

export async function acreditarMision(
  membresiaId: string,
  mision: MisionLoyalty,
): Promise<{ aplicado: boolean; saldo: number }> {
  return registrarMovimiento({
    membresiaId,
    delta: mision.puntos,
    motivo: "mision",
    misionId: mision.id,
    idemClave: `mision:${membresiaId}:${mision.id}`,
  });
}

/** Premio al que trajo a un amigo: solo cuando el amigo es una persona
 * nueva (teléfono que nunca se registró) y con tope por membresía, para
 * que inventar teléfonos no sea una fuente infinita de puntos. */
export async function acreditarReferido(
  referidorMembresiaId: string,
  nuevaMembresiaId: string,
  mision: MisionLoyalty,
): Promise<{ aplicado: boolean; saldo: number }> {
  const previos = await sql`
    SELECT COUNT(*)::int AS n FROM movimientos_puntos
    WHERE membresia_id = ${referidorMembresiaId} AND motivo = 'referido'
  `;
  if (Number(previos[0].n) >= MAX_REFERIDOS) {
    return { aplicado: false, saldo: await calcularSaldo(referidorMembresiaId) };
  }
  return registrarMovimiento({
    membresiaId: referidorMembresiaId,
    delta: mision.puntos,
    motivo: "referido",
    misionId: mision.id,
    idemClave: `referido:${nuevaMembresiaId}`,
  });
}

// ---------- Canje en mostrador ----------

// Sin 0/O, 1/I/L: se dicta y se tipea en caja sin confundirse.
const ALFABETO_CANJE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function codigoCanje(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => ALFABETO_CANJE[b % ALFABETO_CANJE.length]).join("");
}

export interface CanjePendiente {
  codigo: string;
  beneficio: string;
  costoPuntos: number;
  expiraEn: string;
}

/** El cliente pide canjear: se genera un código de 6 letras que vence en 15
 * minutos. Los puntos NO se descuentan acá — recién cuando el comercio lo
 * valida en caja. Pedir otro anula el anterior. */
export async function crearCanje(
  membresiaId: string,
  comercioId: string,
  beneficio: BeneficioLoyalty,
): Promise<{ ok: true; canje: CanjePendiente } | { ok: false; error: string }> {
  const saldo = await calcularSaldo(membresiaId);
  if (saldo < beneficio.costoPuntos) {
    return { ok: false, error: `Te faltan ${beneficio.costoPuntos - saldo} puntos para este beneficio.` };
  }
  await sql`
    UPDATE canjes SET expira_en = now()
    WHERE membresia_id = ${membresiaId} AND NOT validado AND expira_en > now()
  `;
  const codigo = codigoCanje();
  const rows = await sql`
    INSERT INTO canjes (id, membresia_id, beneficio_id, comercio_id, costo_puntos, expira_en)
    VALUES (${codigo}, ${membresiaId}, ${beneficio.id}, ${comercioId}, ${beneficio.costoPuntos},
            now() + ${`${CANJE_VALIDEZ_MIN} minutes`}::interval)
    RETURNING expira_en
  `;
  return {
    ok: true,
    canje: {
      codigo,
      beneficio: beneficio.nombre,
      costoPuntos: beneficio.costoPuntos,
      expiraEn: new Date(rows[0].expira_en as string).toISOString(),
    },
  };
}

export async function getCanjePendiente(membresiaId: string): Promise<CanjePendiente | null> {
  const rows = await sql`
    SELECT c.id, c.costo_puntos, c.expira_en, b.nombre
    FROM canjes c JOIN beneficios b ON b.id = c.beneficio_id
    WHERE c.membresia_id = ${membresiaId} AND NOT c.validado AND c.expira_en > now()
    ORDER BY c.creado_en DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    codigo: r.id as string,
    beneficio: r.nombre as string,
    costoPuntos: Number(r.costo_puntos),
    expiraEn: new Date(r.expira_en as string).toISOString(),
  };
}

export type ResultadoValidacion =
  | {
      ok: true;
      beneficio: string;
      cliente: string;
      costoPuntos: number;
      saldo: number;
      membresiaId: string;
      googleObjectId: string;
    }
  | { ok: false; error: string };

/** El comercio valida en caja el código que le muestra el cliente. Todo en
 * una transacción con el canje bloqueado (FOR UPDATE): dos cajeros que
 * validan el mismo código a la vez no descuentan dos veces, y el código
 * tiene que ser de ESTE comercio. */
export async function validarCanje(comercioId: string, codigoCrudo: string, quien: string): Promise<ResultadoValidacion> {
  const codigo = codigoCrudo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (codigo.length !== 6) return { ok: false, error: "El código tiene 6 letras y números." };
  return sql.begin(async (tx): Promise<ResultadoValidacion> => {
    const rows = await tx`
      SELECT c.id, c.membresia_id, c.validado, c.expira_en, c.costo_puntos,
             b.nombre AS beneficio, cf.nombre AS cliente, m.google_object_id
      FROM canjes c
      JOIN beneficios b ON b.id = c.beneficio_id
      JOIN membresias m ON m.id = c.membresia_id
      JOIN clientes_finales cf ON cf.id = m.cliente_final_id
      WHERE c.id = ${codigo} AND c.comercio_id = ${comercioId}
      FOR UPDATE OF c
    `;
    if (rows.length === 0) return { ok: false, error: "Ese código no existe en este local." };
    const c = rows[0];
    if (c.validado) return { ok: false, error: "Ese código ya se usó." };
    if (new Date(c.expira_en as string).getTime() < Date.now()) {
      return { ok: false, error: "Ese código venció. Pedile al cliente que genere uno nuevo." };
    }
    const costo = Number(c.costo_puntos);
    const saldoRows = await tx`
      SELECT COALESCE(SUM(delta), 0) AS saldo FROM movimientos_puntos WHERE membresia_id = ${c.membresia_id as string}
    `;
    const saldo = Number(saldoRows[0].saldo);
    if (saldo < costo) return { ok: false, error: `Al cliente no le alcanzan los puntos (tiene ${saldo}).` };
    await tx`
      INSERT INTO movimientos_puntos (membresia_id, delta, motivo, idem_clave)
      VALUES (${c.membresia_id as string}, ${-costo}, 'canje', ${`canje:${codigo}`})
    `;
    await tx`
      UPDATE canjes SET validado = TRUE, validado_en = now(), admin_email = ${quien} WHERE id = ${codigo}
    `;
    return {
      ok: true,
      beneficio: c.beneficio as string,
      cliente: c.cliente as string,
      costoPuntos: costo,
      saldo: saldo - costo,
      membresiaId: c.membresia_id as string,
      googleObjectId: c.google_object_id as string,
    };
  });
}

// ---------- Eventos ----------
// hashearIp vive en lib/loyalty-antifraude.ts (no acá) porque no toca la
// base — separarlo lo hace testeable sin DATABASE_URL configurada.

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

// ---------- Métricas para el portal y el panel ----------

export interface MetricasLoyalty {
  tarjetas: number;
  tarjetasEnWallet: number;
  nuevas30d: number;
  visitas30d: number;
  /** De los socios que ya tenían tarjeta hace 30 días, cuántos volvieron. */
  retorno30d: { volvieron: number; base: number };
  canjes30d: number;
  /** Registros y clics en "Guardar en Google Wallet" (KPI tap → wallet). */
  registros30d: number;
  clicsWallet30d: number;
}

export async function getMetricasLoyalty(comercioId: string): Promise<MetricasLoyalty> {
  const [tarjetas, eventos, retorno, canjes] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE estado_google = 'emitido')::int AS en_wallet,
             COUNT(*) FILTER (WHERE creado_en > now() - interval '30 days')::int AS nuevas
      FROM membresias WHERE comercio_id = ${comercioId}
    `,
    sql`
      SELECT tipo, COUNT(*)::int AS n FROM eventos_loyalty
      WHERE comercio_id = ${comercioId} AND creado_en > now() - interval '30 days'
        AND tipo IN ('tap', 'registro', 'wallet_guardada')
      GROUP BY tipo
    `,
    sql`
      SELECT COUNT(*)::int AS base,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM movimientos_puntos mp
               WHERE mp.membresia_id = m.id AND mp.motivo = 'visita'
                 AND mp.creado_en > now() - interval '30 days'
             ))::int AS volvieron
      FROM membresias m
      WHERE m.comercio_id = ${comercioId} AND m.creado_en <= now() - interval '30 days'
    `,
    sql`
      SELECT COUNT(*)::int AS n FROM canjes
      WHERE comercio_id = ${comercioId} AND validado AND validado_en > now() - interval '30 days'
    `,
  ]);
  const ev = (tipo: string) => Number(eventos.find((e) => e.tipo === tipo)?.n ?? 0);
  return {
    tarjetas: Number(tarjetas[0].total),
    tarjetasEnWallet: Number(tarjetas[0].en_wallet),
    nuevas30d: Number(tarjetas[0].nuevas),
    visitas30d: ev("tap"),
    retorno30d: { volvieron: Number(retorno[0].volvieron), base: Number(retorno[0].base) },
    canjes30d: Number(canjes[0].n),
    registros30d: ev("registro"),
    clicsWallet30d: ev("wallet_guardada"),
  };
}

export interface SocioLoyalty {
  nombre: string;
  telefono: string;
  email: string;
  saldo: number;
  alta: string;
  ultimaVisita: string | null;
  aceptaMarketing: boolean;
}

/** Los socios del comercio, para su portal. Datos personales que el cliente
 * aceptó compartir con ESTE comercio al registrarse (consentimiento "datos"). */
export async function getSociosLoyalty(comercioId: string, limite = 300): Promise<SocioLoyalty[]> {
  const rows = await sql`
    SELECT cf.nombre, cf.telefono, cf.email, m.creado_en AS alta,
           COALESCE((SELECT SUM(delta) FROM movimientos_puntos mp WHERE mp.membresia_id = m.id), 0) AS saldo,
           (SELECT MAX(creado_en) FROM movimientos_puntos mp
             WHERE mp.membresia_id = m.id AND mp.motivo IN ('visita', 'bienvenida')) AS ultima_visita,
           COALESCE((SELECT co.marketing FROM consentimientos co
             WHERE co.cliente_final_id = cf.id AND co.comercio_id = m.comercio_id
             ORDER BY co.creado_en DESC LIMIT 1), FALSE) AS marketing
    FROM membresias m JOIN clientes_finales cf ON cf.id = m.cliente_final_id
    WHERE m.comercio_id = ${comercioId}
    ORDER BY ultima_visita DESC NULLS LAST
    LIMIT ${limite}
  `;
  return rows.map((r) => ({
    nombre: r.nombre as string,
    telefono: r.telefono as string,
    email: r.email as string,
    saldo: Number(r.saldo),
    alta: new Date(r.alta as string).toISOString(),
    ultimaVisita: r.ultima_visita ? new Date(r.ultima_visita as string).toISOString() : null,
    aceptaMarketing: Boolean(r.marketing),
  }));
}

export interface CanjeReciente {
  beneficio: string;
  cliente: string;
  costoPuntos: number;
  validadoEn: string;
}

export async function getCanjesRecientes(comercioId: string, limite = 20): Promise<CanjeReciente[]> {
  const rows = await sql`
    SELECT b.nombre AS beneficio, cf.nombre AS cliente, c.costo_puntos, c.validado_en
    FROM canjes c
    JOIN beneficios b ON b.id = c.beneficio_id
    JOIN membresias m ON m.id = c.membresia_id
    JOIN clientes_finales cf ON cf.id = m.cliente_final_id
    WHERE c.comercio_id = ${comercioId} AND c.validado
    ORDER BY c.validado_en DESC
    LIMIT ${limite}
  `;
  return rows.map((r) => ({
    beneficio: r.beneficio as string,
    cliente: r.cliente as string,
    costoPuntos: Number(r.costo_puntos),
    validadoEn: new Date(r.validado_en as string).toISOString(),
  }));
}

/** Membresías cuya tarjeta de Google quedó sin emitir (API caída, error):
 * el panel las muestra y se reintentan al próximo ingreso del cliente. */
export async function contarTarjetasConError(comercioId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS n FROM membresias WHERE comercio_id = ${comercioId} AND estado_google = 'error'
  `;
  return Number(rows[0].n);
}
