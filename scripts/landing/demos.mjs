// Demostraciones de cada servicio: una historia en cuatro pasos (el
// problema, cómo funciona y qué gana el comercio) con una escena animada por
// paso. En escritorio las escenas quedan fijas a la derecha mientras el texto
// avanza ("sticky scroll reveal"); en el celular y sin JavaScript cada escena
// se ve debajo de su texto. Las animaciones están en assets/demos.js (GSAP).
//
// Todos los números son de ejemplo y la página lo dice: ningún dato de acá
// es de un cliente real.

const estrellas = (n, total = 5) => Array.from({ length: total }, (_, i) => `<i class="${i < n ? "llena" : ""}">★</i>`).join("");

function ventana(titulo, cuerpo) {
  return `<div class="ventana"><div class="ventana-barra"><i></i><i></i><i></i><span>${titulo}</span></div><div class="ventana-cuerpo">${cuerpo}</div></div>`;
}

const kpi = (etiqueta, valor, n, dec = 0, sufijo = "") =>
  `<div class="d-kpi"><small>${etiqueta}</small><b data-contar-a="${n}" data-dec="${dec}" data-suf="${sufijo}">${valor}</b></div>`;

const ESCENAS = {
  // ---------------------------------------------------------------- reputación
  "rep-problema": `<div class="fichas">
  <div class="ficha"><span class="ficha-nombre">Tu local</span><div class="ficha-nota"><b>3,9</b><span class="d-est">${estrellas(4)}</span></div><span class="ficha-meta">12 reseñas · la última, hace 8 meses</span></div>
  <div class="ficha ficha-otra"><span class="ficha-nombre">El local de enfrente</span><div class="ficha-nota"><b>4,6</b><span class="d-est">${estrellas(5)}</span></div><span class="ficha-meta"><span data-contar-a="310">310</span> reseñas · la última, hace 2 días</span></div>
  <span class="globo">¿A cuál entrarías vos?</span>
</div>`,
  "rep-toque": `<div class="mostrador">
  <div class="standee-mini"><b>CONTANOS<br>CÓMO TE FUE</b><span class="nfc-mini"><span class="onda"></span><span class="onda"></span></span><small>Acercá tu celular</small></div>
  <div class="tel"><div class="tel-pantalla"><div class="pant-google"><span class="g-local">Café Ejemplo</span><span class="g-titulo">¿Cómo fue tu experiencia?</span><div class="g-estrellas">${estrellas(5)}</div><span class="g-texto"></span><span class="g-btn">Publicar</span></div></div></div>
</div>`,
  "rep-panel": ventana(
    "Tu panel · Reviews",
    `<div class="d-kpis">${kpi("Toques al cartel", "148", 148)}${kpi("Reseñas nuevas", "62", 62)}${kpi("Calificación", "4,6", 4.6, 1)}</div>
<div class="resena-nueva"><div class="r-cab"><b>Laura M.</b><span class="d-est">${estrellas(5)}</span><small>hace 5 minutos</small></div><p>Excelente atención y el café, buenísimo. Volvemos seguro.</p>
<div class="r-sugerida"><small>Respuesta sugerida</small><p class="tipeo">¡Gracias, Laura! Nos alegra que te haya gustado. Te esperamos pronto.</p></div></div>`,
  ),
  "rep-gana": `<div class="antes-despues">
  <div class="ad"><small>Calificación</small><div><span class="ad-antes">3,9</span><span class="ad-flecha">→</span><b data-contar-a="4.6" data-dec="1" data-desde="3.9">4,6</b></div></div>
  <div class="ad"><small>Reseñas</small><div><span class="ad-antes">12</span><span class="ad-flecha">→</span><b data-contar-a="140" data-desde="12">140</b></div></div>
</div>
<div class="linea-caja"><small>Personas que vieron tu ficha en Google, por mes</small>
<svg viewBox="0 0 320 110" class="linea" preserveAspectRatio="none"><path class="linea-area" d="M0 96 L53 90 L107 84 L160 70 L213 52 L267 40 L320 22 L320 110 L0 110Z"/><path class="linea-trazo" d="M0 96 L53 90 L107 84 L160 70 L213 52 L267 40 L320 22"/></svg>
<div class="linea-ejes"><span>Mes 1</span><span>Mes 6</span></div></div>`,

  // ---------------------------------------------------------------- retail
  "ret-problema": `<div class="aviso-venta"><span class="av-icono">$</span><div><small>Nueva venta</small><b>Auriculares inalámbricos</b><span>1 unidad · <strong>$45.000</strong></span></div></div>
<div class="pregunta-grande"><span>¿Cuánto te quedó?</span><b class="signo">?</b></div>`,
  "ret-cascada": `<div class="cascada-grande">${[
    ["Precio de venta", "$45.000", 0, 100, "dato"],
    ["Comisión", "−$6.300", 86, 14, "menos"],
    ["Envío", "−$3.800", 77.6, 8.4, "menos"],
    ["Publicidad", "−$1.500", 74.3, 3.3, "menos"],
    ["Impuestos", "−$1.800", 70.3, 4, "menos"],
    ["Costo del producto", "−$21.000", 23.6, 46.7, "menos"],
    ["Ganancia real", "$10.600", 0, 23.6, "mas"],
  ]
    .map(
      ([t, v, x, w, c]) =>
        `<div class="cg-fila ${c}"><span class="cg-t">${t}</span><span class="cg-pista"><i style="left:${x}%;width:${w}%"></i></span><b class="cg-v">${v}</b></div>`,
    )
    .join("")}</div>`,
  "ret-productos": ventana(
    "Retail · Productos",
    `<table class="d-tabla"><thead><tr><th>Producto</th><th>Margen real</th><th></th></tr></thead><tbody>
<tr><td>Funda de silicona</td><td>31%</td><td><span class="barrita" style="--w:31%"></span></td></tr>
<tr><td>Auriculares inalámbricos</td><td>23,6%</td><td><span class="barrita" style="--w:23.6%"></span></td></tr>
<tr><td>Cargador rápido</td><td>12%</td><td><span class="barrita" style="--w:12%"></span></td></tr>
<tr class="pierde"><td>Soporte para celular <span class="pill-mal">Vende a pérdida</span></td><td>−4%</td><td><span class="barrita mal" style="--w:4%"></span></td></tr>
</tbody></table>`,
  ),
  "ret-gana": `<div class="barras-mes"><small>Ganancia real por mes</small>
<div class="bm">${[38, 41, 40, 52, 61, 68].map((h, i) => `<div class="bm-col${i >= 3 ? " despues" : ""}"><i style="height:${h}%"></i><span>Mes ${i + 1}</span></div>`).join("")}
<span class="bm-marca">Subiste el precio del soporte y pausaste su publicidad</span></div></div>`,

  // ---------------------------------------------------------------- loyalty
  "loy-problema": `<div class="gente">${Array.from({ length: 10 }, (_, i) => `<span class="persona${[1, 4, 8].includes(i) ? " vuelve" : ""}"></span>`).join("")}</div>
<div class="pregunta-grande"><span>¿Quiénes volvieron?</span><b class="signo">?</b></div>`,
  "loy-alta": `<div class="tel tel-centro"><div class="tel-pantalla">
  <div class="pant-club"><span class="g-local">Club Café Ejemplo</span><span class="g-titulo">Cada 10 cafés, uno gratis</span>
    <label class="consent"><span class="check"></span>Acepto que guarden mis visitas para el club</label>
    <span class="g-btn wallet">Agregar a Google Wallet</span></div>
  <div class="pase"><span class="pase-cab">Club Café Ejemplo</span><b>3 de 10 sellos</b><div class="pase-sellos">${Array.from({ length: 10 }, (_, i) => `<i class="${i < 3 ? "lleno" : ""}"></i>`).join("")}</div></div>
</div></div>`,
  "loy-canje": `<div class="tel tel-centro"><div class="tel-pantalla">
  <div class="pase pase-full"><span class="pase-cab">Club Café Ejemplo</span><b>10 de 10 sellos</b><div class="pase-sellos">${Array.from({ length: 10 }, () => `<i class="lleno"></i>`).join("")}</div>
  <div class="qr" aria-hidden="true">${Array.from({ length: 49 }, (_, i) => `<i class="${[0, 1, 2, 4, 6, 7, 9, 13, 14, 16, 18, 20, 21, 24, 25, 27, 28, 31, 33, 35, 37, 38, 41, 42, 44, 46, 48].includes(i) ? "n" : ""}"></i>`).join("")}</div>
  <span class="qr-txt">Mostralo en el mostrador · sirve una sola vez</span><span class="canjeado">Canjeado ✓</span></div>
</div></div>`,
  "loy-gana": ventana(
    "Tu panel · Loyalty",
    `<div class="d-kpis">${kpi("Clientes en el club", "286", 286)}${kpi("Vuelven en 60 días", "41%", 41, 0, "%")}${kpi("Visitas por cliente", "3,2", 3.2, 1)}</div>
<small class="d-sub">Clientes del club que volvieron, por semana</small><div class="bm bm-chica">${[22, 30, 34, 41, 47, 55, 61, 66].map((h) => `<div class="bm-col"><i style="height:${h}%"></i></div>`).join("")}</div>`,
  ),

  // ---------------------------------------------------------------- intel
  "int-pregunta": `<div class="chat">
  <span class="burbuja">¿Cuántas reseñas me faltan para llegar a 4,7?</span>
  <span class="burbuja">¿Esta venta me deja plata o solo factura?</span>
  <span class="burbuja">¿Me conviene armar un club de beneficios?</span>
</div>`,
  "int-cuenta": `<div class="mini-calc"><span class="mc-t">¿Cuántas reseñas de 5★ te faltan?</span>
  <div class="mc-campos"><label>Calificación de hoy<span class="mc-in" data-tipear="4,3">4,3</span></label><label>Reseñas totales<span class="mc-in" data-tipear="120">120</span></label><label>Querés ver<span class="mc-in" data-tipear="4,7 ★">4,7 ★</span></label></div>
  <div class="mc-res"><b data-contar-a="120">120</b><span>reseñas de 5★ seguidas</span></div></div>`,
  "int-decision": `<div class="plan"><span class="plan-t">Tu plan para este mes</span>
  <div class="plan-item"><span class="check"></span>120 reseñas en 30 días: 4 por día</div>
  <div class="plan-item"><span class="check"></span>Que todo el equipo la pida al cobrar</div>
  <div class="plan-item"><span class="check"></span>Mirar cada lunes cuántas llegaron</div>
  <div class="plan-item"><span class="check"></span>Responder todas, también las malas</div></div>`,
};

