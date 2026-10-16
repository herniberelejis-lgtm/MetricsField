// Catálogo de la tienda propia. Es la única fuente de precios: el carrito del
// navegador solo manda slugs y cantidades, y el total se recalcula acá.
// Precios en pesos argentinos, IVA no incluido (igual que en el resto del
// sitio). Las mismas piezas sirven para Reviews y, cuando salga, Loyalty.

export type SlugProducto = "standee" | "tarjeta" | "sticker";

export interface Producto {
  slug: SlugProducto;
  nombre: string;
  /** Para qué momento del local sirve, en una frase. */
  momento: string;
  descripcion: string;
  detalles: string[];
  precioCentavos: number;
  imagen: string;
  imagenAlt: string;
}

export const PRODUCTOS: readonly Producto[] = [
  {
    slug: "standee",
    nombre: "Standee de acrílico",
    momento: "En la caja, mientras el cliente espera el ticket.",
    descripcion:
      "Cartel de mostrador con NFC y QR. El cliente acerca el celular y llega directo a tu ficha de Google.",
    detalles: ["NFC + QR de respaldo", "Sin batería ni mantenimiento", "Destino editable sin reimprimir"],
    precioCentavos: 25_000_00,
    imagen: "/sitio/img/standee.webp",
    imagenAlt: "Standee de acrílico con NFC y QR apoyado en un mostrador",
  },
  {
    slug: "tarjeta",
    nombre: "Tarjeta PVC",
    momento: "En la mesa, junto con la cuenta.",
    descripcion:
      "Tarjeta del tamaño de una de crédito para que el mozo la acerque al cliente al cobrar.",
    detalles: ["8,5 × 5,4 cm", "NFC + QR de respaldo", "Una por mozo"],
    precioCentavos: 7_000_00,
    imagen: "/sitio/img/tarjeta.webp",
    imagenAlt: "Mano entregando una tarjeta NFC sobre una mesa de madera",
  },
  {
    slug: "sticker",
    nombre: "Sticker resistente",
    momento: "Pegado en la mesa, la barra o el mostrador.",
    descripcion: "Sticker de 10 × 10 cm con NFC y QR, para superficies lisas que no sean de metal.",
    detalles: ["10 × 10 cm", "NFC + QR de respaldo", "No funciona sobre metal"],
    precioCentavos: 10_000_00,
    imagen: "/sitio/img/sticker.webp",
    imagenAlt: "Sticker cuadrado con NFC y QR sobre una mesa de madera",
  },
] as const;

/** Máximo de unidades por producto en un pedido online. Pedidos más grandes
 * se arreglan por WhatsApp (precio por volumen, armado de stock). */
export const MAX_POR_PRODUCTO = 50;

/** Costo de envío fuera de Córdoba en centavos. `null` = todavía no está
 * definido: el pedido se paga sin envío y el envío se coordina por WhatsApp.
 * [CONFIRMAR] empresa de envíos y tarifa antes de lanzar. */
export const ENVIO_NACIONAL_CENTAVOS: number | null = null;

/** IVA que se suma al precio de lista al cobrar (los precios se publican
 * "IVA no incluido"). [CONFIRMAR] con el contador según la condición fiscal
 * y el tipo de factura que se emita. */
export const IVA_PORCENTAJE = 21;

export function productoPorSlug(slug: string): Producto | undefined {
  return PRODUCTOS.find((p) => p.slug === slug);
}
