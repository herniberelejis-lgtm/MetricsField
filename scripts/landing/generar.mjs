// Genera el sitio público estático de metricsfield.com dentro de
// public/landing/: home, una página por vertical, Intel (calculadoras),
// el índice de guías y una página por guía. Se corre a mano después de
// tocar plantilla.mjs o guias.mjs, y el resultado se commitea:
//
//   node scripts/landing/generar.mjs
//
// HTML estático a propósito: carga rápido, lo lee cualquier buscador o
// asistente de IA sin ejecutar JavaScript y no depende de la app.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTUALIZADO, GUIAS } from "./guias.mjs";
import { demoHtml } from "./demos.mjs";
import { CALCS, ORGANIZACION, RETAIL_APP, SITIO, esc, faqHtml, faqLd, migas, pagina, wa } from "./plantilla.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "landing");
const ORG = { "@id": ORGANIZACION["@id"] };
const porSlug = Object.fromEntries(GUIAS.map((g) => [g.slug, g]));
// Las páginas con demostración cargan GSAP (copiado en assets/vendor: la CSP
// de la landing no permite scripts de otros dominios) y las animaciones.
const SCRIPTS_DEMO = ["/landing/assets/vendor/gsap.min.js", "/landing/assets/vendor/ScrollTrigger.min.js", "/landing/assets/demos.js"];

function escribir(ruta, html) {
  const archivo = join(RAIZ, ruta === "/" ? "" : ruta.slice(1), "index.html");
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, html);
  return ruta;
}

const ext = (href, texto, clase = "btn") => `<a class="${clase}" href="${href}" target="_blank" rel="noopener">${texto}</a>`;

function tarjetaGuia(g) {
  return `<a class="guia-card" href="/guias/${g.slug}"><span class="tema">${esc(g.tema)}</span><h3>${esc(g.h1)}</h3><p>${esc(g.descripcion)}</p></a>`;
}

function encabezado(eyebrow, h2, texto = "") {
  return `<div class="section-head" data-revelar><div class="eyebrow">${eyebrow}</div><div><h2>${h2}</h2>${texto ? `<p class="muted">${texto}</p>` : ""}</div></div>`;
}

// ---------------------------------------------------------------- piezas

const PIEZAS = [
  {
    nombre: "Standee de mostrador",
    precio: 25000,
    texto: "En la caja, cuando el cliente espera el ticket con el celular en la mano.",
    dibujo: `<div class="standee"><b>CONTANOS<br>CÓMO TE FUE</b><div class="nfc"></div>ACERCÁ TU CELULAR</div>`,
  },
  {
    nombre: "Tarjeta PVC",
    precio: 7000,
    texto: "En el bolsillo de cada persona del equipo, para acercarla al cerrar la cuenta.",
    dibujo: `<div class="card-shape"><b>METRICSFIELD</b><div class="nfc" style="width:30px;height:30px;margin:12px auto"></div></div>`,
  },
  {
    nombre: "Sticker NFC",
    precio: 10000,
    texto: "Compacto para mesas, mostradores y puntos de retiro.",
    dibujo: `<div class="sticker-shape"><b>TOCÁ ACÁ<br>Y CONTANOS</b></div>`,
  },
];
const pesos = (n) => "$" + n.toLocaleString("es-AR");

function tienda() {
  return `<section id="tienda"><div class="wrap">${encabezado(
    "Piezas NFC + QR",
    "Elegí dónde empieza el contacto.",
    "Cada pieza lleva chip NFC y QR impreso, y se paga una vez. El panel de Reputación es aparte: $25.000 por mes + IVA, sin permanencia.",
  )}<div class="shop-grid" data-revelar>${PIEZAS.map(
    (p) => `<article class="shop-card"><div class="device" aria-hidden="true">${p.dibujo}</div><h3>${p.nombre}</h3><p class="muted">${p.texto}</p><div class="price">${pesos(p.precio)}</div><small>Pago único · IVA no incluido</small><button class="btn dark" type="button" data-add="${p.nombre}" data-price="${p.precio}">Agregar al carrito</button></article>`,
  ).join("")}</div></div></section>`;
}

// ---------------------------------------------------------------- home

// Las cuatro puertas de la home: tarjetas con una vista mínima y animada de
// cada producto (la animación la dispara sitio.js al entrar en pantalla y
// se repite al pasar el mouse). Datos de ejemplo, sin cifras de clientes.
const barras = (alturas) => `<div class="mini-barras">${alturas.map((h, i) => `<i style="--h:${h}%;--i:${i}"></i>`).join("")}</div>`;

const PUERTAS = [
  {
    href: "/reputacion",
    num: "01",
    estado: ["ready", "Disponible"],
    nombre: "Reputación",
    texto: "Más reseñas en Google con un toque.",
    vis: `<div class="vis vis-rep"><div class="rep-top"><b>4,7</b><span class="estrellas">${"<i></i>".repeat(5)}</span></div>${barras([30, 42, 38, 55, 64, 72, 88])}<span class="vis-pie">Reseñas por semana</span></div>`,
  },
  {
    href: "/retail",
    num: "02",
    estado: ["ready", "Prueba gratis"],
    nombre: "Retail",
    texto: "La ganancia real de cada venta en Mercado Libre.",
    vis: `<div class="vis vis-ret">${[
      ["Precio", 0, 100, "dato"],
      ["Comisiones", 72, 28, "menos"],
      ["Costo", 26, 46, "menos"],
      ["Ganancia", 0, 26, "mas"],
    ]
      .map(([t, x, w, c], i) => `<div class="cascada"><span>${t}</span><b><i class="${c}" style="--x:${x}%;--w:${w}%;--i:${i}"></i></b></div>`)
      .join("")}</div>`,
  },
  {
    href: "/loyalty",
    num: "03",
    estado: ["pilot", "Piloto"],
    nombre: "Loyalty",
    texto: "Clientes que vuelven, con la tarjeta en el celular.",
    vis: `<div class="vis vis-loy"><div class="sellos">${Array.from({ length: 10 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div><span class="premio">Beneficio listo</span></div>`,
  },
  {
    href: "/herramientas",
    num: "04",
    estado: ["free", "Gratis, ya"],
    nombre: "Intel",
    texto: "Calculadoras y guías para decidir con números.",
    vis: `<div class="vis vis-int"><span class="vis-pie">Te faltan</span><b class="contador" data-contar="120">120</b><span class="vis-pie">reseñas de 5★ para ver 4,7</span><div class="progreso"><i></i></div></div>`,
  },
];

