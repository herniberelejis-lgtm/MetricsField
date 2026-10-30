// Plantilla compartida del sitio público (metricsfield.com): <head> con
// metadatos y datos estructurados, navegación, pie, carrito y barra del
// celular. La usan todas las páginas que arma generar.mjs.

import { readFileSync } from "node:fs";

export const SITIO = "https://metricsfield.com";
export const WA = "https://wa.me/5493515191716";
export const RETAIL_APP = "https://retail.metricsfield.com";
export const VERSION = "20261030";
// Logo horizontal (public/brand/logo-horizontal.svg, 5057×982) a 32 px de alto.
const LOGO_W = 165;
const LOGO_H = 32;
// El CSS va en línea en cada página: como <link> bloqueaba el primer
// dibujo una vuelta de red entera (PageSpeed). El original sigue
// siendo public/landing/assets/sitio.css: si lo editás, regenerá la landing.
const CSS = readFileSync(new URL("../../public/landing/assets/sitio.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s*\n\s*/g, " ")
  .trim();

export function wa(texto) {
  return `${WA}?text=${encodeURIComponent(texto)}`;
}

/** Escapa texto para HTML. El contenido es nuestro, pero un "&" o un "<"
 * sueltos en una guía no tienen que romper la página. */
export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const ORGANIZACION = {
  "@type": "Organization",
  "@id": `${SITIO}/#organizacion`,
  name: "MetricsField",
  alternateName: ["Metrics Field", "MetricField"],
  url: `${SITIO}/`,
  logo: `${SITIO}/brand/isotipo-512.png`,
  email: "info@metricsfield.com",
  telephone: "+5493515191716",
  address: { "@type": "PostalAddress", addressLocality: "Córdoba", addressRegion: "Córdoba", addressCountry: "AR" },
  areaServed: { "@type": "Country", name: "Argentina" },
  sameAs: ["https://instagram.com/metricsfield"],
  knowsAbout: [
    "Reseñas de Google",
    "Google Business Profile",
    "Posicionamiento en Google Maps",
    "SEO local",
    "Posicionamiento web",
    "GEO (optimización para motores generativos)",
    "Rentabilidad en Mercado Libre",
    "Fidelización de clientes",
    "Tarjetas de fidelidad en Google Wallet",
    "Clientes recurrentes",
    "Gestión de clientes (CRM)",
    "Ciclo de vida del cliente",
  ],
};

const NAV = [
  ["/reputacion", "Reviews"],
  ["/retail", "Retail"],
  ["/loyalty", "Loyalty"],
  ["/herramientas", "Intel"],
  ["/guias", "Guías"],
];

function jsonLd(objetos) {
  const grafo = { "@context": "https://schema.org", "@graph": objetos };
  // "</" no puede aparecer dentro de un <script>, aunque sea JSON.
  return `<script type="application/ld+json">${JSON.stringify(grafo).replace(/</g, "\\u003c")}</script>`;
}

export function migas(items) {
  return {
    html: `<nav class="migas wrap" aria-label="Estás en"><ol>${items
      .map(([href, nombre], i) =>
        i === items.length - 1 ? `<li aria-current="page">${esc(nombre)}</li>` : `<li><a href="${href}">${esc(nombre)}</a></li>`,
      )
      .join("")}</ol></nav>`,
    ld: {
      "@type": "BreadcrumbList",
      itemListElement: items.map(([href, nombre], i) => ({ "@type": "ListItem", position: i + 1, name: nombre, item: `${SITIO}${href}` })),
    },
  };
}

export function faqLd(preguntas) {
  return {
    "@type": "FAQPage",
    mainEntity: preguntas.map(([p, r]) => ({ "@type": "Question", name: p, acceptedAnswer: { "@type": "Answer", text: r } })),
  };
}

export function faqHtml(preguntas) {
  return `<div class="faq">${preguntas
    .map(([p, r]) => `<details><summary>${esc(p)}</summary><p>${esc(r)}</p></details>`)
    .join("")}</div>`;
}

export function pagina({ ruta, titulo, descripcion, cuerpo, ld = [], tipoOg = "website", scripts = [] }) {
  const url = `${SITIO}${ruta}`;
  const activo = (href) => (ruta === href || (href !== "/" && ruta.startsWith(href + "/")) ? ' aria-current="page"' : "");
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="theme-color" content="#111111">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${tipoOg}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:locale" content="es_AR">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="MetricsField">
<meta property="og:image" content="${SITIO}/landing/assets/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descripcion)}">
<meta name="twitter:image" content="${SITIO}/landing/assets/img/og-image.jpg">
<link rel="icon" type="image/svg+xml" href="/landing/assets/img/isotipo.svg">
<link rel="icon" type="image/png" href="/landing/assets/img/favicon.png" sizes="64x64">
<link rel="apple-touch-icon" href="/apple-icon.png">
<link rel="preload" href="/landing/assets/fonts/montserrat-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
${jsonLd([ORGANIZACION, ...ld])}
</head>
<body>
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="nav">
  <div class="wrap nav-in">
    <a class="brand" href="/" aria-label="MetricsField, inicio"><img src="/brand/logo-horizontal.svg" alt="MetricsField" width="${LOGO_W}" height="${LOGO_H}" fetchpriority="high"></a>
    <nav class="links" aria-label="Principal">${NAV.map(([href, nombre]) => `<a href="${href}"${activo(href)}>${nombre}</a>`).join("")}</nav>
    <div class="actions">
      <a class="btn ocultar-movil" href="${wa("Hola, quiero conocer MetricsField")}" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn dark" type="button" data-cart-open>Carrito <span class="cart-pill" data-cart-count>0</span></button>
      <button class="btn menu-btn" type="button" data-menu aria-expanded="false" aria-controls="menu-movil">Menú</button>
    </div>
  </div>
  <nav class="wrap menu-movil" id="menu-movil" data-menu-movil aria-label="Menú">${NAV.map(([href, nombre]) => `<a href="${href}">${nombre}</a>`).join("")}<a href="/#tienda">Tienda</a></nav>
</header>
<main id="contenido">
${cuerpo}
</main>
${pie()}
<div class="backdrop" data-backdrop></div>
<aside class="drawer" aria-label="Tu pedido" aria-hidden="true" data-drawer>
  <div class="drawer-head"><b>Tu pedido</b><button class="btn" type="button" data-cart-close>Cerrar</button></div>
  <div class="drawer-items" data-cart-items><p class="muted">Todavía no agregaste nada. Sumá piezas desde la tienda o el software que quieras probar.</p></div>
  <div class="cart-total">
    <div style="display:flex;justify-content:space-between"><b>Total piezas</b><b data-cart-total>$ 0</b></div>
    <p class="muted" style="font-size:.76rem;margin:4px 0 12px">Pago único. IVA y envío se confirman por WhatsApp. El software se coordina aparte.</p>
    <div class="pedido-datos">
      <label>Tu nombre<input data-pedido="nombre" autocomplete="name" maxlength="80"></label>
      <label>Comercio<input data-pedido="comercio" autocomplete="organization" maxlength="80"></label>
      <label>Ciudad<input data-pedido="ciudad" autocomplete="address-level2" maxlength="80"></label>
    </div>
    <a class="btn dark" style="width:100%" data-cart-wa href="${wa("Hola, quiero hacer un pedido a MetricsField")}" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>
    <p class="muted" style="font-size:.72rem;margin:8px 0 0">Acá no se cobra nada: te respondemos por WhatsApp para confirmar y coordinar el pago.</p>
  </div>
</aside>
<div class="toast" data-toast role="status">Agregado al carrito</div>
<nav class="mobile-bar" aria-label="Accesos rápidos"><a href="${WA}" target="_blank" rel="noopener">WhatsApp</a><a href="/herramientas">Calculadoras</a><button type="button" data-cart-open>Carrito <span data-cart-count>0</span></button></nav>
${scripts.map((src) => `<script src="${src}?v=${VERSION}" defer></script>\n`).join("")}<script src="/landing/assets/sitio.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

function pie() {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/" aria-label="MetricsField, inicio"><img src="/brand/logo-horizontal-blanco.svg" alt="MetricsField" width="${LOGO_W}" height="${LOGO_H}"></a>
        <p style="font-size:.82rem;max-width:300px">Del contacto al dato. Del dato a una mejor decisión. Software para comercios y vendedores de Argentina, hecho en Córdoba.</p>
      </div>
      <div><h2>Productos</h2><a href="/reputacion">Reviews · reseñas en Google</a><a href="/retail">Retail · Mercado Libre</a><a href="/loyalty">Loyalty · fidelización</a><a href="/herramientas">Intel · calculadoras</a><a href="/#tienda">Tienda de piezas NFC</a></div>
      <div><h2>Guías</h2><a href="/guias/como-conseguir-resenas-en-google">Reseñas en Google</a><a href="/guias/posicionamiento-en-google-maps">Google Maps</a><a href="/guias/seo-local-posicionamiento-web">SEO local</a><a href="/guias/geo-aparecer-en-respuestas-de-ia">GEO e IA</a><a href="/guias">Todas las guías</a></div>
      <div><h2>Más guías</h2><a href="/guias/rentabilidad-real-mercado-libre">Rentabilidad en Mercado Libre</a><a href="/guias/fidelizacion-de-clientes">Fidelización</a><a href="/guias/tarjeta-de-fidelidad-google-wallet">Google Wallet</a><a href="/guias/ciclo-de-vida-del-cliente">Ciclo del cliente</a></div>
      <div><h2>Contacto y legal</h2><a href="${WA}" target="_blank" rel="noopener">WhatsApp +54 9 351 519-1716</a><a href="mailto:info@metricsfield.com">info@metricsfield.com</a><a href="https://instagram.com/metricsfield" target="_blank" rel="noopener">Instagram</a><a href="/privacy">Privacidad</a><a href="/terms">Términos</a></div>
    </div>
    <p class="legal">MetricsField · Córdoba, Argentina · info@metricsfield.com<br><br>MetricsField no está afiliado con Google LLC, Apple Inc. ni Mercado Libre S.R.L. Google, Google Maps, Google Business Profile, Google Wallet, Apple Wallet y Mercado Libre son marcas de sus respectivos titulares.</p>
  </div>
</footer>`;
}

/** Calculadoras de Intel: el mismo bloque en la home, en /herramientas y
 * en las guías que las usan. Funcionan con sitio.js; sin JavaScript se ve
 * el formulario y la explicación de la cuenta. */
export const CALCS = {
  resenas: `<form class="calc" data-calc="resenas" aria-labelledby="calc-resenas-t">
  <h3 id="calc-resenas-t">¿Cuántas reseñas de 5★ te faltan?</h3>
  <p class="desc">Para que Google muestre la calificación que querés, y cuánto pesa una mala.</p>
  <div class="fila"><label>Calificación de hoy<input name="rating" inputmode="decimal" value="4,3" aria-describedby="calc-resenas-n"></label><label>Reseñas totales<input name="cantidad" inputmode="numeric" value="120"></label></div>
  <label>Calificación que querés ver<select name="objetivo"><option value="4.5">4,5 ★</option><option value="4.6">4,6 ★</option><option value="4.7" selected>4,7 ★</option><option value="4.8">4,8 ★</option><option value="4.9">4,9 ★</option></select></label>
  <div class="resultado" data-salida aria-live="polite"><span class="grande">—</span><p>Completá los datos para ver el resultado.</p></div>
  <p class="nota" id="calc-resenas-n">Google redondea a un decimal: para ver 4,7 alcanza con llegar a 4,65 de promedio.</p>
</form>`,
  ml: `<form class="calc" data-calc="ml" aria-labelledby="calc-ml-t">
  <h3 id="calc-ml-t">¿Cuánto ganás de verdad por venta en Mercado Libre?</h3>
  <p class="desc">Precio menos comisión, cargo fijo, envío, publicidad, impuestos y costo.</p>
  <div class="fila"><label>Precio de venta ($)<input name="precio" inputmode="decimal" value="45000"></label><label>Costo del producto ($)<input name="costo" inputmode="decimal" value="21000"></label></div>
  <div class="fila"><label>Comisión (%)<input name="comision" inputmode="decimal" value="14"></label><label>Cargo fijo ($)<input name="fijo" inputmode="decimal" value="0"></label></div>
  <div class="fila"><label>Envío a tu cargo ($)<input name="envio" inputmode="decimal" value="3800"></label><label>Publicidad por venta ($)<input name="ads" inputmode="decimal" value="1500"></label></div>
  <label>Impuestos y retenciones (% del precio)<input name="impuestos" inputmode="decimal" value="4"></label>
  <div class="resultado" data-salida aria-live="polite"><span class="grande">—</span><p>Completá los datos para ver el resultado.</p></div>
  <p class="nota">Los valores de ejemplo son ilustrativos: la comisión cambia según la categoría y el tipo de publicación. Usá los de tu cuenta.</p>
</form>`,
  cliente: `<form class="calc" data-calc="cliente" aria-labelledby="calc-cliente-t">
  <h3 id="calc-cliente-t">¿Cuánto vale un cliente que vuelve?</h3>
  <p class="desc">La ganancia que deja en todo el tiempo que sigue viniendo.</p>
  <div class="fila"><label>Ticket promedio ($)<input name="ticket" inputmode="decimal" value="18000"></label><label>Margen (%)<input name="margen" inputmode="decimal" value="35"></label></div>
  <div class="fila"><label>Visitas por mes<input name="visitas" inputmode="decimal" value="2"></label><label>Meses que sigue viniendo<input name="meses" inputmode="decimal" value="10"></label></div>
  <label>Clientes nuevos por mes (opcional)<input name="clientes" inputmode="numeric" value="200"></label>
  <div class="resultado" data-salida aria-live="polite"><span class="grande">—</span><p>Completá los datos para ver el resultado.</p></div>
  <p class="nota">Cuenta: ticket × margen × visitas por mes × meses. Es una estimación para decidir, no una promesa.</p>
</form>`,
};
