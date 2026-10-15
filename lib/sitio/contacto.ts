import { waUrl } from "../whatsapp";

// Datos de contacto y links del sitio público. El mensaje de WhatsApp lleva
// siempre el producto y la sección de origen, así se sabe qué botón convierte
// sin ninguna herramienta extra.

export const WHATSAPP = "5493515191716";
export const WHATSAPP_VISIBLE = "+54 9 351 519-1716";
export const EMAIL = "info@metricsfield.com";
export const INSTAGRAM = "https://instagram.com/metricsfield";
export const URL_RETAIL = "https://retail.metricsfield.com";
export const URL_PANEL = "https://app.metricsfield.com";

/** Ruta de la home del sitio. En producción metricsfield.com/ se reescribe
 * a /sitio (next.config.ts), así que es "/". En local y en previews, donde
 * "/" es la home del panel, poné NEXT_PUBLIC_SITIO_INICIO=/sitio. */
export const INICIO = process.env.NEXT_PUBLIC_SITIO_INICIO || "/";

/** Origen público de la tienda, para las URLs de vuelta y de aviso de
 * Mercado Pago y los links de los emails. Nunca se arma con el Host del
 * request: un Host falso podría mandar al comprador a otro dominio. */
export function urlSitio(): string {
  return (process.env.NEXT_PUBLIC_SITIO_URL || "https://metricsfield.com").replace(/\/+$/, "");
}

export type Vertical = "Reviews" | "Retail" | "Loyalty" | "Intel" | "la tienda" | "MetricsField";

export function waVertical(vertical: Vertical, seccion: string, pedido = "más información"): string {
  return waUrl(WHATSAPP, `Hola! Quiero ${pedido} de ${vertical}. Vengo de la web (${seccion}).`);
}
