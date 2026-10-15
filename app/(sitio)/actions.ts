"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calcularTotales, lineasDesdeCarrito, validarComprador } from "@/lib/tienda/pedido";
import { crearPedido, guardarPreferencia } from "@/lib/db/tienda";
import { crearPreferencia, mercadoPagoConfigurado } from "@/lib/tienda/mercadopago";
import { ipDelRequest, permitir } from "@/lib/ratelimit";
import { reportarFalla } from "@/lib/monitor";

// Acción pública de la tienda: valida el formulario, recalcula el total con
// el catálogo del servidor, guarda el pedido y manda a pagar a Mercado Pago.
// Limitada por IP para que nadie llene la tabla de pedidos con un script.

export interface EstadoCompra {
  error: string | null;
}

export async function comprar(_previo: EstadoCompra, form: FormData): Promise<EstadoCompra> {
  const h = await headers();
  if (!(await permitir(`tienda:${ipDelRequest(h)}`, 8, 10 * 60_000))) {
    return { error: "Hiciste muchos intentos seguidos. Esperá unos minutos o escribinos por WhatsApp." };
  }

  let carrito: unknown;
  try {
    carrito = JSON.parse(String(form.get("carrito") ?? "[]"));
  } catch {
    return { error: "No pudimos leer el carrito. Recargá la página." };
  }
  const lineas = lineasDesdeCarrito(carrito);
  if (!lineas.ok) return { error: lineas.error };
  const comprador = validarComprador(form);
  if (!comprador.ok) return { error: comprador.error };
  if (!mercadoPagoConfigurado()) {
    return { error: "El pago online todavía no está habilitado. Escribinos por WhatsApp y cerramos tu pedido." };
  }

  const totales = calcularTotales(lineas.valor, comprador.valor.entrega);
  const origen = String(form.get("origen") ?? "").slice(0, 60) || null;
  let urlPago: string;
  try {
    const token = await crearPedido(comprador.valor, lineas.valor, totales, origen);
    const proto = h.get("x-forwarded-proto") ?? "https";
    const baseUrl = (process.env.NEXT_PUBLIC_SITIO_URL || `${proto}://${h.get("host")}`).replace(/\/+$/, "");
    const pref = await crearPreferencia({
      tokenPedido: token,
      lineas: lineas.valor,
      totales,
      comprador: { nombre: comprador.valor.nombre, email: comprador.valor.email },
      baseUrl,
    });
    await guardarPreferencia(token, pref.id);
    urlPago = pref.urlPago;
  } catch (err) {
    await reportarFalla("tienda/comprar", err);
    return { error: "No pudimos iniciar el pago. Probá de nuevo en un rato o escribinos por WhatsApp." };
  }
  // redirect() lanza su propia excepción: va fuera del try.
  redirect(urlPago);
}
