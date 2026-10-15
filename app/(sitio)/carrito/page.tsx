import type { Metadata } from "next";
import Checkout from "@/components/sitio/Checkout";
import { mercadoPagoConfigurado } from "@/lib/tienda/mercadopago";

export const metadata: Metadata = {
  title: "Carrito | MetricsField",
  robots: { index: false },
};

export default function Carrito() {
  return (
    <main className="pagina marco">
      <h1>Tu carrito.</h1>
      <Checkout pagoHabilitado={mercadoPagoConfigurado()} />
    </main>
  );
}