const PRODUCTOS = [
  {
    id: "reputacion",
    estado: ["ready", "Disponible"],
    h3: "Más clientes hablando bien de vos, donde te buscan.",
    p: "Un cartel NFC o QR lleva a cada cliente directo a dejar su reseña en Google, el mismo camino para todos. En tu panel ves los toques, las reseñas nuevas con una respuesta sugerida, qué valoran y qué hay que arreglar.",
    pasos: [["Acercan el celular", "Sin app ni contraseña."], ["Dejan su reseña", "Directo en tu ficha de Google."], ["Vos medís", "Toques, reseñas, vistas y temas."]],
    kw: ["Reseñas de Google", "Google Maps", "SEO local", "GEO e IA", "Respuestas a reseñas"],
    ctas: [`<a class="btn dark" href="/reputacion">Conocer Reputación</a>`, ext(wa("Hola, quiero una demo de Reputación"), "Pedir demo")],
  },
  {
    id: "retail",
    estado: ["ready", "Prueba gratis 30 días"],
    h3: "Vendiste en Mercado Libre. Ahora sabé cuánto ganaste.",
    p: "Conectás tu cuenta de Mercado Libre y ves juntos comisión, envío, publicidad, impuestos y costo del producto, venta por venta y producto por producto. Cuando falta un costo, lo decimos en vez de inventarlo.",
    pasos: [["Conectás tu cuenta", "Sin compartir tu contraseña."], ["Cargás tus costos", "Una vez, con historial."], ["Ves tu margen real", "Por producto, venta y mes."]],
    kw: ["Rentabilidad en Mercado Libre", "Margen por producto", "Mercado Ads", "IVA e IIBB", "Precio de venta"],
    ctas: [`<a class="btn dark" href="/retail">Conocer Retail</a>`, ext(RETAIL_APP, "Pedir la prueba")],
  },
  {
    id: "loyalty",
    estado: ["pilot", "Buscamos pilotos"],
    h3: "Que vuelvan. Y saber quiénes son.",
    p: "Un club de beneficios con la tarjeta en Google Wallet: el cliente se suma con un toque, junta sellos o puntos y canjea en el mostrador. Está en etapa piloto: hoy podés anotarte para probarlo con nosotros.",
    pasos: [["Un toque", "El cliente se suma al club."], ["Un beneficio", "Tus reglas, claras."], ["Una relación", "Sabés quién vuelve y cada cuánto."]],
    kw: ["Fidelización de clientes", "Google Wallet", "Clientes recurrentes", "Sistema de puntos", "CRM"],
    ctas: [`<a class="btn dark" href="/loyalty">Conocer Loyalty</a>`, ext(wa("Hola, quiero ser comercio piloto de Loyalty"), "Quiero ser piloto")],
  },
  {
    id: "intel",
    estado: ["free", "Gratis, ya disponible"],
    h3: "Los números que conviene saber antes de decidir.",
    p: "Intel arranca abierto para todos: calculadoras que responden preguntas concretas y guías escritas para que entiendas el tema aunque nunca nos compres nada. Lo que aprendemos midiendo comercios reales vuelve acá.",
    pasos: [["Calculás", "Reseñas, margen y valor del cliente."], ["Entendés", "Diez guías, sin vueltas."], ["Decidís", "Con números y no a ojo."]],
    kw: ["Calculadora de reseñas", "Calculadora Mercado Libre", "Valor del cliente", "Guías"],
    ctas: [`<a class="btn dark" href="/herramientas">Usar las calculadoras</a>`, `<a class="btn" href="/guias">Leer las guías</a>`],
  },
];

const CICLO = [
  ["Te encuentran", "Aparecés cuando te buscan cerca, en Google, en Maps y en las respuestas de la IA.", "Reputación", "/guias/posicionamiento-en-google-maps"],
  ["Te eligen", "Las reseñas recientes y bien respondidas convencen a quien todavía no te conoce.", "Reputación", "/guias/como-conseguir-resenas-en-google"],
  ["Te compran", "Cada venta deja ganancia de verdad, no solo facturación.", "Retail", "/guias/rentabilidad-real-mercado-libre"],
  ["Vuelven", "Un beneficio claro y la tarjeta en el celular para que la segunda visita llegue antes.", "Loyalty", "/guias/fidelizacion-de-clientes"],
  ["Te recomiendan", "El cliente fiel cuenta su experiencia y trae al próximo.", "Reputación + Loyalty", "/guias/ciclo-de-vida-del-cliente"],
];

const FAQ_HOME = [
  ["¿Qué es MetricsField?", "Software para comercios y vendedores de Argentina, hecho en Córdoba. Tiene tres productos: Reputación (más reseñas en Google con carteles NFC/QR y un panel), Retail (la ganancia real de cada venta en Mercado Libre) y Loyalty (club de beneficios con tarjeta en Google Wallet, en piloto). Además, Intel: calculadoras y guías gratis."],
  ["¿Mis clientes tienen que instalar una app?", "No. El cartel abre desde el navegador del celular por NFC o QR, y la tarjeta de Loyalty vive en Google Wallet, que ya viene en Android."],
  ["¿Es seguro para mi ficha de Google?", "Sí. El cartel lleva a todos los clientes al mismo link público de Google para dejar su reseña, sin filtrar por calificación y sin premios a cambio, que es lo que piden las políticas de Google."],
  ["¿Cómo calcula Retail la ganancia real?", "Reúne lo que Mercado Libre descuenta en cada operación (comisión, envío, publicidad) más impuestos y el costo del producto que cargás. La prueba gratis dura 30 días."],
  ["¿Loyalty ya se puede contratar?", "Está en etapa piloto: lo estamos probando con pocos comercios antes de abrirlo. Si te interesa, escribinos y te sumamos a la lista."],
  ["¿Funciona fuera de Córdoba?", "Sí. Retail y las herramientas de Intel funcionan online en todo el país. En Reputación, en Córdoba instalamos y al resto del país enviamos las piezas listas para activar con ayuda por WhatsApp."],
];

