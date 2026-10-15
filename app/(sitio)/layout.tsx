import "./sitio.css";
import { ProveedorCarrito } from "@/components/sitio/Carrito";
import Nav from "@/components/sitio/Nav";
import Pie from "@/components/sitio/Pie";
import BarraMovil from "@/components/sitio/BarraMovil";
import Movimiento from "@/components/sitio/Movimiento";

// Sitio público de venta: home (/sitio, servida en la raíz de
// metricsfield.com), tienda, carrito y estado del pedido. Renderizado
// dinámico por la CSP con nonce por request (ver app/page.tsx).
export const dynamic = "force-dynamic";

export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorCarrito>
      <div className="sitio">
        <Nav />
        {children}
        <Pie />
        <BarraMovil seccion="sitio" />
        <Movimiento />
      </div>
    </ProveedorCarrito>
  );
}
