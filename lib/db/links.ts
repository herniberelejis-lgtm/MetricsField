import "server-only";
import crypto from "node:crypto";
import { sql } from "../sql";
import { hashearPin, pinCoincide } from "../pin";
import type { DestinoLink, LinkNFC, TipoSoporte } from "../types";
import { limpiarUrl, slugify } from "./_compartido";

// ---------- Links NFC + taps ----------

function mapLink(r: Record<string, unknown>): LinkNFC {
  return {
    id: r.id as string,
    comercioId: (r.comercio_id as string | null) ?? null,
    etiqueta: r.etiqueta as string,
    tipo: (r.tipo as TipoSoporte) ?? "nfc",
    lote: (r.lote as string) ?? "",
    destino: r.destino as DestinoLink,
    urlDestino: (r.url_destino as string | null) ?? null,
    activo: Boolean(r.activo),
    autogestionado: Boolean(r.autogestionado),
    nombreNegocio: (r.nombre_negocio as string) ?? "",
    nombreEmpleado: (r.nombre_empleado as string) ?? "",
    creadoEn: String(r.creado_en),
    taps: Number(r.taps ?? 0),
  };
}

export async function getLinks(comercioId: string): Promise<LinkNFC[]> {
  const rows = await sql`
    SELECT l.*, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN taps t ON t.link_id = l.id
    WHERE l.comercio_id = ${comercioId}
    GROUP BY l.id
    ORDER BY l.creado_en ASC
  `;
  return rows.map(mapLink);
}

export async function getLink(linkId: string): Promise<LinkNFC | undefined> {
  const rows = await sql`
    SELECT l.*, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN taps t ON t.link_id = l.id
    WHERE l.id = ${linkId}
    GROUP BY l.id
  `;
  if (rows.length === 0) return undefined;
  return mapLink(rows[0]);
}

function slugLink(etiqueta: string): string {
  return (
    slugify(etiqueta).slice(0, 24) || "link"
  );
}

export async function crearLink(
  comercioId: string,
  datos: {
    etiqueta: string;
    tipo?: TipoSoporte;
    destino: DestinoLink;
    urlDestino?: string | null;
    nombreEmpleado?: string;
  },
): Promise<LinkNFC> {
  let id = slugLink(datos.etiqueta);
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM links_nfc WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugLink(datos.etiqueta)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  await sql`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, destino, url_destino, nombre_empleado)
    VALUES (${id}, ${comercioId}, ${datos.etiqueta}, ${datos.tipo ?? "nfc"}, ${datos.destino}, ${limpiarUrl(datos.urlDestino) ?? null}, ${datos.nombreEmpleado ?? ""})
  `;
  const l = await getLink(id);
  if (!l) throw new Error("No se pudo crear el link.");
  return l;
}

export async function actualizarLink(
  linkId: string,
  datos: Partial<{
    etiqueta: string;
    tipo: TipoSoporte;
    destino: DestinoLink;
    urlDestino: string | null;
    activo: boolean;
    nombreEmpleado: string;
  }>,
): Promise<LinkNFC> {
  // Mismo criterio que actualizarCliente: UPDATE atómico, sin leer-mezclar-
  // escribir. urlDestino distingue "no tocar" (undefined) de "borrar" (null).
  const rows = await sql`
    UPDATE links_nfc SET
      etiqueta = ${datos.etiqueta === undefined ? sql`etiqueta` : datos.etiqueta},
      tipo = ${datos.tipo === undefined ? sql`tipo` : datos.tipo},
      destino = ${datos.destino === undefined ? sql`destino` : datos.destino},
      url_destino = ${datos.urlDestino === undefined ? sql`url_destino` : limpiarUrl(datos.urlDestino)},
      activo = ${datos.activo === undefined ? sql`activo` : datos.activo},
      nombre_empleado = ${datos.nombreEmpleado === undefined ? sql`nombre_empleado` : datos.nombreEmpleado}
    WHERE id = ${linkId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Link no encontrado: ${linkId}`);
  const l = await getLink(linkId);
  if (!l) throw new Error(`Link no encontrado: ${linkId}`);
  return l;
}

export async function eliminarLink(linkId: string): Promise<void> {
  await sql`DELETE FROM links_nfc WHERE id = ${linkId}`;
}

// ---------- Autogestión de hardware (canal Mercado Libre) ----------
// Piezas del inventario libre (comercio_id NULL) que su propio comprador
// activa desde /t/<id> — sin admin, sin fila en `comercios`. El PIN de
// edición vive hasheado acá (scrypt, lib/pin.ts) y nunca sale de estas dos
// funciones: mapLink no lo expone, así que ninguna pantalla puede filtrarlo
// por accidente.
//
// Estas piezas van siempre directo al link cargado por su comprador,
// para cualquiera que las toque — coherente con vender solo el hardware,
// sin portal ni panel detrás.

