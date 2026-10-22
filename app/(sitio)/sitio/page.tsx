import type { Metadata } from "next";
import Puertas from "@/components/sitio/Puertas";
import Piezas from "@/components/sitio/Piezas";
import PrimerPaso from "@/components/sitio/PrimerPaso";
import { EMAIL, URL_RETAIL, WHATSAPP, waVertical } from "@/lib/sitio/contacto";
import { PREGUNTAS, VENTA_EJEMPLO, pesos, resultadoVentaEjemplo } from "@/lib/sitio/contenido";
import { PRODUCTOS } from "@/lib/tienda/catalogo";
import { formatoPesos } from "@/lib/tienda/pedido";

const URL = "https://metricsfield.com/";
const DESCRIPCION =
  "Carteles NFC/QR para conseguir reseñas en Google, ganancia real por venta en Mercado Libre y club de puntos en la billetera del celular. Córdoba, envíos a todo el país.";

export const metadata: Metadata = {
  title: "MetricsField · Reseñas en Google y ganancia real en Mercado Libre",
  description: DESCRIPCION,
  alternates: { canonical: URL },
  openGraph: {
    title: "MetricsField · Medimos dónde perdés plata",
    description: DESCRIPCION,
    url: URL,
    siteName: "MetricsField",
    locale: "es_AR",
    type: "website",
    images: [{ url: "https://metricsfield.com/landing/assets/img/og-image.jpg", width: 1200, height: 630 }],
  },
};

function datosEstructurados() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${URL}#organization`,
    name: "MetricsField",
    url: URL,
    logo: "https://metricsfield.com/sitio/img/logo-icon-dark.webp",
    description:
      "MetricsField es una empresa de Córdoba, Argentina, que hace software para comercios: Reviews (reseñas en Google con carteles NFC/QR), Retail (ganancia real en Mercado Libre), Loyalty (club de puntos en la billetera del celular, en piloto) e Intel (próximamente).",
    areaServed: "AR",
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", telephone: `+${WHATSAPP}`, email: EMAIL, availableLanguage: "es" }],
    sameAs: ["https://instagram.com/metricsfield"],
  };
  const productos = PRODUCTOS.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.descripcion,
    image: `https://metricsfield.com${p.imagen}`,
    brand: { "@type": "Brand", name: "MetricsField" },
    offers: { "@type": "Offer", priceCurrency: "ARS", price: (p.precioCentavos / 100).toFixed(2), availability: "https://schema.org/InStock", url: "https://metricsfield.com/tienda" },
  }));
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREGUNTAS.map((q) => ({ "@type": "Question", name: q.pregunta, acceptedAnswer: { "@type": "Answer", text: q.respuesta } })),
  };
  // JSON-LD sin "<" para que ningún texto pueda cerrar el <script>.
  return JSON.stringify([org, ...productos, faq]).replace(/</g, "\\u003c");
}

