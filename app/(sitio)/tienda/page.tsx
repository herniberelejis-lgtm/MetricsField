import type { Metadata } from "next";
import Piezas from "@/components/sitio/Piezas";
import { waVertical } from "@/lib/sitio/contacto";

export const metadata: Metadata = {
  title: "Tienda · Standee, tarjeta y sticker NFC para reseñas | MetricsField",
  description:
    "Comprá el standee, la tarjeta o el sticker con NFC y QR para que tus clientes te dejen reseñas en Google. Pago único, primer mes de panel gratis, envíos a todo el país.",
  alternates: { canonical: "https://metricsfield.com/tienda" },
};

export default function Tienda() {
  return (
    <main className="pagina marco">
      <h1>Tienda.</h1>
      <p className="seccion__bajada">
        Cada pieza trae NFC y QR, se paga una sola vez y suma un mes de panel gratis. En Córdoba la instalamos nosotros; en el
        resto del país te llega por correo y la activás en minutos.
      </p>
      <Piezas titulo="Elegí la pieza" />
      <p className="menu__nota">
        ¿Necesitás más de 50 unidades o un diseño propio?{" "}
        <a className="enlace" href={waVertical("la tienda", "tienda", "un pedido grande")} target="_blank" rel="noopener noreferrer">
          Escribinos por WhatsApp
        </a>
        .
      </p>
    </main>
  );
}