export async function activarAutogestion(
  slug: string,
  datos: { nombreNegocio: string; urlDestino: string; pin: string },
): Promise<LinkNFC> {
  const { hash, salt } = hashearPin(datos.pin);
  // Condición en el WHERE, no un chequeo previo: si dos pestañas activan la
  // misma pieza a la vez, solo una gana — la otra recibe este error en vez
  // de pisar el PIN que ya eligió la primera.
  const rows = await sql`
    UPDATE links_nfc SET
      autogestionado = TRUE,
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${datos.urlDestino},
      pin_hash = ${hash},
      pin_salt = ${salt}
    WHERE id = ${slug} AND comercio_id IS NULL AND autogestionado = FALSE
    RETURNING id
  `;
  if (rows.length === 0) {
    throw new Error("Esta pieza ya fue activada, o no está disponible para autogestión.");
  }
  const l = await getLink(slug);
  if (!l) throw new Error(`Pieza no encontrada: ${slug}`);
  return l;
}

export async function editarAutogestion(
  slug: string,
  pin: string,
  datos: { nombreNegocio: string; urlDestino: string },
): Promise<LinkNFC> {
  const rows = await sql`
    SELECT pin_hash, pin_salt FROM links_nfc
    WHERE id = ${slug} AND comercio_id IS NULL AND autogestionado = TRUE
  `;
  if (rows.length === 0) throw new Error("Pieza no encontrada o todavía no fue activada.");
  const pinHash = rows[0].pin_hash as string | null;
  const pinSalt = rows[0].pin_salt as string | null;
  if (!pinHash || !pinSalt || !pinCoincide(pin, pinHash, pinSalt)) {
    throw new Error("PIN incorrecto.");
  }

  const actualizado = await sql`
    UPDATE links_nfc SET
      nombre_negocio = ${datos.nombreNegocio},
      url_destino = ${datos.urlDestino}
    WHERE id = ${slug}
    RETURNING id
  `;
  if (actualizado.length === 0) throw new Error(`Pieza no encontrada: ${slug}`);
  const l = await getLink(slug);
  if (!l) throw new Error(`Pieza no encontrada: ${slug}`);
  return l;
}

// ---------- Inventario de hardware (piezas pre-generadas en lote) ----------
// El circuito real: se generan N piezas ANTES de saber a qué cliente van
// (código fijo tipo "p-0001", listo para imprimir/programar), se mandan los
// QR al proveedor, y recién cuando se vende un cliente se ASIGNA una pieza
// libre — el código impreso nunca cambia, solo el destino al que redirige.

export interface PiezaHardware extends LinkNFC {
  clienteNombre: string | null;
}

function mapPiezaHardware(r: Record<string, unknown>): PiezaHardware {
  return { ...mapLink(r), clienteNombre: (r.cliente_nombre as string | null) ?? null };
}

/** Genera `cantidad` piezas nuevas, libres (sin cliente), con código fijo
 * correlativo ("p-0001", "p-0002"...) que continúa donde quedó el último
 * lote — nunca reutiliza un código ya emitido, aunque se hayan borrado
 * piezas viejas. */