function home() {
  const cuerpo = `<section class="hero"><div class="wrap">
  <div class="hero-grid"><div><div class="eyebrow">Software para comercios y vendedores · Córdoba, Argentina</div><h1>Cada contacto deja un dato.<span>Cada dato, una decisión.</span></h1></div>
  <div class="hero-side"><p class="lead">MetricsField convierte lo que pasa en tu negocio en información simple para conseguir más reseñas, ganar más por venta y lograr que tus clientes vuelvan.</p><div class="actions"><a class="btn dark" href="#productos">Encontrá tu herramienta</a><a class="btn" href="/herramientas">Probar las calculadoras</a></div>
  <ul class="trust"><li>Sin apps para tus clientes</li><li>Soporte por WhatsApp</li><li>Hecho en Córdoba</li></ul></div></div>
  <div class="portal-title"><b>Elegí una puerta</b><p>Tres productos para tres momentos del cliente, y una cuarta abierta para todos.</p></div>
  <nav class="switchboard" aria-label="Productos">${PUERTAS.map(
    (p) =>
      `<a class="door" href="${p.href}" data-animar><span class="door-top"><span class="num">${p.num}</span><span class="status ${p.estado[0]}">${p.estado[1]}</span></span><div class="vis-caja" aria-hidden="true">${p.vis}</div><div class="door-txt"><h3>${p.nombre}</h3><p>${p.texto}</p></div><span class="ir">Entrar <span aria-hidden="true">→</span></span></a>`,
  ).join("")}</nav></div>
  <div class="ticker"><div class="wrap ticker-in">
    <div class="proof"><b>17%</b><span>de ganancia inflada encontramos en una cuenta real de Mercado Libre</span></div>
    <div class="proof"><b>1 toque</b><span>para que un cliente deje su reseña</span></div>
    <div class="proof"><b>0 apps</b><span>que tus clientes tengan que descargar</span></div>
    <div class="proof"><b>10 guías</b><span>gratis sobre reseñas, Maps, SEO, Mercado Libre y fidelización</span></div>
  </div></div>
</section>
<section class="intel" id="intel"><div class="wrap">${encabezado(
    "Intel · gratis, desde hoy",
    "Tres preguntas que conviene contestar con números.",
    "Usalas sin registrarte. Las cuentas están explicadas al lado de cada resultado, y cada una tiene su guía para entender qué hacer después.",
  )}<div class="calcs" data-revelar>${CALCS.resenas}${CALCS.ml}${CALCS.cliente}</div>
  <p class="actualizado"><a href="/herramientas">Ver las calculadoras con la explicación completa</a> · <a href="/guias">Leer las guías</a></p></div></section>
<section id="productos"><div class="wrap">${encabezado(
    "Tres productos y una puerta abierta",
    "Elegí el problema que querés resolver.",
    "No vendemos una plataforma enorme que tengas que aprender. Empezás por una necesidad concreta y sumás lo demás cuando haga falta.",
  )}${PRODUCTOS.map(
    (p, i) => `<article class="product" id="producto-${p.id}" data-revelar><div class="product-tag"><span class="product-index">0${i + 1}</span><span class="status ${p.estado[0]}">${p.estado[1]}</span></div><div class="product-body"><h3>${p.h3}</h3><p>${p.p}</p><div class="steps">${p.pasos
      .map(([b, s]) => `<div class="step"><b>${b}</b><span>${s}</span></div>`)
      .join("")}</div><div class="actions">${p.ctas.join("")}</div><ul class="kw" aria-label="Temas">${p.kw.map((k) => `<li>${k}</li>`).join("")}</ul></div></article>`,
  ).join("")}</div></section>
<section id="ciclo" style="padding-top:0"><div class="wrap">${encabezado(
    "El ciclo completo del cliente",
    "Del primer “cerca de mí” a la recomendación.",
    "Cada etapa tiene un número que la mide. Nosotros nos ocupamos de que lo veas, en la herramienta que corresponde.",
  )}<ol class="ciclo" data-revelar>${CICLO.map(
    ([h, p, quien, guia], i) => `<li><span class="paso">Etapa ${i + 1}</span><h3>${h}</h3><p>${p}</p><a class="quien" href="${guia}">${quien} · leer la guía</a></li>`,
  ).join("")}</ol></div></section>
<section id="demo" style="padding-top:0"><div class="wrap">${encabezado(
    "Producto, no promesa",
    "Mirá qué decisiones te ayuda a tomar.",
    "Esta demo usa información de ejemplo. Sirve para entender el producto; no representa resultados de un cliente.",
  )}<div class="demo-shell" data-revelar><div class="demo-top"><div class="tabs" role="tablist" aria-label="Productos de la demo">
    <button class="tab" type="button" role="tab" aria-selected="true" data-demo="reputacion">Reputación</button><button class="tab" type="button" role="tab" aria-selected="false" data-demo="retail">Retail</button><button class="tab" type="button" role="tab" aria-selected="false" data-demo="loyalty">Loyalty</button><button class="tab" type="button" role="tab" aria-selected="false" data-demo="intel">Intel</button></div><span class="demo-label">Demo · datos de ejemplo</span></div>
  <div class="demo-content" aria-live="polite"><div class="demo-copy"><div class="eyebrow" data-demo-kicker>Reputación en Google</div><h3 data-demo-title>La opinión aparece mientras todavía importa.</h3><p data-demo-text>Toques al cartel, reseñas nuevas, qué valoran y qué hay que responder hoy.</p></div>
  <div class="metric-grid"><div class="metric"><small data-metric-a-label>Toques al cartel</small><strong data-metric-a>148</strong></div><div class="metric"><small data-metric-b-label>Terminan en reseña</small><strong data-metric-b>62%</strong></div>
  <div class="chart" role="img" aria-label="Gráfico ilustrativo de una semana"><i class="bar" style="height:32%"></i><i class="bar" style="height:47%"></i><i class="bar" style="height:39%"></i><i class="bar" style="height:68%"></i><i class="bar" style="height:82%"></i><i class="bar" style="height:74%"></i><i class="bar" style="height:94%"></i></div></div></div></div></div></section>
${tienda()}
<section id="guias" class="intel"><div class="wrap">${encabezado(
    "Guías",
    "Lo que hay que saber, explicado sin vueltas.",
    "Reseñas, Google Maps, SEO local, GEO, Mercado Libre, fidelización y gestión de clientes. Escritas para servirte aunque nunca nos compres nada.",
  )}<div class="guias-grid" data-revelar>${GUIAS.slice(0, 6).map(tarjetaGuia).join("")}</div>
  <p class="actualizado"><a class="btn dark" href="/guias">Ver las ${GUIAS.length} guías</a></p></div></section>
<section class="start"><div class="wrap">${encabezado("De la idea al uso", "Empezar es simple.")}<div class="start-grid" data-revelar>
  <article class="start-item"><b>01</b><h3>Elegís una herramienta</h3><p>Te ayudamos a empezar por la que más impacto tiene hoy en tu negocio.</p></article>
  <article class="start-item"><b>02</b><h3>La dejamos funcionando</h3><p>En Córdoba instalamos. En el resto del país te llega lista para activar, con ayuda por WhatsApp.</p></article>
  <article class="start-item"><b>03</b><h3>Medís y decidís</h3><p>El panel ordena la información y marca el próximo paso.</p></article></div></div></section>
<section id="clientes"><div class="wrap">${encabezado(
    "Clientes",
    "Resultados reales, contados por quienes los lograron.",
    "Este espacio crece con casos verificables. No usamos logos, frases ni números sin permiso.",
  )}<div class="clients-stage" data-revelar><div class="clients-copy"><span class="status pilot">En construcción</span><h3>La próxima historia puede ser la tuya.</h3><p class="muted">Estamos documentando implementaciones con nombre, contexto, punto de partida y resultado. Cuando un cliente autorice su publicación, su caso aparece acá.</p>${ext(
    wa("Hola, quiero conocer los casos de MetricsField"),
    "Consultar casos",
    "btn dark",
  )}</div>
  <div class="client-rules"><div class="client-rule"><b>01</b><div><b>Nombre y permiso</b><br><span>El cliente decide si mostramos su marca, su testimonio y sus datos.</span></div></div><div class="client-rule"><b>02</b><div><b>Antes y después</b><br><span>Cada resultado dice punto de partida, período y contexto.</span></div></div><div class="client-rule"><b>03</b><div><b>Asociación, no magia</b><br><span>Si un número sube, contamos qué más pasó en ese tiempo.</span></div></div></div></div></div></section>
<section id="faq" style="padding-top:0"><div class="wrap">${encabezado("Preguntas frecuentes", "Una respuesta corta para cada duda.")}${faqHtml(FAQ_HOME)}</div></section>
<section class="cta"><div class="wrap cta-grid"><h2>Empezá por donde más te duele.</h2><div><p>Contanos cómo funciona tu negocio. Te mostramos el camino más corto para convertir ese problema en información útil.</p><div class="actions">${ext(
    wa("Hola, quiero ver qué producto de MetricsField me sirve"),
    "Hablar por WhatsApp",
    "btn light",
  )}<a class="btn" href="#productos">Comparar productos</a></div></div></div></section>`;

  return pagina({
    ruta: "/",
    titulo: "MetricsField · Reseñas en Google, rentabilidad en Mercado Libre y fidelización de clientes",
    descripcion:
      "Software para comercios de Argentina: más reseñas en Google con carteles NFC, la ganancia real de cada venta en Mercado Libre y clientes que vuelven con Google Wallet. Calculadoras y guías gratis.",
    cuerpo,
    ld: [
      {
        "@type": "WebSite",
        "@id": `${SITIO}/#sitio`,
        url: `${SITIO}/`,
        name: "MetricsField",
        inLanguage: "es-AR",
        publisher: ORG,
      },
      faqLd(FAQ_HOME),
    ],
  });
}

