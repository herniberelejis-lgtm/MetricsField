import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { calcularTotales, lineasDesdeCarrito, validarComprador } from "@/lib/tienda/pedido";
import { firmaWebhookValida } from "@/lib/tienda/mercadopago";
import { IVA_PORCENTAJE, PRODUCTOS } from "@/lib/tienda/catalogo";

// Lo que, si se rompe, deja comprar a otro precio o marcar como pagado un
// pedido que no se pagó.

const standee = PRODUCTOS.find((p) => p.slug === "standee")!;

describe("lineasDesdeCarrito", () => {
  it("usa el precio del catálogo e ignora cualquier precio que mande el navegador", () => {
    const r = lineasDesdeCarrito([{ slug: "standee", cantidad: 2, precio: 1 }]);
    expect(r.ok && r.valor[0].precioUnitarioCentavos).toBe(standee.precioCentavos);
  });

  it("suma las líneas repetidas del mismo producto", () => {
    const r = lineasDesdeCarrito([{ slug: "tarjeta", cantidad: 2 }, { slug: "tarjeta", cantidad: 3 }]);
    expect(r.ok && r.valor).toEqual([expect.objectContaining({ slug: "tarjeta", cantidad: 5 })]);
  });

  it.each([
    [[], "vacío"],
    ["no es una lista", "texto"],
    [[{ slug: "inventado", cantidad: 1 }], "producto desconocido"],
    [[{ slug: "standee", cantidad: 0 }], "cantidad cero"],
    [[{ slug: "standee", cantidad: -3 }], "cantidad negativa"],
    [[{ slug: "standee", cantidad: 1.5 }], "cantidad fraccionaria"],
    [[{ slug: "standee", cantidad: 51 }], "más del máximo"],
  ] as [unknown, string][])("rechaza un carrito inválido (%s)", (carrito) => {
    expect(lineasDesdeCarrito(carrito).ok).toBe(false);
  });
});

describe("calcularTotales", () => {
  it("suma IVA y no cobra la instalación en Córdoba", () => {
    const r = lineasDesdeCarrito([{ slug: "standee", cantidad: 1 }, { slug: "sticker", cantidad: 2 }]);
    if (!r.ok) throw new Error(r.error);
    const t = calcularTotales(r.valor, "instalacion_cordoba");
    expect(t.subtotalCentavos).toBe(45_000_00);
    expect(t.ivaCentavos).toBe(Math.round((45_000_00 * IVA_PORCENTAJE) / 100));
    expect(t.envioCentavos).toBe(0);
    expect(t.totalCentavos).toBe(t.subtotalCentavos + t.ivaCentavos);
  });
});

function form(datos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(datos)) f.set(k, v);
  return f;
}

const BASE = { nombre: "Café Ejemplo", email: "dueno@ejemplo.com", whatsapp: "351 555 1234", direccion: "Av. Siempre Viva 123" };

describe("validarComprador", () => {
  it("acepta una compra con instalación en Córdoba", () => {
    expect(validarComprador(form({ ...BASE, entrega: "instalacion_cordoba" })).ok).toBe(true);
  });

  it("pide localidad, provincia y código postal para envío nacional", () => {
    expect(validarComprador(form({ ...BASE, entrega: "envio_nacional" })).ok).toBe(false);
    const ok = validarComprador(form({ ...BASE, entrega: "envio_nacional", localidad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000" }));
    expect(ok.ok).toBe(true);
  });

  it("rechaza email, CUIT o forma de entrega inválidos", () => {
    expect(validarComprador(form({ ...BASE, entrega: "instalacion_cordoba", email: "no-es-mail" })).ok).toBe(false);
    expect(validarComprador(form({ ...BASE, entrega: "instalacion_cordoba", cuit: "123" })).ok).toBe(false);
    expect(validarComprador(form({ ...BASE, entrega: "a la luna" })).ok).toBe(false);
  });
});

describe("firmaWebhookValida", () => {
  const secreto = "clave-de-prueba";
  const ahora = 1_760_000_000_000;
  const ts = String(ahora);
  function firmar(id: string, requestId: string, t = ts) {
    const v1 = crypto.createHmac("sha256", secreto).update(`id:${id};request-id:${requestId};ts:${t};`).digest("hex");
    return `ts=${t},v1=${v1}`;
  }

  it("acepta una firma correcta", () => {
    expect(firmaWebhookValida({ firma: firmar("123", "req-1"), requestId: "req-1", dataId: "123", secreto, ahoraMs: ahora })).toBe(true);
  });

  it("rechaza firma de otro pago, otro request, clave equivocada o vieja", () => {
    const firma = firmar("123", "req-1");
    expect(firmaWebhookValida({ firma, requestId: "req-1", dataId: "999", secreto, ahoraMs: ahora })).toBe(false);
    expect(firmaWebhookValida({ firma, requestId: "req-2", dataId: "123", secreto, ahoraMs: ahora })).toBe(false);
    expect(firmaWebhookValida({ firma, requestId: "req-1", dataId: "123", secreto: "otra", ahoraMs: ahora })).toBe(false);
    expect(firmaWebhookValida({ firma, requestId: "req-1", dataId: "123", secreto, ahoraMs: ahora + 11 * 60_000 })).toBe(false);
  });

  it("rechaza headers faltantes o mal formados", () => {
    expect(firmaWebhookValida({ firma: null, requestId: "r", dataId: "1", secreto, ahoraMs: ahora })).toBe(false);
    expect(firmaWebhookValida({ firma: "basura", requestId: "r", dataId: "1", secreto, ahoraMs: ahora })).toBe(false);
    expect(firmaWebhookValida({ firma: `ts=${ts},v1=zz`, requestId: "r", dataId: "1", secreto, ahoraMs: ahora })).toBe(false);
  });
});
