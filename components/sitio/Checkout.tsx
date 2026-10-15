"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { comprar, type EstadoCompra } from "@/app/(sitio)/actions";
import { PRODUCTOS } from "@/lib/tienda/catalogo";
import { calcularTotales, formatoPesos, type Entrega, type LineaPedido } from "@/lib/tienda/pedido";
import { waVertical } from "@/lib/sitio/contacto";
import { useCarrito } from "./Carrito";

// Carrito + datos de compra en una sola pantalla. El total que se ve acá es
// orientativo: el servidor lo vuelve a calcular con el mismo catálogo.

export default function Checkout({ pagoHabilitado }: { pagoHabilitado: boolean }) {
  const { items, cambiar, quitar, cargado } = useCarrito();
  const [entrega, setEntrega] = useState<Entrega>("instalacion_cordoba");
  const [estado, accion, enviando] = useActionState<EstadoCompra, FormData>(comprar, { error: null });

  const lineas: LineaPedido[] = items.flatMap((i) => {
    const p = PRODUCTOS.find((x) => x.slug === i.slug);
    return p ? [{ slug: p.slug, nombre: p.nombre, cantidad: i.cantidad, precioUnitarioCentavos: p.precioCentavos }] : [];
  });
  const totales = calcularTotales(lineas, entrega);

  if (!cargado) return <p className="vacio">Cargando tu carrito…</p>;
  if (lineas.length === 0) {
    return (
      <p className="vacio">
        Todavía no agregaste nada. <Link className="enlace" href="/tienda">Ver las piezas</Link>
      </p>
    );
  }

  const resumenWa = lineas.map((l) => `${l.cantidad} × ${l.nombre}`).join(", ");

  return (
    <div className="carrito">
      <div>
        <ul className="carrito__lineas">
          {lineas.map((l) => {
            const p = PRODUCTOS.find((x) => x.slug === l.slug)!;
            return (
              <li className="carrito__linea" key={l.slug}>
                <img src={p.imagen} alt="" width={72} height={82} />
                <div>
                  <p style={{ fontWeight: 700 }}>{l.nombre}</p>
                  <p>{formatoPesos(l.precioUnitarioCentavos)} c/u</p>
                  <button type="button" className="quitar" onClick={() => quitar(l.slug)}>Quitar</button>
                </div>
                <div className="cantidad" aria-label={`Cantidad de ${l.nombre}`}>
                  <button type="button" aria-label="Uno menos" onClick={() => cambiar(l.slug, l.cantidad - 1)}>−</button>
                  <output aria-live="polite">{l.cantidad}</output>
                  <button type="button" aria-label="Uno más" onClick={() => cambiar(l.slug, l.cantidad + 1)}>+</button>
                </div>
              </li>
            );
          })}
        </ul>

        <form id="form-compra" action={accion} style={{ marginTop: 48 }}>
          <input type="hidden" name="carrito" value={JSON.stringify(items)} />
          <input type="hidden" name="origen" value="carrito" />
          <h2 className="seccion__titulo" style={{ fontSize: 32 }}>Tus datos</h2>
          <fieldset className="segmento">
            <legend>¿Cómo te llega?</legend>
            <label>
              <input type="radio" name="entrega" value="instalacion_cordoba" checked={entrega === "instalacion_cordoba"} onChange={() => setEntrega("instalacion_cordoba")} />
              <span>Córdoba: lo instalamos</span>
            </label>
            <label>
              <input type="radio" name="entrega" value="envio_nacional" checked={entrega === "envio_nacional"} onChange={() => setEntrega("envio_nacional")} />
              <span>Resto del país: envío</span>
            </label>
          </fieldset>
          <div className="campo-form"><label htmlFor="c-nombre">Nombre o negocio</label><input id="c-nombre" name="nombre" required autoComplete="name" maxLength={120} /></div>
          <div className="campo-form"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required autoComplete="email" maxLength={160} /></div>
          <div className="campo-form"><label htmlFor="c-wa">WhatsApp</label><input id="c-wa" name="whatsapp" type="tel" required autoComplete="tel" maxLength={40} placeholder="351 555 1234" /></div>
          <div className="campo-form"><label htmlFor="c-cuit">CUIT (opcional, para tu factura)</label><input id="c-cuit" name="cuit" inputMode="numeric" maxLength={13} /></div>
          <div className="campo-form"><label htmlFor="c-dir">Dirección del local</label><input id="c-dir" name="direccion" required autoComplete="street-address" maxLength={200} /></div>
          {entrega === "envio_nacional" && (
            <>
              <div className="campo-form"><label htmlFor="c-loc">Localidad</label><input id="c-loc" name="localidad" required autoComplete="address-level2" maxLength={100} /></div>
              <div className="campo-form"><label htmlFor="c-prov">Provincia</label><input id="c-prov" name="provincia" required autoComplete="address-level1" maxLength={60} /></div>
              <div className="campo-form"><label htmlFor="c-cp">Código postal</label><input id="c-cp" name="codigo_postal" required autoComplete="postal-code" maxLength={10} /></div>
            </>
          )}
        </form>
      </div>

      <aside className="resumen" aria-label="Resumen del pedido">
        <div className="resumen__fila"><span>Subtotal</span><span>{formatoPesos(totales.subtotalCentavos)}</span></div>
        <div className="resumen__fila"><span>IVA</span><span>{formatoPesos(totales.ivaCentavos)}</span></div>
        <div className="resumen__fila">
          <span>{entrega === "instalacion_cordoba" ? "Instalación en Córdoba" : "Envío"}</span>
          <span>{totales.envioCentavos === null ? "A coordinar" : totales.envioCentavos === 0 ? "Incluida" : formatoPesos(totales.envioCentavos)}</span>
        </div>
        <div className="resumen__fila resumen__fila--total"><span>Total</span><span>{formatoPesos(totales.totalCentavos)}</span></div>
        <p className="descargo">Incluye un mes de panel de Reviews gratis. Tenés 10 días para arrepentirte de la compra.</p>
        {entrega === "envio_nacional" && totales.envioCentavos === null && (
          <p className="descargo">El costo del envío no se cobra acá: te lo pasamos por WhatsApp antes de despachar.</p>
        )}
        {pagoHabilitado ? (
          <button className="boton" type="submit" form="form-compra" disabled={enviando} style={{ width: "100%", marginTop: 20 }}>
            {enviando ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
          </button>
        ) : (
          <a className="boton" style={{ width: "100%", marginTop: 20 }} href={waVertical("la tienda", "carrito", `comprar ${resumenWa}`)} target="_blank" rel="noopener noreferrer">
            Cerrar la compra por WhatsApp
          </a>
        )}
        {estado.error && <p className="error-form" role="alert">{estado.error}</p>}
      </aside>
    </div>
  );
}