// ---------------------------------------------------------------- verticales

function vertical(v) {
  const m = migas([["/", "Inicio"], [v.ruta, v.nombre]]);
  const cuerpo = `${m.html}
<header class="pagina-hero wrap"><div class="eyebrow">${v.eyebrow}</div><h1>${v.h1}</h1><p class="lead">${v.lead}</p><div class="actions" style="margin-top:24px">${v.ctas.join("")}</div></header>
${v.captura ? `<div class="wrap"><figure class="captura" style="margin:0"><img src="${v.captura.src}" alt="${esc(v.captura.alt)}" width="${v.captura.w}" height="${v.captura.h}" loading="lazy"></figure></div>` : ""}
${v.demo ? demoHtml(v.demo, encabezado) : ""}
<section style="padding-top:64px"><div class="wrap">${encabezado(v.featuresEyebrow, v.featuresH2)}<div class="features" data-revelar>${v.features
    .map(([h, p]) => `<div class="feature"><h3>${h}</h3><p>${p}</p></div>`)
    .join("")}</div></div></section>
<section style="padding-top:0"><div class="wrap">${encabezado("Cómo funciona", v.pasosH2)}<ol class="ciclo pasos-${v.pasos.length}">${v.pasos
    .map(([h, p], i) => `<li><span class="paso">Paso ${i + 1}</span><h3>${h}</h3><p>${p}</p></li>`)
    .join("")}</ol></div></section>
${v.extra ?? ""}
<section class="intel"><div class="wrap">${encabezado("Para seguir leyendo", "Guías sobre este tema.")}<div class="guias-grid">${v.guias
    .map((s) => tarjetaGuia(porSlug[s]))
    .join("")}</div></div></section>
<section><div class="wrap">${encabezado("Preguntas frecuentes", `Sobre ${v.nombre}.`)}${faqHtml(v.faq)}</div></section>
<section class="cta"><div class="wrap cta-grid"><h2>${v.ctaH2}</h2><div><p>${v.ctaP}</p><div class="actions">${v.ctasFinal.join("")}</div></div></div></section>`;

  return pagina({
    ruta: v.ruta,
    titulo: v.titulo,
    descripcion: v.descripcion,
    cuerpo,
    scripts: v.demo ? SCRIPTS_DEMO : [],
    ld: [
      m.ld,
      {
        "@type": v.tipoLd ?? "Service",
        name: v.nombreLd,
        description: v.descripcion,
        provider: ORG,
        areaServed: { "@type": "Country", name: "Argentina" },
        url: `${SITIO}${v.ruta}`,
        ...(v.ldExtra ?? {}),
      },
      faqLd(v.faq),
    ],
  });
}

