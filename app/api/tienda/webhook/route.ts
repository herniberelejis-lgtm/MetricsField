import { NextResponse, type NextRequest } from "next/server";
import { firmaWebhookValida, mercadoPagoConfigurado, obtenerPago } from "@/lib/tienda/mercadopago";
import { getPedidoPorToken, registrarPago } from "@/lib/db/tienda";
import { notificar, reportarFalla } from "@/lib/monitor";
import { enviarEmail } from "@/lib/email";
import { formatoPesos } from "@/lib/tienda/pedido";

// Notificaciones de Mercado Pago (Checkout Pro). Nunca se confía en el
// cuerpo: con el id recibido se consulta el pago a Mercado Pago con nuestro
// token y recién ahí se compara contra el pedido (referencia, monto y
// moneda). La firma x-signature se exige cuando hay clave configurada.
//
// Respuestas: 200 cuando la notificación se procesó o no aplica (Mercado
// Pago deja de reintentar), 401 con firma inválida, 500 si falló algo
// nuestro y conviene que reintente.

export async function POST(req: NextRequest) {
  if (!mercadoPagoConfigurado()) return NextResponse.json({ ok: false }, { status: 503 });

  const url = req.nextUrl;
  let cuerpo: { type?: string; data?: { id?: string | number } } = {};
  try {
    cuerpo = await req.json();
  } catch {
    // Algunas notificaciones llegan solo con query string.
  }
  const tipo = url.searchParams.get("type") ?? cuerpo.type ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? (cuerpo.data?.id != null ? String(cuerpo.data.id) : null);
  if (tipo !== "payment" || !dataId) return NextResponse.json({ ok: true });

  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secreto) {
    const valida = firmaWebhookValida({
      firma: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      secreto,
    });
    if (!valida) return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const pago = await obtenerPago(dataId);
    if (!pago?.referencia) return NextResponse.json({ ok: true });
    const pedido = await getPedidoPorToken(pago.referencia);
    if (!pedido) return NextResponse.json({ ok: true });

    if (pago.estado === "approved") {
      if (pago.moneda !== "ARS" || pago.montoCentavos !== pedido.totalCentavos) {
        await reportarFalla("tienda/webhook", "Pago aprobado con monto distinto al del pedido", {
          pedido: pedido.id,
          esperado: pedido.totalCentavos,
          recibido: pago.montoCentavos,
        });
        return NextResponse.json({ ok: true });
      }
      const cambio = await registrarPago(pedido.token, pago.id, "pagado");
      if (cambio) await avisarPagado(pedido.id, pedido.nombre, pedido.email, pedido.totalCentavos, pedido.token);
    } else if (pago.estado === "rejected" || pago.estado === "cancelled") {
      await registrarPago(pedido.token, pago.id, "rechazado");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    await reportarFalla("tienda/webhook", err, { dataId });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function avisarPagado(id: number, nombre: string, email: string, totalCentavos: number, token: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://metricsfield.com").replace(/\/+$/, "");
  await notificar("Pedido pagado en la tienda", `#${id} · ${nombre} · ${formatoPesos(totalCentavos)}`);
  await enviarEmail({
    to: email,
    asunto: `Recibimos tu pago · pedido #${id}`,
    html: `<p>Hola ${escapar(nombre)}, recibimos el pago de tu pedido #${id}.</p>
<p>Te escribimos por WhatsApp para coordinar la entrega. Podés seguir el estado acá:
<a href="${base}/pedido/${token}">${base}/pedido/${token}</a></p>
<p>MetricsField · Córdoba, Argentina</p>`,
  });
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
