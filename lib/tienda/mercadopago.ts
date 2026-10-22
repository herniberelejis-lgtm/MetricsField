import "server-only";
import crypto from "node:crypto";
import type { LineaPedido, Totales } from "./pedido";

// Cliente mínimo de Mercado Pago Checkout Pro (redirección): crear la
// preferencia de pago, leer un pago y verificar la firma del webhook. Sin
// SDK: son tres llamadas REST y así no sumamos una dependencia.
//
// Variables de entorno:
//   MERCADOPAGO_ACCESS_TOKEN    obligatoria para cobrar (TEST-… en previews)
//   MERCADOPAGO_WEBHOOK_SECRET  clave secreta de la firma de notificaciones
// Sin token, la tienda sigue funcionando pero ofrece cerrar por WhatsApp.

const API = "https://api.mercadopago.com";

export function mercadoPagoConfigurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  return t;
}

const pesos = (centavos: number) => Math.round(centavos) / 100;

export interface PreferenciaCreada {
  id: string;
  urlPago: string;
}

export async function crearPreferencia(opts: {
  tokenPedido: string;
  lineas: readonly LineaPedido[];
  totales: Totales;
  comprador: { nombre: string; email: string };
  baseUrl: string;
}): Promise<PreferenciaCreada> {
  const items: { id: string; title: string; quantity: number; unit_price: number; currency_id: string }[] = opts.lineas.map((l) => ({
    id: l.slug,
    title: l.nombre,
    quantity: l.cantidad,
    unit_price: pesos(l.precioUnitarioCentavos),
    currency_id: "ARS",
  }));
  if (opts.totales.ivaCentavos > 0) {
    items.push({ id: "iva", title: "IVA", quantity: 1, unit_price: pesos(opts.totales.ivaCentavos), currency_id: "ARS" });
  }
  if (opts.totales.envioCentavos) {
    items.push({ id: "envio", title: "Envío", quantity: 1, unit_price: pesos(opts.totales.envioCentavos), currency_id: "ARS" });
  }
  const volver = `${opts.baseUrl}/pedido/${opts.tokenPedido}`;
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      // Un reintento con la misma clave no crea una segunda preferencia.
      "X-Idempotency-Key": `pedido-${opts.tokenPedido}`,
    },
    body: JSON.stringify({
      items,
      payer: { name: opts.comprador.nombre, email: opts.comprador.email },
      external_reference: opts.tokenPedido,
      back_urls: { success: volver, pending: volver, failure: volver },
      auto_return: "approved",
      notification_url: `${opts.baseUrl}/api/tienda/webhook`,
      statement_descriptor: "METRICSFIELD",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status} al crear la preferencia`);
  const j = (await res.json()) as { id?: string; init_point?: string; sandbox_init_point?: string };
  // Con credenciales de prueba (TEST-…) hay que usar el checkout de sandbox.
  const url = token().startsWith("TEST-") ? j.sandbox_init_point : j.init_point;
  if (!j.id || !url) throw new Error("Mercado Pago no devolvió el link de pago");
  return { id: j.id, urlPago: url };
}

export interface PagoMP {
  id: string;
  estado: string;
  referencia: string | null;
  montoCentavos: number;
  moneda: string;
}

/** Lee el pago desde Mercado Pago. El estado SIEMPRE sale de acá, nunca de
 * los parámetros de la URL de vuelta, que el comprador puede editar. */
export async function obtenerPago(idPago: string): Promise<PagoMP | null> {
  if (!/^\d{1,20}$/.test(idPago)) return null;
  const res = await fetch(`${API}/v1/payments/${idPago}`, {
    headers: { Authorization: `Bearer ${token()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status} al leer el pago`);
  const j = (await res.json()) as {
    id: number;
    status: string;
    external_reference?: string | null;
    transaction_amount: number;
    currency_id: string;
  };
  return {
    id: String(j.id),
    estado: j.status,
    referencia: j.external_reference ?? null,
    montoCentavos: Math.round(j.transaction_amount * 100),
    moneda: j.currency_id,
  };
}

/** Verifica el header x-signature de una notificación de Mercado Pago
 * (HMAC-SHA256 del manifiesto `id:…;request-id:…;ts:…;`). Rechaza firmas de
 * más de 10 minutos para que una notificación capturada no se pueda reenviar
 * más tarde. */
export function firmaWebhookValida(opts: {
  firma: string | null;
  requestId: string | null;
  dataId: string | null;
  secreto: string;
  ahoraMs?: number;
}): boolean {
  if (!opts.firma || !opts.dataId || !opts.secreto) return false;
  const partes = new Map(
    opts.firma.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")] as const;
    }),
  );
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const tsMs = ts.length > 11 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs((opts.ahoraMs ?? Date.now()) - tsMs) > 10 * 60_000) return false;
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifiesto = `id:${id};`;
  if (opts.requestId) manifiesto += `request-id:${opts.requestId};`;
  manifiesto += `ts:${ts};`;
  const esperado = crypto.createHmac("sha256", opts.secreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1.toLowerCase(), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