const VERTICALES = [
  {
    ruta: "/reputacion",
    nombre: "Reputación",
    demo: "reputacion",
    nombreLd: "MetricsField Reputación",
    titulo: "Más reseñas en Google con carteles NFC y QR · MetricsField Reputación",
    descripcion:
      "Carteles NFC y QR que llevan a tus clientes directo a dejar su reseña en Google, y un panel con toques, reseñas, respuestas sugeridas y lo que dicen de tu negocio. Córdoba y todo el país.",
    eyebrow: "Reputación · disponible",
    h1: "Más reseñas en Google, con un toque del celular.",
    lead: "Un cartel en el mostrador lleva a cada cliente directo a la ventana de reseña de tu ficha. Vos ves en un panel cuántos lo usaron, qué reseñas llegaron, qué valoran y qué hay que responder hoy.",
    ctas: [ext(wa("Hola, quiero una demo de Reputación"), "Pedir una demo", "btn dark"), `<a class="btn" href="#tienda">Ver piezas y precios</a>`],
    captura: { src: "/landing/assets/img/panel-resumen.webp", alt: "Resumen del panel de Reputación con toques, reseñas y calificación", w: 1919, h: 874 },
    featuresEyebrow: "Qué incluye",
    featuresH2: "El cartel, el panel y alguien que te ayuda.",
    features: [
      ["Piezas NFC + QR", "Standee, tarjeta o sticker. Sin batería y sin app: el cliente acerca el celular o escanea, y se abre tu reseña."],
      ["El mismo camino para todos", "Todos los clientes van al mismo link público de Google, sin filtros por calificación ni premios. Lo que Google pide."],
      ["Toques y reseñas", "Cuántas veces se usó cada pieza, a qué hora y qué día, y cuántas reseñas llegaron después."],
      ["Respuestas sugeridas", "Cada reseña nueva llega con un borrador de respuesta para que contestar todas lleve minutos."],
      ["Qué dicen de vos", "Los temas que se repiten en las reseñas: lo que valoran y lo que conviene arreglar."],
      ["Tu visibilidad en Google", "Vistas de la ficha, pedidos de cómo llegar, llamadas y las búsquedas con las que te encontraron."],
    ],
    pasosH2: "En una semana lo tenés andando.",
    pasos: [
      ["Vinculamos tu ficha", "Conectamos el cartel con tu Perfil de Empresa de Google."],
      ["Lo instalamos", "En Córdoba vamos al local; al resto del país te llega listo."],
      ["Lo pide el equipo", "Una frase al cobrar y el cartel hace el resto."],
      ["Medís", "Tu portal privado muestra todo, sin usuario ni contraseña."],
    ],
    extra: tienda(),
    guias: ["como-conseguir-resenas-en-google", "posicionamiento-en-google-maps", "seo-local-posicionamiento-web", "geo-aparecer-en-respuestas-de-ia"],
    faq: [
      ["¿El NFC funciona con iPhone?", "Sí: los iPhone desde el 7 leen NFC sin apps (los más viejos que el XS necesitan abrir el lector desde el centro de control). En Android funciona en la mayoría de los equipos con NFC. Y cada pieza tiene además el QR impreso para cualquier celular."],
      ["¿Es seguro para mi ficha de Google?", "Sí. No compramos reseñas ni pedimos una calificación en particular: el cartel lleva a todos los clientes al mismo link público de Google. Eso es lo que permiten las políticas de Google."],
      ["¿Puedo cambiar a dónde lleva el cartel?", "Sí. El link pasa por nuestros servidores, así que si cambiás de ficha o de sucursal lo actualizamos sin reimprimir nada."],
      ["¿Cuánto cuesta?", "Las piezas se pagan una vez: standee $25.000, tarjeta $7.000 y sticker $10.000. El panel cuesta $25.000 por mes + IVA, sin permanencia mínima."],
      ["¿Qué diferencia hay entre el standee y las tarjetas?", "El standee queda fijo en el mostrador y lo ven todos. Las tarjetas las lleva cada persona del equipo y permiten saber qué reseñas vinieron de quién."],
    ],
    ctaH2: "Que te elijan antes de conocerte.",
    ctaP: "Escribinos y te mostramos el panel con datos de ejemplo. Si te sirve, en una semana lo tenés en tu mostrador.",
    ctasFinal: [ext(wa("Hola, quiero empezar con Reputación"), "Hablar por WhatsApp", "btn light"), `<a class="btn" href="/guias/como-conseguir-resenas-en-google">Leer la guía de reseñas</a>`],
    ldExtra: { serviceType: "Gestión de reseñas de Google para comercios" },
  },
  {
    ruta: "/retail",
    nombre: "Retail",
    demo: "retail",
    nombreLd: "MetricsField Retail",
    tipoLd: "SoftwareApplication",
    titulo: "Rentabilidad real en Mercado Libre: la ganancia de cada venta · MetricsField Retail",
    descripcion:
      "Conectá tu cuenta de Mercado Libre y mirá la ganancia real de cada venta y cada producto: comisión, envío, publicidad, IVA, impuestos y costo. Prueba gratis de 30 días, sin tarjeta.",
    eyebrow: "Retail · Mercado Libre",
    h1: "Vendiste. Ahora sabé cuánto ganaste de verdad.",
    lead: "Mercado Libre te muestra cuánto facturaste. Retail te muestra cuánto te quedó: descuenta comisión, envío, publicidad, IVA, otros impuestos y el costo de cada producto, venta por venta.",
    ctas: [ext(RETAIL_APP, "Pedir la prueba gratis", "btn dark"), ext(wa("Hola, quiero probar Retail"), "Consultar por WhatsApp")],
    featuresEyebrow: "Qué ves",
    featuresH2: "El número que importa, sin planilla.",
    features: [
      ["Ganancia neta por venta", "Precio menos comisión, cargo fijo, envío, publicidad, IVA, otros impuestos y costo del producto."],
      ["Margen por producto", "Cuáles te dejan plata, cuáles apenas y cuáles venden a pérdida sin que se note."],
      ["Costos con historial", "Cargás el costo una vez y, si cambia, el pasado se sigue calculando con el costo de ese momento."],
      ["Publicidad que rinde", "Mercado Ads y la publicidad externa que cargues, comparadas con la ganancia que trajeron."],
      ["Fiscalidad argentina", "IVA de Responsable Inscripto sobre las ventas reales e Ingresos Brutos configurable."],
      ["Honesto con los datos", "Si a una venta le falta el costo, la mostramos aparte en vez de contarla como ganancia."],
    ],
    pasosH2: "Del primer ingreso al número real.",
    pasos: [
      ["Pedís la prueba", "30 días gratis, sin tarjeta."],
      ["Conectás Mercado Libre", "Con el permiso oficial, sin compartir tu contraseña."],
      ["Cargás tus costos", "Una vez por producto; te ayudamos con los primeros."],
      ["Ves tu margen", "Por venta, producto y mes, con el detalle de cada descuento."],
    ],
    extra: `<section class="intel"><div class="wrap">${encabezado(
      "Probalo ya",
      "Hacé la cuenta con una venta tuya.",
      "La misma cuenta que hace Retail, para una sola venta. Retail la hace sola para todas, con los datos reales de tu cuenta.",
    )}<div class="calcs" style="grid-template-columns:minmax(0,560px)">${CALCS.ml}</div></div></section>`,
    guias: ["rentabilidad-real-mercado-libre", "clientes-recurrentes", "ciclo-de-vida-del-cliente"],
    faq: [
      ["¿Cómo calcula la ganancia real?", "Toma de Mercado Libre la comisión, el envío y la publicidad de cada operación, suma IVA y los otros impuestos que configures, y resta el costo del producto que cargaste. Lo que queda es la ganancia neta."],
      ["¿Tengo que darles mi contraseña de Mercado Libre?", "No. Te conectás con el permiso oficial de Mercado Libre (OAuth) y podés revocarlo cuando quieras desde tu cuenta."],
      ["¿Cuánto dura la prueba?", "30 días, sin tarjeta. Te ayudamos a conectar la cuenta y a cargar los primeros costos."],
      ["¿Sirve si vendo poco?", "Sí: con pocas ventas un producto a pérdida pesa más. Lo importante es tener cargado el costo de lo que vendés."],
      ["¿Mis datos los ve otro vendedor?", "No. Cada cuenta está aislada en la base de datos: aunque hubiera un error en el código, la base no deja ver datos de otra cuenta."],
    ],
    ctaH2: "Facturar más no siempre es ganar más.",
    ctaP: "Pedí la prueba y en unos días sabés qué productos te dejan plata y cuáles no.",
    ctasFinal: [ext(RETAIL_APP, "Pedir la prueba gratis", "btn light"), `<a class="btn" href="/guias/rentabilidad-real-mercado-libre">Leer la guía</a>`],
    ldExtra: { applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "ARS", description: "Prueba gratis de 30 días" } },
  },
  {
    ruta: "/loyalty",
    nombre: "Loyalty",
    demo: "loyalty",
    nombreLd: "MetricsField Loyalty",
    titulo: "Fidelización de clientes con Google Wallet: club de beneficios · MetricsField Loyalty",
    descripcion:
      "Club de beneficios para comercios con la tarjeta en Google Wallet: alta con un toque, sellos o puntos, canje en el mostrador y quién vuelve y cada cuánto. En etapa piloto en Córdoba.",
    eyebrow: "Loyalty · piloto",
    h1: "Que tus clientes vuelvan, y saber quiénes son.",
    lead: "Un club de beneficios con la tarjeta en la billetera del celular. El cliente se suma con un toque, junta sellos o puntos y canjea en el mostrador. Vos sabés quién vuelve, cada cuánto y qué beneficio funciona.",
    ctas: [ext(wa("Hola, quiero ser comercio piloto de Loyalty"), "Quiero ser piloto", "btn dark"), `<a class="btn" href="/guias/tarjeta-de-fidelidad-google-wallet">Cómo funciona Wallet</a>`],
    featuresEyebrow: "Qué incluye el piloto",
    featuresH2: "Una tarjeta que no se pierde.",
    features: [
      ["Tarjeta en Google Wallet", "Se guarda en la billetera del celular, como una tarjeta de embarque. No hay app para instalar."],
      ["Alta con consentimiento", "El cliente se suma con un toque al cartel y acepta qué datos comparte. Nada sin permiso."],
      ["Sellos o puntos", "Vos elegís la regla: cada X visitas un beneficio, o puntos por compra."],
      ["Canje seguro", "En el mostrador, con un QR de un solo uso: no se puede canjear dos veces con una captura."],
      ["Misiones", "Beneficios por acciones concretas, como traer a un amigo."],
      ["Quién vuelve", "Clientes del club, visitas, frecuencia y cuántos canjean."],
    ],
    pasosH2: "Así se suma un cliente.",
    pasos: [
      ["Toca el cartel", "En el mostrador, como con Reputación."],
      ["Se suma al club", "Con su consentimiento, en segundos."],
      ["Guarda la tarjeta", "Un botón y queda en Google Wallet."],
      ["Vuelve y canjea", "Muestra el QR y vos lo validás."],
    ],
    extra: `<section class="intel"><div class="wrap">${encabezado(
      "Antes de empezar",
      "¿Cuánto vale que un cliente vuelva?",
      "Hacé la cuenta con los números de tu negocio. Es la pregunta que responde si un club de beneficios te conviene.",
    )}<div class="calcs" style="grid-template-columns:minmax(0,560px)">${CALCS.cliente}</div></div></section>`,
    guias: ["fidelizacion-de-clientes", "tarjeta-de-fidelidad-google-wallet", "clientes-recurrentes", "crm-gestion-de-clientes"],
    faq: [
      ["¿Ya se puede contratar?", "Todavía no como producto terminado: estamos haciendo un piloto con pocos comercios para ajustar el producto con uso real. Si te interesa, escribinos y te sumamos."],
      ["¿Funciona con iPhone?", "La tarjeta del piloto es de Google Wallet, que viene en Android. En iPhone el cliente puede usar el club desde el navegador mientras sumamos Apple Wallet."],
      ["¿Qué datos de mis clientes se guardan?", "Solo los que el cliente acepta compartir al sumarse, y para lo que se le explicó. Los usás para tu club, no se venden ni se comparten."],
      ["¿Es lo mismo que pedir reseñas a cambio de un premio?", "No. Loyalty premia visitas y compras. Las reseñas de Google no se premian, porque las políticas de Google lo prohíben."],
    ],
    ctaH2: "La segunda visita es la que hace un cliente.",
    ctaP: "Buscamos comercios de Córdoba que quieran probar el club con nosotros y ayudarnos a mejorarlo.",
    ctasFinal: [ext(wa("Hola, quiero ser comercio piloto de Loyalty"), "Quiero ser piloto", "btn light"), `<a class="btn" href="/guias/fidelizacion-de-clientes">Leer la guía</a>`],
    ldExtra: { serviceType: "Programa de fidelización de clientes con Google Wallet" },
  },
];