export async function generarLotePiezas(
  cantidad: number,
  tipo: TipoSoporte,
  lote: string,
): Promise<PiezaHardware[]> {
  // Transacción + lock consultivo: dos lotes generándose a la vez leían el
  // mismo correlativo y colisionaban en la PK a mitad de lote, dejando el
  // inventario a medias. El lock es de transacción (se suelta solo) y
  // funciona igual detrás del pooler de Neon.
  const creadas = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('taply_lote_piezas'))`;

    const rows = await tx`
      SELECT id FROM links_nfc WHERE id LIKE 'p-%'
    `;
    let max = 0;
    for (const r of rows) {
      const m = /^p-(\d+)/.exec(r.id as string);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }

    // Sufijo random (no correlativo) en el propio id — es la URL pública
    // del /t/<id>, y la activación autogestionada de una pieza libre no
    // pide más prueba que "conocer el id" (ver ActivarCartel). Si fuera
    // puramente secuencial, cualquiera podría enumerar p-0001, p-0002... y
    // reclamar piezas libres (inclusive las que la agencia ya reservó para
    // un cliente real) antes de que su dueño real las escanee. El prefijo
    // "p-0001" se mantiene al frente solo para que el inventario impreso
    // siga siendo legible/ordenable a simple vista.
    const nuevas: string[] = [];
    for (let i = 1; i <= cantidad; i++) {
      const numero = String(max + i).padStart(4, "0");
      nuevas.push(`p-${numero}-${crypto.randomBytes(3).toString("hex")}`);
    }

    for (const id of nuevas) {
      await tx`
        INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino)
        VALUES (${id}, NULL, '', ${tipo}, ${lote}, 'resena')
      `;
    }

    return tx`SELECT *, 0 AS taps FROM links_nfc WHERE id = ANY(${nuevas})`;
  });
  return creadas.map(mapPiezaHardware);
}

/** Todo el inventario de hardware — libre y asignado, de todos los
 * clientes — para saber de un vistazo cuántas piezas hay, cuáles están
 * libres y a quién le toca cada una de las asignadas. */
export async function getInventarioHardware(): Promise<PiezaHardware[]> {
  const rows = await sql`
    SELECT l.*, co.nombre AS cliente_nombre, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN comercios co ON co.id = l.comercio_id
    LEFT JOIN taps t ON t.link_id = l.id
    GROUP BY l.id, co.nombre
    ORDER BY (l.comercio_id IS NULL) DESC, l.id ASC
  `;
  return rows.map(mapPiezaHardware);
}

/** Asigna una pieza libre del inventario a un cliente — el código (y por lo
 * tanto el QR/NFC ya impreso) no cambia, solo pasa de "libre" a
 * pertenecerle a ese comercio con su etiqueta/destino. Falla si la pieza ya
 * estaba asignada, para no pisar una asignación existente por error. */
export async function asignarPiezaACliente(
  id: string,
  comercioId: string,
  datos: {
    etiqueta: string;
    tipo?: TipoSoporte;
    destino: DestinoLink;
    urlDestino?: string | null;
  },
): Promise<LinkNFC> {
  const rows = await sql`
    UPDATE links_nfc SET
      comercio_id = ${comercioId},
      etiqueta = ${datos.etiqueta},
      tipo = COALESCE(${datos.tipo ?? null}, tipo),
      destino = ${datos.destino},
      url_destino = ${limpiarUrl(datos.urlDestino) ?? null}
    WHERE id = ${id} AND comercio_id IS NULL
    RETURNING *
  `;
  if (rows.length === 0) {
    throw new Error("Esa pieza no está libre (ya fue asignada, o el código no existe).");
  }
  const l = await getLink(id);
  if (!l) throw new Error(`Pieza no encontrada: ${id}`);
  return l;
}

/** Pone una pieza bajo un cliente de agencia, sin importar el estado en el
 * que estuviera antes — a diferencia de asignarPiezaACliente (que exige
 * que esté libre y nunca autogestionada), esta cubre dos correcciones:
 * 1. Ya asignada al comercio equivocado (ej. la imprenta mezcló los
 *    números de un lote) — se mueve al correcto.
 * 2. Alguien tocó el cartel y completó por error el formulario de
 *    autoactivación (canal Mercado Libre) de una pieza que en realidad es
 *    de un cliente de agencia — se "desautogestiona": limpia el PIN y el
 *    nombre de negocio que haya cargado esa persona, para que no pueda
 *    seguir editándola desde /t/<id>/editar con ese PIN.
 * En los dos casos, el código de la pieza (y por lo tanto el QR/NFC ya
 * impreso) nunca cambia, solo a quién pertenece. Reinicia nombreEmpleado
 * (la tarjeta personal de un mozo del dueño anterior no tiene sentido acá)
 * y, sin urlDestino explícita, borra la que tuviera cargada para que caiga
 * en la reseña de Google del cliente nuevo. */
export async function reasignarPieza(
  id: string,
  nuevoComercioId: string,
  datos: { etiqueta: string; destino?: DestinoLink; urlDestino?: string | null },
): Promise<LinkNFC> {
  const rows = await sql`
    UPDATE links_nfc SET
      comercio_id = ${nuevoComercioId},
      etiqueta = ${datos.etiqueta},
      destino = ${datos.destino ?? "resena"},
      url_destino = ${limpiarUrl(datos.urlDestino ?? null)},
      nombre_empleado = '',
      autogestionado = FALSE,
      nombre_negocio = '',
      pin_hash = NULL,
      pin_salt = NULL
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Pieza no encontrada: ${id}`);
  const l = await getLink(id);
  if (!l) throw new Error(`Pieza no encontrada: ${id}`);
  return l;
}

export async function registrarTap(linkId: string, userAgent: string | null): Promise<void> {
  await sql`INSERT INTO taps (link_id, user_agent) VALUES (${linkId}, ${userAgent})`;
}

export interface TapsPorDia {
  fecha: string;
  taps: number;
}

// Los timestamps se guardan en UTC (TIMESTAMPTZ) pero los comercios y sus
// clientes viven en Argentina (UTC-3): agrupar por t.creado_en::date pelado
// usa la fecha UTC, y un tap de las 21:00-23:59 locales caía en el día
// SIGUIENTE del gráfico. Todo lo que agrupa por día/hora convierte antes.
const TZ_COMERCIO = "America/Argentina/Cordoba";

export async function getTapsPorDia(comercioId: string, dias = 14): Promise<TapsPorDia[]> {
  const rows = await sql`
    SELECT to_char((t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date, 'YYYY-MM-DD') AS fecha, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha as string, taps: Number(r.taps) }));
}