export default function Home() {
  const resultado = resultadoVentaEjemplo();
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: datosEstructurados() }} />

      <section className="hero marco" aria-labelledby="titulo">
        <Puertas>
          <h1 id="titulo" className="hero__titulo">Medimos dónde perdés plata.</h1>
          <p className="hero__bajada">
            Reseñas en Google, ganancia real en Mercado Libre y clientes que vuelven. Elegí qué tenés y te mostramos qué ves.
          </p>
        </Puertas>
      </section>

      <section className="declaracion marco revela" aria-label="Qué hacemos">
        <p>
          Un tap en el mostrador
          <span className="mini"><img src="/sitio/img/standee.webp" alt="" width={60} height={60} /></span>, una venta,
          una visita
          <span className="mini"><img src="/sitio/img/local.webp" alt="" width={60} height={60} /></span>: todo termina en un
          número que te dice qué hacer.
        </p>
      </section>

      <section id="reviews" className="seccion marco" aria-labelledby="t-reviews">
        <div className="revela">
          <h2 id="t-reviews" className="seccion__titulo">Reseñas en Google, con un tap.</h2>
          <p className="seccion__bajada">
            <span className="estado estado--disponible">Disponible</span>Tu cliente acerca el celular al cartel y llega directo a calificarte. Sin apps. Todos van al mismo link público de
            Google: no filtramos a nadie ni pedimos una nota.
          </p>
        </div>
        <ol className="barra" data-ui aria-label="Qué pasa cuando alguien toca el cartel">
          <li className="barra__etapa"><span className="barra__tiempo">Un segundo</span><span className="barra__texto">Primero acerca el celular al cartel, o escanea el QR.</span></li>
          <li className="barra__etapa"><span className="barra__tiempo">Al instante</span><span className="barra__texto">El link pasa por nuestro servidor y queda anotado.</span></li>
          <li className="barra__etapa"><span className="barra__tiempo">Lo que tarde en escribir</span><span className="barra__texto">Aterriza en tu ficha de Google y deja su reseña.</span></li>
          <li className="barra__etapa"><span className="barra__tiempo">Todos los días</span><span className="barra__texto">Vos ves cada tap y cada reseña en tu panel, por pieza y por sucursal.</span></li>
        </ol>
        <div className="reviews__abajo">
          <div className="revela">
            <p className="precio-grande">$25.000<small>por mes + IVA</small></p>
            <p style={{ marginTop: 12 }}>El panel completo. El primer mes es gratis y no hay permanencia mínima.</p>
            <ul className="lista-simple">
              <li>Taps y reseñas por día, hora y pieza</li>
              <li>Aviso por email cuando entra una reseña de 3 estrellas o menos</li>
              <li>Métricas por sucursal y por colaborador</li>
              <li>Instalación en Córdoba, envío al resto del país</li>
              <li>Visitas y llamadas desde Google: próximamente</li>
            </ul>
            <div className="acciones">
              <a className="boton" href="#piezas">Elegir piezas</a>
              <a className="enlace" href={waVertical("Reviews", "sección Reviews", "una demo")} target="_blank" rel="noopener noreferrer">Pedir demo por WhatsApp</a>
            </div>
          </div>
          <figure className="reviews__panel revela" style={{ margin: 0 }}>
            <img src="/sitio/img/panel-resenas.webp" alt="Panel de MetricsField con la distribución de reseñas por estrellas de una cuenta de prueba" width={1920} height={874} loading="lazy" />
          </figure>
        </div>
      </section>

      <section id="piezas" className="marco" aria-label="Tienda de piezas">
        <Piezas />
      </section>

      <section id="retail" className="retail" aria-labelledby="t-retail">
        <div className="marco retail__grid">
          <div className="revela">
            <h2 id="t-retail" className="seccion__titulo">Facturar no es ganar.</h2>
            <p className="seccion__bajada">
              <span className="estado estado--disponible">Disponible</span>Conectás tu cuenta de Mercado Libre con el acceso oficial, cargás el costo de tus productos una vez y ves cuánto te
              quedó en cada venta: comisión, envío, publicidad e IVA descontados.
            </p>
            <ul className="lista-simple">
              <li>Qué productos te hacen perder plata</li>
              <li>Qué publicidad pausar, mantener o subir</li>
              <li>Estado financiero en Excel, por mes y por año</li>
              <li>Para Responsables Inscriptos, de todo el país</li>
            </ul>
            <div className="acciones">
              <a className="boton" href={URL_RETAIL}>Probar 30 días gratis</a>
              <a className="enlace" href={waVertical("Retail", "sección Retail", "ayuda para empezar")} target="_blank" rel="noopener noreferrer">Preguntar por WhatsApp</a>
            </div>
            <p className="descargo">Sin tarjeta y sin darnos tu contraseña. No estamos afiliados con Mercado Libre.</p>
          </div>
          <div className="ticket revela" data-ui aria-label="Ejemplo de una venta">
            <p className="ejemplo">Ejemplo</p>
            <p style={{ marginTop: 12, fontWeight: 600 }}>{VENTA_EJEMPLO.producto}</p>
            <div className="ticket__fila"><span>Vendiste</span><span>{pesos(VENTA_EJEMPLO.precio)}</span></div>
            {VENTA_EJEMPLO.descuentos.map((d) => (
              <div className="ticket__fila" key={d.concepto}><span>{d.concepto}</span><span>{pesos(-d.monto)}</span></div>
            ))}
            <div className="ticket__fila ticket__fila--total"><span>Te quedó</span></div>
            <p className="ticket__resultado">{pesos(resultado)}</p>
          </div>
        </div>
      </section>

      <section className="campos" aria-label="Loyalty e Intel">
        <div id="loyalty" className="campo campo--loyalty revela">
          <div>
            <h2>Que vuelvan.</h2>
            <p className="campo__texto"><span className="estado estado--piloto">En piloto</span>Reviews consigue que hablen bien de vos. Loyalty consigue que vuelvan, y que sepas quiénes son.</p>
            <ol className="campo__pasos">
              <li>Tu cliente toca el mismo cartel y deja nombre y celular, con su consentimiento.</li>
              <li>Recibe una tarjeta en Google Wallet. Apple Wallet está en preparación.</li>
              <li>Suma puntos en cada visita y canjea con un código que validás desde tu portal.</li>
            </ol>
          </div>
          <div>
            <a className="boton" href="#primer-paso" data-interes="Loyalty">Quiero ser comercio piloto</a>
            <p className="descargo" style={{ color: "#23384d" }}>Todavía no está a la venta. El cliente puede borrar su tarjeta y sus datos con un botón.</p>
          </div>
        </div>
        <div id="intel" className="campo campo--intel revela">
          <div>
            <h2>Intel.</h2>
            <p className="campo__texto"><span className="estado estado--pronto">Próximamente</span>Lo próximo de MetricsField. Todavía no hay fecha: anotate y te avisamos primero.</p>
          </div>
          <a className="boton" href="#primer-paso" data-interes="Intel">Anotarme a la lista</a>
        </div>
      </section>

      <section className="menu marco" aria-labelledby="t-precios">
        <h2 id="t-precios" className="seccion__titulo revela">Precios, sin letra chica.</h2>
        <div className="menu__categoria"><h3>Piezas</h3><span>pago único</span></div>
        <ul className="menu__items">
          {PRODUCTOS.map((p) => (
            <li className="menu__item" key={p.slug}>
              <span className="menu__foto"><img src={p.imagen} alt="" width={64} height={72} loading="lazy" /></span>
              <div>
                <p className="menu__linea"><span>{p.nombre}</span><span>{formatoPesos(p.precioCentavos)}</span></p>
                <p className="menu__desc">{p.momento}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="menu__categoria"><h3>Software</h3><span>por mes</span></div>
        <ul className="menu__items">
          <li className="menu__item"><span className="menu__foto menu__foto--color" /><div><p className="menu__linea"><span>Panel de Reviews</span><span>$25.000</span></p><p className="menu__desc">Todas tus sucursales y piezas. Primer mes gratis, sin permanencia.</p></div></li>
          <li className="menu__item"><span className="menu__foto menu__foto--color" /><div><p className="menu__linea"><span>Retail</span><span>30 días gratis</span></p><p className="menu__desc">Después, según tus órdenes del mes: [CONFIRMAR escalones].</p></div></li>
          <li className="menu__item"><span className="menu__foto menu__foto--color" /><div><p className="menu__linea"><span>Loyalty</span><span>Piloto</span></p><p className="menu__desc">Sin precio publicado mientras dure el piloto.</p></div></li>
          <li className="menu__item"><span className="menu__foto menu__foto--color" /><div><p className="menu__linea"><span>Intel</span><span>Próximamente</span></p><p className="menu__desc">Lista de espera abierta.</p></div></li>
        </ul>
        <p className="menu__nota">Precios en pesos argentinos, IVA no incluido. Instalación incluida en Córdoba; envío al resto del país.</p>
      </section>

      <section id="preguntas" className="faq marco" aria-labelledby="t-faq">
        <h2 id="t-faq" className="faq__titulo revela">Preguntas.</h2>
        <div className="faq__pila">
          {PREGUNTAS.map((q, i) => (
            <details className="ficha" name="faq" key={q.pregunta} open={i === 0} style={{ ["--i" as string]: i % 6 }}>
              <summary>
                <span className="ficha__pestana">{q.tema}</span>
                <span className="ficha__pregunta">{q.pregunta}</span>
              </summary>
              <div className="ficha__respuesta"><p>{q.respuesta}</p></div>
            </details>
          ))}
        </div>
      </section>

      <section id="primer-paso" className="primer-paso marco" aria-labelledby="t-cierre">
        <div>
          <h2 id="t-cierre">Empezá por donde duele.</h2>
          <p className="primer-paso__texto">
            Elegí qué te interesa y abrimos WhatsApp con el mensaje armado. Te responde una persona del equipo, desde Córdoba.
          </p>
        </div>
        <PrimerPaso />
      </section>
    </main>
  );
}