// ---------------------------------------------------------------- herramientas

function herramientas() {
  const m = migas([["/", "Inicio"], ["/herramientas", "Intel · calculadoras"]]);
  const bloques = [
    [CALCS.resenas, "Cómo se calcula", `<p>Google muestra el promedio de todas las reseñas redondeado a un decimal. Si hoy tenés un promedio <em>r</em> con <em>n</em> reseñas y querés llegar a un mínimo <em>m</em> (para ver 4,7 alcanza con 4,65), las reseñas de 5★ seguidas que hacen falta son <strong>n × (m − r) ÷ (5 − m)</strong>, redondeado hacia arriba.</p><p>Una reseña de 1★ baja el promedio tanto como suben <strong>(r − 1) ÷ (5 − r)</strong> reseñas de 5★: con un 4,5 hacen falta 7 para compensarla. Por eso responder bien y resolver la queja vale tanto como pedir reseñas.</p>`, "como-conseguir-resenas-en-google"],
    [CALCS.ml, "Cómo se calcula", `<p>Ganancia = precio − costo − (comisión × precio) − cargo fijo − envío a tu cargo − publicidad por venta − (impuestos × precio).</p><p>La comisión depende de la categoría y del tipo de publicación, y el cargo fijo aplica a los productos más baratos: usá los valores que figuran en el detalle de tu venta. Si sos Responsable Inscripto, sumá en impuestos el IVA que no recuperás y los Ingresos Brutos.</p>`, "rentabilidad-real-mercado-libre"],
    [CALCS.cliente, "Cómo se calcula", `<p>Valor de un cliente = ticket promedio × margen × visitas por mes × meses que sigue viniendo. Es la ganancia que deja, no lo que factura.</p><p>La segunda parte responde cuánto suma lograr que vuelva un 10% más de tus clientes nuevos de cada mes. Sirve para decidir cuánto podés invertir en un beneficio sin perder plata.</p>`, "fidelizacion-de-clientes"],
  ];
  const cuerpo = `${m.html}
<header class="pagina-hero wrap"><div class="eyebrow">Intel · gratis, sin registrarte</div><h1>Calculadoras para decidir con números.</h1><p class="lead">Tres preguntas que todo comercio y vendedor se hace, con la cuenta a la vista. Cambiá los valores y el resultado se actualiza solo.</p></header>
${bloques
  .map(
    ([calc, h, texto, guia]) => `<section style="padding:40px 0"><div class="wrap articulo" style="padding:0">
  <div>${calc}</div>
  <div class="prosa"><h2 style="margin-top:0">${h}</h2>${texto}<p><a href="/guias/${guia}">Leer la guía: ${esc(porSlug[guia].h1)}</a></p></div></div></section>`,
  )
  .join("")}
${demoHtml("intel", encabezado)}
<section class="intel"><div class="wrap">${encabezado("Guías", "Para entender qué hacer con el resultado.")}<div class="guias-grid" data-revelar>${GUIAS.slice(0, 6).map(tarjetaGuia).join("")}</div></div></section>`;
  return pagina({
    ruta: "/herramientas",
    scripts: SCRIPTS_DEMO,
    titulo: "Calculadoras gratis: reseñas de Google, ganancia en Mercado Libre y valor del cliente · MetricsField Intel",
    descripcion:
      "Calculá cuántas reseñas de 5★ te faltan para subir tu calificación en Google, cuánto ganás de verdad por venta en Mercado Libre y cuánto vale un cliente que vuelve. Gratis y sin registrarte.",
    cuerpo,
    ld: [
      m.ld,
      ...[
        ["Calculadora de reseñas de Google", "Cuántas reseñas de 5 estrellas hacen falta para llegar a una calificación en Google."],
        ["Calculadora de ganancia en Mercado Libre", "Ganancia real de una venta en Mercado Libre después de comisión, envío, publicidad, impuestos y costo."],
        ["Calculadora del valor de un cliente", "Ganancia que deja un cliente que vuelve durante todo el tiempo que sigue comprando."],
      ].map(([name, description]) => ({
        "@type": "WebApplication",
        name,
        description,
        url: `${SITIO}/herramientas`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "es-AR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
        provider: ORG,
      })),
    ],
  });
}