export interface TapsPorDiaSoporte {
  fecha: string;
  nfc: number;
  qr: number;
}

/** Igual que getTapsPorDia, pero separando cuánto vino de un link puramente
 * NFC vs. uno con QR habilitado (tipo 'qr' o 'ambos') — para el portal del
 * cliente. Un link 'ambos' no permite saber si ESE tap puntual fue toque o
 * escaneo (Google/nosotros no lo distinguimos), así que cuenta del lado QR
 * como aproximación honesta, no como atribución exacta. */
export async function getTapsPorDiaPorSoporte(comercioId: string, dias = 14): Promise<TapsPorDiaSoporte[]> {
  const rows = await sql`
    SELECT
      to_char((t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date, 'YYYY-MM-DD') AS fecha,
      COUNT(*) FILTER (WHERE l.tipo = 'nfc')::int AS nfc,
      COUNT(*) FILTER (WHERE l.tipo IN ('qr', 'ambos'))::int AS qr
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND t.creado_en >= now() - (${dias}::text || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({ fecha: r.fecha as string, nfc: Number(r.nfc), qr: Number(r.qr) }));
}

export interface TapsPorHora {
  hora: number; // 0-23, hora local del comercio en el momento del tap
  taps: number;
}

/** Desglose hora a hora de un día puntual — para expandir el panel de
 * "Taps por día" del portal. Siempre devuelve las 24 horas (con 0 en las
 * que no hubo nada), así el gráfico no salta huecos. */
export async function getTapsPorHora(comercioId: string, fecha: string): Promise<TapsPorHora[]> {
  const rows = await sql`
    SELECT EXTRACT(HOUR FROM t.creado_en AT TIME ZONE ${TZ_COMERCIO})::int AS hora, COUNT(*)::int AS taps
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    WHERE l.comercio_id = ${comercioId}
      AND (t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date = ${fecha}::date
    GROUP BY 1
  `;
  const porHora = new Map(rows.map((r) => [Number(r.hora), Number(r.taps)]));
  return Array.from({ length: 24 }, (_, hora) => ({ hora, taps: porHora.get(hora) ?? 0 }));
}

export interface TapsResumenPeriodo {
  nfc: number;
  qr: number; // incluye tipo 'ambos' — ver nota en getTapsPorDiaPorSoporte
}

/** Taps de toda la cartera (solo comercios activos) en un rango de
 * fechas — para el panel unificado de admin. */
export async function getTapsResumenPortfolio(desde: string, hasta: string): Promise<TapsResumenPeriodo> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE l.tipo = 'nfc')::int AS nfc,
      COUNT(*) FILTER (WHERE l.tipo IN ('qr', 'ambos'))::int AS qr
    FROM taps t
    JOIN links_nfc l ON l.id = t.link_id
    JOIN comercios c ON c.id = l.comercio_id
    WHERE c.estado = 'activo'
      AND (t.creado_en AT TIME ZONE ${TZ_COMERCIO})::date BETWEEN ${desde}::date AND ${hasta}::date
  `;
  return { nfc: Number(rows[0]?.nfc ?? 0), qr: Number(rows[0]?.qr ?? 0) };
}

export interface VisitasPerfilPortfolio {
  total: number;
  porCliente: { comercioId: string; nombre: string; visitas: number }[];
}

/** Visitas al perfil de Google de toda la cartera (solo comercios
 * activos), sumadas mes a mes entre `mesDesde` y `mesHasta` ('YYYY-MM') —
 * es el dato más fino que hay (metricas_mensuales es mensual, no diario),
 * así que un período de menos de un mes cae igual en el mes que lo
 * contiene. Devuelve el desglose por cliente para poder discriminar. */
export async function getVisitasPerfilPortfolio(
  mesDesde: string,
  mesHasta: string,
): Promise<VisitasPerfilPortfolio> {
  const rows = await sql`
    SELECT c.id AS comercio_id, c.nombre, COALESCE(SUM(m.visitas_perfil), 0)::int AS visitas
    FROM comercios c
    LEFT JOIN metricas_mensuales m
      ON m.comercio_id = c.id AND m.mes BETWEEN ${mesDesde} AND ${mesHasta}
    WHERE c.estado = 'activo'
    GROUP BY c.id, c.nombre
    ORDER BY visitas DESC, c.nombre ASC
  `;
  const porCliente = rows.map((r) => ({
    comercioId: r.comercio_id as string,
    nombre: r.nombre as string,
    visitas: Number(r.visitas),
  }));
  const total = porCliente.reduce((acc, r) => acc + r.visitas, 0);
  return { total, porCliente };
}
