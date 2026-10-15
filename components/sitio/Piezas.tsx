"use client";

import Link from "next/link";
import { useState } from "react";
import { PRODUCTOS, type SlugProducto } from "@/lib/tienda/catalogo";
import { formatoPesos } from "@/lib/tienda/pedido";
import { useCarrito } from "./Carrito";

// La pieza delante de un hexágono: elegís el nombre y cambia la foto, el
// precio y el botón de compra. Sirve igual en la home y en /tienda.

export default function Piezas({ titulo = "Las piezas" }: { titulo?: string }) {
  const [slug, setSlug] = useState<SlugProducto>("standee");
  const [agregado, setAgregado] = useState<SlugProducto | null>(null);
  const { agregar } = useCarrito();
  const p = PRODUCTOS.find((x) => x.slug === slug)!;

  function sumar() {
    agregar(p.slug);
    setAgregado(p.slug);
  }

  return (
    <div className="piezas">
      <div>
        <h2 className="piezas__encabezado">{titulo}</h2>
        <ul className="piezas__lista">
          {PRODUCTOS.map((x) => (
            <li key={x.slug}>
              <button
                type="button"
                className="piezas__opcion"
                aria-pressed={x.slug === slug}
                onClick={() => {
                  setSlug(x.slug);
                  setAgregado(null);
                }}
              >
                {x.nombre} <span>{formatoPesos(x.precioCentavos)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="piezas__ficha" aria-live="polite">
          <p className="piezas__precio">
            {formatoPesos(p.precioCentavos)} <small>+ IVA · pago único</small>
          </p>
          <p style={{ marginTop: 8 }}>{p.momento} {p.descripcion}</p>
          <ul className="lista-simple">
            {p.detalles.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <div className="acciones">
            <button type="button" className="boton" onClick={sumar}>
              Agregar al carrito
            </button>
            {agregado === p.slug && (
              <Link className="enlace" href="/carrito">
                Listo. Ver carrito
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="piezas__escena">
        <div className="piezas__hex">
          <img key={p.slug} className="cambio-entra" src={p.imagen} alt={p.imagenAlt} width={900} height={900} loading="lazy" />
        </div>
      </div>
    </div>
  );
}