/** Cada demo: título, bajada y cuatro pasos [etiqueta, tono, título, texto, escena]. */
export const DEMOS = {
  reputacion: {
    titulo: "Del cliente contento a la reseña en Google, en un toque.",
    bajada: "Bajá despacio: cada paso muestra qué pasa en el local, en el celular del cliente y en tu panel.",
    pasos: [
      ["El problema", "mejorar", "Los clientes contentos se van sin dejar reseña", "Quien busca dónde comer o comprar elige por las reseñas. Si las tuyas son pocas y viejas, perdés contra el local de enfrente aunque atiendas mejor.", "rep-problema"],
      ["Cómo funciona", "dato", "Un toque al cartel y se abre tu reseña", "Al cobrar, el cliente acerca el celular al cartel (o escanea el QR) y se abre la ventana para calificar tu local en Google. Sin app, sin buscar el nombre y el mismo camino para todos.", "rep-toque"],
      ["Cómo funciona", "dato", "Tu panel junta todo lo que pasa", "Ves cuántas veces se usó cada cartel, qué reseñas llegaron y una respuesta sugerida para cada una, así contestar todas lleva minutos.", "rep-panel"],
      ["Qué ganás", "bien", "Más reseñas recientes, más gente que te encuentra", "Las reseñas cuentan para que Google te muestre cuando te buscan cerca. Con el pedido como hábito, la calificación sube y más personas ven tu ficha.", "rep-gana"],
    ],
  },
  retail: {
    titulo: "De “vendí” a “gané”, venta por venta.",
    bajada: "Así es como Retail convierte cada venta de Mercado Libre en la plata que de verdad te queda.",
    pasos: [
      ["El problema", "mejorar", "Ves lo que facturás, no lo que te queda", "Mercado Libre te avisa que vendiste $45.000. Entre comisión, envío, publicidad, impuestos y lo que te costó el producto, nadie te dice cuánto ganaste.", "ret-problema"],
      ["Cómo funciona", "dato", "Cada venta, desarmada", "Retail se conecta a tu cuenta y descuenta todo lo que se va en cada operación. Lo que queda al final es tu ganancia real, no una estimación.", "ret-cascada"],
      ["Cómo funciona", "dato", "Producto por producto", "Ordena tus productos por margen real y marca los que venden a pérdida: los que más se mueven no siempre son los que más te dejan.", "ret-productos"],
      ["Qué ganás", "bien", "Decisiones con el número de verdad", "Subís el precio de lo que perdía, pausás la publicidad que no rinde y ves el efecto en tu ganancia del mes siguiente.", "ret-gana"],
    ],
  },
  loyalty: {
    titulo: "De cliente de una vez a cliente que vuelve.",
    bajada: "Así funciona el club de beneficios con la tarjeta en Google Wallet, del primer toque al canje.",
    pasos: [
      ["El problema", "mejorar", "La mayoría no vuelve, y no sabés quiénes son", "Todos los días entran clientes nuevos, pero sin una forma de reconocerlos no sabés quién volvió, cada cuánto ni qué los trae de nuevo.", "loy-problema"],
      ["Cómo funciona", "dato", "Se suman con un toque y guardan la tarjeta", "El cliente toca el cartel, acepta sumarse al club y guarda la tarjeta en Google Wallet. No hay app que instalar y no se pierde como la de cartón.", "loy-alta"],
      ["Cómo funciona", "dato", "Junta sellos y canjea en el mostrador", "Cada visita suma un sello. Cuando llega al beneficio, muestra un QR que sirve una sola vez: no se puede canjear dos veces con una captura.", "loy-canje"],
      ["Qué ganás", "bien", "Sabés quién vuelve y qué funciona", "Ves cuántos clientes tiene el club, cuántos vuelven y cada cuánto, y podés probar qué beneficio trae más visitas.", "loy-gana"],
    ],
  },
  intel: {
    titulo: "De la duda a un plan concreto.",
    bajada: "Intel arranca por las preguntas que todo comercio se hace y las convierte en números y en próximos pasos.",
    pasos: [
      ["El problema", "mejorar", "Decidir a ojo", "¿Cuántas reseñas necesito? ¿Esta venta me deja plata? ¿Me conviene un club? Sin números, cada respuesta es una intuición.", "int-pregunta"],
      ["Cómo funciona", "dato", "Hacés la cuenta en segundos", "Cargás tus números en la calculadora y la cuenta aparece sola, con la fórmula a la vista para que sepas de dónde sale.", "int-cuenta"],
      ["Qué ganás", "bien", "Un plan que se puede seguir", "El resultado se traduce en algo concreto para esta semana, y cada calculadora tiene su guía para profundizar.", "int-decision"],
    ],
  },
};

export function demoHtml(id, encabezado) {
  const d = DEMOS[id];
  return `<section class="demo-seccion" id="como-funciona"><div class="wrap">${encabezado("Así funciona", d.titulo, d.bajada)}
<div class="historia" data-historia>
  <div class="historia-pasos">${d.pasos
    .map(
      ([etq, tono, h3, p, escena], i) => `<article class="paso" data-paso="${i}">
    <span class="paso-etq ${tono}">${etq}</span><h3>${h3}</h3><p>${p}</p>
    <div class="escena" data-escena="${escena}" aria-hidden="true">${ESCENAS[escena]}</div>
  </article>`,
    )
    .join("")}</div>
  <div class="historia-escenario" aria-hidden="true"><div class="escenario-in"><div class="escenario-avance"><i></i></div></div></div>
</div>
<p class="nota-demo">Datos de ejemplo para mostrar cómo funciona. No son resultados de un cliente.</p>
</div></section>`;
}
