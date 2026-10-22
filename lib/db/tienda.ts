import "server-only";
import crypto from "node:crypto";
import { sql } from "../sql";
import type { Comprador, Entrega, LineaPedido, Totales } from "../tienda/pedido";

// Pedidos de la tienda propia (migración 017_tienda_pedidos.sql). Mismo
// patrón que el resto de lib/db/: SQL directo y mapeo explícito.

export type EstadoPedido = "pendiente" | "pagado" | "rechazado" | "cancelado" | "enviado" | "entregado";

export interface ItemPedido {
  producto: string;
  nombre: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}

export interface Pedido {
  id: number;
  token: string;
  estado: EstadoPedido;
  nombre: string;
  email: string;
  whatsapp: string;
  cuit: string | null;
  entrega: Entrega;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  subtotalCentavos: number;
  ivaCentavos: number;
  envioCentavos: number | null;
  totalCentavos: number;
  mpPagoId: string | null;
  creadoEn: Date;
  items: ItemPedido[];
}

function mapPedido(r: Record<string, unknown>, items: ItemPedido[]): Pedido {
  return {
    id: Number(r.id),
    token: r.token as string,
    estado: r.estado as EstadoPedido,
    nombre: r.nombre as string,
    email: r.email as string,
    whatsapp: r.whatsapp as string,
    cuit: (r.cuit as string | null) ?? null,
    entrega: r.entrega as Entrega,
    direccion: (r.direccion as string | null) ?? null,
    localidad: (r.localidad as string | null) ?? null,
    provincia: (r.provincia as string | null) ?? null,
    codigoPostal: (r.codigo_postal as string | null) ?? null,
    subtotalCentavos: Number(r.subtotal_centavos),
    ivaCentavos: Number(r.iva_centavos),
    envioCentavos: r.envio_centavos === null ? null : Number(r.envio_centavos),
    totalCentavos: Number(r.total_centavos),
    mpPagoId: (r.mp_pago_id as string | null) ?? null,
    creadoEn: new Date(r.creado_en as string),
    items,
  };
}

/** Crea el pedido con sus líneas en una sola transacción y devuelve el
 * token público (32 bytes aleatorios, la credencial de /pedido/<token>). */
export async function crearPedido(
  comprador: Comprador,
  lineas: readonly LineaPedido[],
  totales: Totales,
  origen: string | null,
): Promise<string> {
  const token = crypto.randomBytes(24).toString("base64url");
  await sql.begin(async (tx) => {
    const [fila] = await tx`
      INSERT INTO pedidos (token, nombre, email, whatsapp, cuit, entrega, direccion, localidad,
        provincia, codigo_postal, subtotal_centavos, iva_centavos, envio_centavos, total_centavos, origen)
      VALUES (${token}, ${comprador.nombre}, ${comprador.email}, ${comprador.whatsapp}, ${comprador.cuit},
        ${comprador.entrega}, ${comprador.direccion}, ${comprador.localidad}, ${comprador.provincia},
        ${comprador.codigoPostal}, ${totales.subtotalCentavos}, ${totales.ivaCentavos},
        ${totales.envioCentavos}, ${totales.totalCentavos}, ${origen})
      RETURNING id`;
    for (const l of lineas) {
      await tx`
        INSERT INTO pedido_items (pedido_id, producto, nombre, cantidad, precio_unitario_centavos)
        VALUES (${fila.id}, ${l.slug}, ${l.nombre}, ${l.cantidad}, ${l.precioUnitarioCentavos})`;
    }
  });
  return token;
}

export async function getPedidoPorToken(token: string): Promise<Pedido | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [r] = await sql`SELECT * FROM pedidos WHERE token = ${token}`;
  if (!r) return null;
  const items = await sql`
    SELECT producto, nombre, cantidad, precio_unitario_centavos
    FROM pedido_items WHERE pedido_id = ${r.id} ORDER BY id`;
  return mapPedido(
    r,
    items.map((i) => ({
      producto: i.producto as string,
      nombre: i.nombre as string,
      cantidad: Number(i.cantidad),
      precioUnitarioCentavos: Number(i.precio_unitario_centavos),
    })),
  );
}

export async function guardarPreferencia(token: string, preferenciaId: string): Promise<void> {
  await sql`UPDATE pedidos SET mp_preferencia_id = ${preferenciaId}, actualizado_en = now() WHERE token = ${token}`;
}

/** Aplica el resultado de un pago. Solo avanza desde 'pendiente' o
 * 'rechazado': un pedido ya pagado, enviado o entregado no retrocede por una
 * notificación vieja o repetida. Devuelve true si cambió algo. */
export async function registrarPago(
  token: string,
  pagoId: string,
  estado: "pagado" | "rechazado",
): Promise<boolean> {
  const filas = await sql`
    UPDATE pedidos SET estado = ${estado}, mp_pago_id = ${pagoId}, actualizado_en = now()
    WHERE token = ${token} AND estado IN ('pendiente', 'rechazado')
    RETURNING id`;
  return filas.length > 0;
}

export async function getPedidosRecientes(limite = 100): Promise<Pedido[]> {
  const filas = await sql`SELECT * FROM pedidos ORDER BY creado_en DESC LIMIT ${limite}`;
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.id as number);
  const items = await sql`
    SELECT pedido_id, producto, nombre, cantidad, precio_unitario_centavos
    FROM pedido_items WHERE pedido_id = ANY(${ids}) ORDER BY id`;
  return filas.map((f) =>
    mapPedido(
      f,
      items
        .filter((i) => Number(i.pedido_id) === Number(f.id))
        .map((i) => ({
          producto: i.producto as string,
          nombre: i.nombre as string,
          cantidad: Number(i.cantidad),
          precioUnitarioCentavos: Number(i.precio_unitario_centavos),
        })),
    ),
  );
}
