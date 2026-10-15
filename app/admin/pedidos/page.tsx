import type { Metadata } from "next";
import { getPedidosRecientes, type EstadoPedido } from "@/lib/db/tienda";
import { Card, PageHeader } from "@/components/ui";
import { asegurarAdminPagina } from "@/lib/auth";
import { formatoPesos } from "@/lib/tienda/pedido";
import { waUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Pedidos de la tienda" };
export const dynamic = "force-dynamic";

// Pedidos de la tienda propia (metricsfield.com/tienda). Solo lectura: el
// estado lo mueve el webhook de Mercado Pago. Asignar las piezas del stock a
// un pedido pagado se hace por ahora desde /admin/hardware.

const ETIQUETA: Record<EstadoPedido, string> = {
  pendiente: "Esperando pago",
  pagado: "Pagado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  enviado: "Enviado",
  entregado: "Entregado",
};

export default async function PedidosPage() {
  await asegurarAdminPagina();
  const pedidos = await getPedidosRecientes(100);
  return (
    <div>
      <PageHeader title="Pedidos de la tienda" subtitle="Los últimos 100, el más nuevo primero." />
      {pedidos.length === 0 ? (
        <Card>Todavía no hay pedidos.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Piezas</th>
                <th className="px-4 py-3 font-medium">Entrega</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    #{p.id}
                    <div className="text-slate-500">{p.creadoEn.toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba" })}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{ETIQUETA[p.estado]}</td>
                  <td className="px-4 py-3">
                    {p.nombre}
                    <div className="text-slate-500">{p.email}</div>
                    <a className="underline" href={waUrl(p.whatsapp, `Hola ${p.nombre}! Te escribimos de MetricsField por tu pedido #${p.id}.`)} target="_blank" rel="noopener noreferrer">
                      {p.whatsapp}
                    </a>
                    {p.cuit && <div className="text-slate-500">CUIT {p.cuit}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.items.map((i) => (
                      <div key={i.producto}>{i.cantidad} × {i.nombre}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {p.entrega === "instalacion_cordoba" ? "Instalación en Córdoba" : "Envío"}
                    <div className="text-slate-500">{[p.direccion, p.localidad, p.provincia, p.codigoPostal].filter(Boolean).join(", ")}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatoPesos(p.totalCentavos)}
                    {p.envioCentavos === null && <div className="text-slate-500">+ envío a coordinar</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
