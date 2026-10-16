"use client";

import Link from "next/link";
import { useCarrito } from "./Carrito";
import { waVertical } from "@/lib/sitio/contacto";

// Barra fija en el celular: WhatsApp, prueba gratis y carrito, siempre a un
// pulgar de distancia.
export default function BarraMovil({ seccion }: { seccion: string }) {
  const { cantidadTotal } = useCarrito();
  return (
    <nav className="barra-movil" aria-label="Acciones rápidas">
      <a href={waVertical("MetricsField", `barra móvil · ${seccion}`, "hablar")} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <Link href="/tienda">Comprar piezas</Link>
      <Link href="/carrito" aria-label={`Carrito, ${cantidadTotal} productos`}>
        Carrito {cantidadTotal}
      </Link>
    </nav>
  );
}
