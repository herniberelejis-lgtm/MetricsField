"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calcularTotales, lineasDesdeCarrito, validarComprador } from "@/lib/tienda/pedido";
import { crearPedido, guardarPreferencia } from "@/lib/db/tienda";
import { crearPreferencia, mercadoPagoConfigurado } from "@/lib/tienda/mercadopago";
import { ipDelRequest, permitir } from "@/lib/ratelimit";
import { reportarFalla } from "@/lib/monitor";
import { urlSitio } from "@/lib/sitio/contacto";

// Acción pública de la tienda: valida el formulario, recalcula el total con
// el catálogo del servidor, guarda el pedido y manda a pagar a Mercado Pago.
// Limitada por IP para que nadie llene la tabla de pedidos con un script.

export interface EstadoCompra {
  error: string | null;
  /** Lo que escribió el comprador, para no borrarle el formulario si hay error. */
  valores?: Record<string, string>;
}

const CAMPOS = ["nombre", "email", "whatsapp", "cuit", "direccion", "localidad", "provincia", "codigo_postal"] as const;

function conValores(form: FormData, error: string): EstadoCompra {
  const valores: Record<string, string> = {};
  for (const c of CAMPOS) valores[c] = String(form.get(c) ?? "").slice(0, 200);
  return { error, valores };
}

export async function comprar(_previo: EstadoCompra, form: FormData): Promise<EstadoCompra> {
  const h = await headers();
  if (!(await permitir(`tienda:${ipDelRequest(h)}`, 8, 10 * 60_000))) {
    return conValores(form, "Hiciste muchos intentos seguidos. Esperá unos minutos o escribinos por WhatsApp.");
  }

  const carritoCrudo = String(form.get("carrito") ?? "[]");
  if (carritoCrudo.length > 2_000) return conValores(form, "El carrito es demasiado grande. Escribinos por WhatsApp.");
  let carrito: unknown;
  try {
    carrito = JSON.parse(carritoCrudo);
  } catch {
    return conValores(form, "No pudimos leer el carrito. Recargá la página.");
  }
  const lineas = lineasDesdeCarrito(carrito);
  if (!lineas.ok) return conValores(form, lineas.error);
  const comprador = validarComprador(form);
  if (!comprador.ok) return conValores(form, comprador.error);
  if (!mercadoPagoConfigurado()) {
    return conValores(form, "El pago online todavía no está habilitado. Escribinos por WhatsApp y cerramos tu pedido.");
  }

  const totales = calcularTotales(lineas.valor, comprador.valor.entrega);
  const origen = String(form.get("origen") ?? "").slice(0, 60) || null;
  let urlPago: string;
  try {
    const token = await crearPedido(comprador.valor, lineas.valor, totales, origen);
    const baseUrl = urlSitio();
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
    return conValores(form, "No pudimos iniciar el pago. Probá de nuevo en un rato o escribinos por WhatsApp.");
  }
  // redirect() lanza su propia excepción: va fuera del try.
  redirect(urlPago);
}
