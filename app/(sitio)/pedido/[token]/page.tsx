import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPedidoPorToken, type EstadoPedido } from "@/lib/db/tienda";
import { formatoPesos } from "@/lib/tienda/pedido";
import { waVertical } from "@/lib/sitio/contacto";

export const metadata: Metadata = { title: "Tu pedido | MetricsField", robots: { index: false } };

// Estado del pedido. El token largo es la credencial; el estado sale de la
// base (lo actualiza el webhook de Mercado Pago), nunca de los parámetros
// que Mercado Pago agrega a la URL de vuelta.

const TEXTO: Record<EstadoPedido, { titulo: string; detalle: string }> = {
  pendiente: { titulo: "Estamos esperando el pago.", detalle: "Si ya pagaste, puede tardar unos minutos en confirmarse. Recargá esta página en un rato." },
  pagado: { titulo: "Recibimos tu pago.", detalle: "Te escribimos por WhatsApp para coordinar la entrega o el envío." },
  rechazado: { titulo: "El pago no se aprobó.", detalle: "Podés volver a intentarlo desde el carrito o escribirnos por WhatsApp." },
  cancelado: { titulo: "Pedido cancelado.", detalle: "Si fue un error, escribinos por WhatsApp." },
  enviado: { titulo: "Tu pedido está en camino.", detalle: "Te pasamos el seguimiento por WhatsApp." },
  entregado: { titulo: "Pedido entregado.", detalle: "Cualquier duda con la activación, escribinos por WhatsApp." },
};

export default async function Pedido({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await getPedidoPorToken(token);
  if (!pedido) notFound();
  const t = TEXTO[pedido.estado];
  return (
    <main className="pagina marco">
      <p className="ejemplo" style={{ background: "var(--field)" }}>Pedido #{pedido.id}</p>
      <h1 style={{ marginTop: 16 }}>{t.titulo}</h1>
      <p className="seccion__bajada">{t.detalle}</p>
      <div className="carrito">
        <ul className="carrito__lineas">
          {pedido.items.map((i) => (
            <li key={i.producto} className="carrito__linea" style={{ gridTemplateColumns: "1fr auto" }}>
              <span>{i.cantidad} × {i.nombre}</span>
              <span>{formatoPesos(i.cantidad * i.precioUnitarioCentavos)}</span>
            </li>
          ))}
        </ul>
        <aside className="resumen">
          <div className="resumen__fila"><span>Subtotal</span><span>{formatoPesos(pedido.subtotalCentavos)}</span></div>
          <div className="resumen__fila"><span>IVA</span><span>{formatoPesos(pedido.ivaCentavos)}</span></div>
          <div className="resumen__fila"><span>{pedido.entrega === "instalacion_cordoba" ? "Instalación" : "Envío"}</span><span>{pedido.envioCentavos === null ? "A coordinar" : pedido.envioCentavos === 0 ? "Incluida" : formatoPesos(pedido.envioCentavos)}</span></div>
          <div className="resumen__fila resumen__fila--total"><span>Total</span><span>{formatoPesos(pedido.totalCentavos)}</span></div>
          <a className="boton" style={{ width: "100%", marginTop: 20 }} href={waVertical("la tienda", `pedido #${pedido.id}`, `consultar por el pedido #${pedido.id}`)} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </aside>
      </div>
    </main>
  );
}
