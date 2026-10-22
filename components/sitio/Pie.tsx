import Link from "next/link";
import { EMAIL, INICIO, INSTAGRAM, URL_PANEL, URL_RETAIL, WHATSAPP_VISIBLE, waVertical } from "@/lib/sitio/contacto";

// El cierre: los seis hexágonos del logo construidos en grande, el nombre a
// todo el ancho, los links, los datos legales y los descargos de marca.
export default function Pie() {
  return (
    <footer className="pie marco">
      <div className="pie__marca" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="pie__nombre">MetricsField</p>
      <div className="pie__columnas">
        <div>
          <h3>Productos</h3>
          <ul>
            <li><Link href={`${INICIO}#reviews`}>Reviews</Link></li>
            <li><Link href={`${INICIO}#retail`}>Retail</Link></li>
            <li><Link href={`${INICIO}#loyalty`}>Loyalty</Link></li>
            <li><Link href={`${INICIO}#intel`}>Intel</Link></li>
          </ul>
        </div>
        <div>
          <h3>Tienda</h3>
          <ul>
            <li><Link href="/tienda">Piezas y precios</Link></li>
            <li><Link href="/carrito">Carrito</Link></li>
            <li><Link href={`${INICIO}#preguntas`}>Envíos y preguntas</Link></li>
          </ul>
        </div>
        <div>
          <h3>Clientes</h3>
          <ul>
            <li><a href={URL_PANEL}>Panel de Reviews</a></li>
            <li><a href={URL_RETAIL}>Entrar a Retail</a></li>
          </ul>
        </div>
        <div>
          <h3>Legal</h3>
          <ul>
            <li><Link href="/privacidad">Privacidad</Link></li>
            <li><Link href="/terminos">Términos</Link></li>
            <li>
              <a href={waVertical("la tienda", "botón de arrepentimiento", "arrepentirme de una compra")} target="_blank" rel="noopener noreferrer">
                Botón de arrepentimiento
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Contacto</h3>
          <ul>
            <li>Córdoba, Argentina</li>
            <li><a href={waVertical("MetricsField", "footer", "hablar")} target="_blank" rel="noopener noreferrer">WhatsApp {WHATSAPP_VISIBLE}</a></li>
            <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
            <li><a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">@metricsfield</a></li>
          </ul>
        </div>
      </div>
      <div className="pie__legal">
        <p>
          Razón social, CUIT y domicilio: [CONFIRMAR]. Precios en pesos argentinos, IVA no incluido. MetricsField no está
          afiliado con Google LLC, Apple Inc. ni Mercado Libre S.R.L. Google, Google Wallet, Apple Wallet y Mercado Libre
          son marcas de sus respectivos titulares.
        </p>
        <p>© {new Date().getFullYear()} MetricsField</p>
      </div>
    </footer>
  );
}
