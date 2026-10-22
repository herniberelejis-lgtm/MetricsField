import { ENVIO_NACIONAL_CENTAVOS, IVA_PORCENTAJE, MAX_POR_PRODUCTO, productoPorSlug, type SlugProducto } from "./catalogo";

// Reglas puras del pedido: validar lo que manda el navegador y calcular el
// total con el catálogo del servidor. Sin base de datos ni red, para poder
// testearlas (test/tienda-pedido.test.ts).

export type Entrega = "instalacion_cordoba" | "envio_nacional";

export interface LineaPedido {
  slug: SlugProducto;
  nombre: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}

export interface Comprador {
  nombre: string;
  email: string;
  whatsapp: string;
  cuit: string | null;
  entrega: Entrega;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
}

export interface Totales {
  subtotalCentavos: number;
  ivaCentavos: number;
  /** null = envío a coordinar, no se cobra en este pago. */
  envioCentavos: number | null;
  totalCentavos: number;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

/** Convierte el carrito crudo del navegador en líneas con precio del
 * servidor. Rechaza slugs desconocidos, cantidades fuera de rango y
 * duplicados (se suman). */
export function lineasDesdeCarrito(crudo: unknown): Resultado<LineaPedido[]> {
  if (!Array.isArray(crudo) || crudo.length === 0) return { ok: false, error: "El carrito está vacío." };
  if (crudo.length > 10) return { ok: false, error: "Carrito inválido." };
  const cantidades = new Map<SlugProducto, number>();
  for (const item of crudo) {
    if (typeof item !== "object" || item === null) return { ok: false, error: "Carrito inválido." };
    const { slug, cantidad } = item as { slug?: unknown; cantidad?: unknown };
    const producto = typeof slug === "string" ? productoPorSlug(slug) : undefined;
    if (!producto) return { ok: false, error: "Hay un producto que ya no está en la tienda." };
    if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 1) {
      return { ok: false, error: "Cantidad inválida." };
    }
    cantidades.set(producto.slug, (cantidades.get(producto.slug) ?? 0) + cantidad);
  }
  const lineas: LineaPedido[] = [];
  for (const [slug, cantidad] of cantidades) {
    if (cantidad > MAX_POR_PRODUCTO) {
      return { ok: false, error: `Para más de ${MAX_POR_PRODUCTO} unidades escribinos por WhatsApp.` };
    }
    const p = productoPorSlug(slug)!;
    lineas.push({ slug, nombre: p.nombre, cantidad, precioUnitarioCentavos: p.precioCentavos });
  }
  return { ok: true, valor: lineas };
}

export function calcularTotales(lineas: readonly LineaPedido[], entrega: Entrega): Totales {
  const subtotalCentavos = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitarioCentavos, 0);
  // En Córdoba la entrega e instalación van incluidas. Fuera de Córdoba el
  // envío se cobra solo si ya hay una tarifa definida.
  const envioCentavos = entrega === "instalacion_cordoba" ? 0 : ENVIO_NACIONAL_CENTAVOS;
  const ivaCentavos = Math.round((subtotalCentavos * IVA_PORCENTAJE) / 100);
  return {
    subtotalCentavos,
    ivaCentavos,
    envioCentavos,
    totalCentavos: subtotalCentavos + ivaCentavos + (envioCentavos ?? 0),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Valida los datos del formulario de compra. Mensajes pensados para
 * mostrarse tal cual al comprador. */
export function validarComprador(form: FormData): Resultado<Comprador> {
  const nombre = texto(form.get("nombre"), 120);
  const email = texto(form.get("email"), 160).toLowerCase();
  const whatsappCrudo = texto(form.get("whatsapp"), 40);
  const whatsapp = whatsappCrudo.replace(/[^\d+]/g, "");
  const cuitCrudo = texto(form.get("cuit"), 20).replace(/\D/g, "");
  const entregaCruda = texto(form.get("entrega"), 30);

  if (nombre.length < 2) return { ok: false, error: "Escribí tu nombre o el de tu negocio." };
  if (!EMAIL.test(email)) return { ok: false, error: "Revisá el email: ahí te mandamos el comprobante." };
  if (whatsapp.replace(/\D/g, "").length < 8) return { ok: false, error: "Revisá el número de WhatsApp." };
  if (cuitCrudo && cuitCrudo.length !== 11) return { ok: false, error: "El CUIT tiene 11 números." };
  if (entregaCruda !== "instalacion_cordoba" && entregaCruda !== "envio_nacional") {
    return { ok: false, error: "Elegí cómo te llega el pedido." };
  }
  const entrega: Entrega = entregaCruda;
  const direccion = texto(form.get("direccion"), 200);
  const localidad = texto(form.get("localidad"), 100);
  const provincia = texto(form.get("provincia"), 60);
  const codigoPostal = texto(form.get("codigo_postal"), 10);
  if (direccion.length < 4) return { ok: false, error: "Escribí la dirección del local." };
  if (entrega === "envio_nacional" && (!localidad || !provincia || !codigoPostal)) {
    return { ok: false, error: "Para el envío necesitamos localidad, provincia y código postal." };
  }
  return {
    ok: true,
    valor: {
      nombre,
      email,
      whatsapp,
      cuit: cuitCrudo || null,
      entrega,
      direccion,
      localidad: entrega === "instalacion_cordoba" ? "Córdoba" : localidad,
      provincia: entrega === "instalacion_cordoba" ? "Córdoba" : provincia,
      codigoPostal: codigoPostal || null,
    },
  };
}

export function formatoPesos(centavos: number): string {
  return `$${Math.round(centavos / 100).toLocaleString("es-AR")}`;
}