// ---------------------------------------------------------------- guías

function indiceGuias() {
  const m = migas([["/", "Inicio"], ["/guias", "Guías"]]);
  const cuerpo = `${m.html}
<header class="pagina-hero wrap"><div class="eyebrow">Guías · actualizadas en 2026</div><h1>Todo lo que hay que saber para que te encuentren, te elijan y vuelvan.</h1><p class="lead">Reseñas de Google, posicionamiento en Maps, SEO local, GEO, rentabilidad en Mercado Libre, fidelización, Google Wallet, clientes recurrentes, CRM y el ciclo de vida del cliente. Sin cifras inventadas y con las reglas de cada plataforma citadas.</p></header>
<section style="padding-top:20px"><div class="wrap"><div class="guias-grid">${GUIAS.map(tarjetaGuia).join("")}</div></div></section>`;
  return pagina({
    ruta: "/guias",
    titulo: "Guías de reseñas en Google, Google Maps, SEO local, Mercado Libre y fidelización · MetricsField",
    descripcion:
      "Guías prácticas para comercios y vendedores de Argentina: reseñas de Google, posicionamiento en Google Maps, SEO local y GEO, rentabilidad en Mercado Libre, fidelización, Google Wallet y CRM.",
    cuerpo,
    ld: [
      m.ld,
      {
        "@type": "CollectionPage",
        name: "Guías de MetricsField",
        url: `${SITIO}/guias`,
        inLanguage: "es-AR",
        publisher: ORG,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: GUIAS.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITIO}/guias/${g.slug}`, name: g.h1 })),
        },
      },
    ],
  });
}

function fechaLarga(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function guia(g) {
  const ruta = `/guias/${g.slug}`;
  const m = migas([["/", "Inicio"], ["/guias", "Guías"], [ruta, g.tema]]);
  const cuerpo = `${m.html}
<header class="pagina-hero wrap"><div class="eyebrow">Guía · ${esc(g.tema)}</div><h1>${esc(g.h1)}</h1><p class="lead">${esc(g.lead)}</p><p class="actualizado">Actualizada el <time datetime="${ACTUALIZADO}">${fechaLarga(ACTUALIZADO)}</time> · Equipo de MetricsField</p></header>
<div class="wrap articulo">
<article class="prosa">
  <div class="resumen"><h2>En corto</h2><ul>${g.resumen.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
  ${g.secciones.map((s) => `<h2>${esc(s.h2)}</h2>\n${s.html}`).join("\n")}
  ${g.calc ? `<h2>Hacé la cuenta</h2>${CALCS[g.calc]}` : ""}
  <h2>Preguntas frecuentes</h2>
  ${faqHtml(g.faq)}
</article>
<aside class="lateral" aria-label="Relacionado">
  <div class="caja"><h2>${esc(g.producto.nombre)}</h2><p>${esc(g.producto.texto)}</p><a class="btn dark" href="${g.producto.href}">Conocer más</a></div>
  <div class="caja"><h2>Guías relacionadas</h2><ul>${g.relacionadas.map((s) => `<li><a href="/guias/${s}">${esc(porSlug[s].h1)}</a></li>`).join("")}</ul></div>
  <div class="caja"><h2>¿Dudas?</h2><p>Escribinos y te respondemos nosotros, no un bot.</p>${ext(wa(`Hola, leí la guía "${g.h1}" y tengo una consulta`), "Preguntar por WhatsApp")}</div>
</aside>
</div>`;
  return pagina({
    ruta,
    titulo: g.titulo,
    descripcion: g.descripcion,
    cuerpo,
    tipoOg: "article",
    ld: [
      m.ld,
      {
        "@type": "Article",
        headline: g.h1,
        description: g.descripcion,
        inLanguage: "es-AR",
        datePublished: ACTUALIZADO,
        dateModified: ACTUALIZADO,
        author: ORG,
        publisher: ORG,
        mainEntityOfPage: `${SITIO}${ruta}`,
        image: `${SITIO}/landing/assets/img/og-image.jpg`,
        about: g.tema,
      },
      faqLd(g.faq),
    ],
  });
}

// ---------------------------------------------------------------- salida

// Verificación barata: toda guía relacionada tiene que existir.
for (const g of GUIAS) for (const s of g.relacionadas) if (!porSlug[s]) throw new Error(`Guía relacionada inexistente: ${g.slug} → ${s}`);
for (const v of VERTICALES) for (const s of v.guias) if (!porSlug[s]) throw new Error(`Guía inexistente en ${v.ruta}: ${s}`);

const rutas = [
  escribir("/", home()),
  ...VERTICALES.map((v) => escribir(v.ruta, vertical(v))),
  escribir("/herramientas", herramientas()),
  escribir("/guias", indiceGuias()),
  ...GUIAS.map((g) => escribir(`/guias/${g.slug}`, guia(g))),
];

// Lista de rutas para el sitemap (app/sitemap.ts la importa).
writeFileSync(
  join(RAIZ, "..", "..", "lib", "landing-rutas.json"),
  JSON.stringify({ actualizado: ACTUALIZADO, rutas }, null, 2) + "\n",
);
console.log(`Listo: ${rutas.length} páginas en public/landing/.`);
