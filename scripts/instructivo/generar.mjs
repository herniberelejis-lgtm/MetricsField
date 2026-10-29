// Guía de dos páginas para quien compra piezas por Mercado Libre: la pieza
// tiene dos cosas que se configuran por separado.
//   Página 1 — el QR: se activa en nuestra página (capturas reales de la app).
//   Página 2 — el chip NFC: viene vacío y se graba con la app gratis NFC
//   Tools (cuadros del video del equipo, public/tap/videos/activar-nfc.mp4).
// Sale en PDF (para mandar por la mensajería de la venta, que acepta
// adjuntos) y en PNG (para imprimir y meter en la caja). Sin links,
// teléfonos ni redes: Mercado Libre no deja pasar datos de contacto, y no
// hacen falta — el QR de la pieza ya lleva a la página de activación.
//
//   node scripts/instructivo/generar.mjs
//
// Las imágenes están en scripts/instructivo/capturas/ (las del QR salen de
// grabar la activación con datos de prueba; el link de la captura del chip
// está tapado a propósito). Usa Playwright (Chromium). Si no está en
// node_modules, pasá la ruta con PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const pub = (p) => pathToFileURL(join(RAIZ, "public", p)).href;
const cap = (p) => pathToFileURL(join(AQUI, "capturas", p)).href;
const SALIDA = join(RAIZ, "public", "instructivo");

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const logo = readFileSync(join(RAIZ, "public", "brand", "logo-horizontal.svg"), "utf8");
const fuente = (peso) =>
  `@font-face { font-family: "Montserrat"; font-weight: ${peso}; src: url("${pub(`landing/assets/fonts/montserrat-${peso}-latin.woff2`)}") format("woff2"); }`;

// Paso con captura del celular (página 1: QR).
const pasoQr = (n, titulo, texto, img) => `
  <div class="pq">
    <div class="pantalla"><img src="${cap(img)}" alt=""></div>
    <div class="cab"><span class="num">${n}</span><h3>${titulo}</h3></div>
    <p>${texto}</p>
  </div>`;

// Paso con cuadro del video (página 2: NFC).
const pasoNfc = (n, titulo, texto, img) => `
  <div class="pn">
    <img src="${cap(img)}" alt="">
    <div><div class="cab"><span class="num">${n}</span><h3>${titulo}</h3></div><p>${texto}</p></div>
  </div>`;

const pieza = (foto, nombre, donde) => `
  <div class="pieza"><img src="${pub(foto)}" alt=""><div><b>${nombre}</b><span>${donde}</span></div></div>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  ${[400, 500, 600, 700, 800].map(fuente).join("\n  ")}
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Montserrat", -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1c2530; }
  .hoja { width: 210mm; height: 297mm; padding: 12mm 13mm 10mm; overflow: hidden; break-after: page; display: flex; flex-direction: column; }
  .hoja:last-child { break-after: auto; }
  .arriba { display: flex; align-items: center; justify-content: space-between; }
  .logo svg { height: 30px; width: auto; }
  .pagina { font-size: 11px; font-weight: 700; color: #5f6b7a; letter-spacing: .08em; }
  h1 { font-size: 27px; margin: 12px 0 4px; letter-spacing: -.02em; font-weight: 800; }
  .sub { font-size: 13.5px; color: #5f6b7a; margin: 0; line-height: 1.45; }
  .partes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 16px; }
  .parte { border-radius: 12px; padding: 9px 12px; font-size: 12.5px; line-height: 1.35; }
  .parte b { display: block; font-size: 14px; }
  .p1 { background: #eef4ff; }
  .p2 { background: #fff3e0; }
  .etq { display: inline-block; font-size: 10.5px; font-weight: 800; letter-spacing: .1em; border-radius: 999px; padding: 4px 10px; color: #fff; }
  .etq.azul { background: #2563eb; }
  .etq.naranja { background: #ea8a00; }
  h2 { font-size: 21px; margin: 6px 0 2px; font-weight: 800; letter-spacing: -.01em; }
  .h2sub { font-size: 12.5px; color: #5f6b7a; margin: 0 0 10px; }
  .num { flex: none; width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
  .cab { display: flex; align-items: center; gap: 7px; }
  h3 { margin: 0; font-size: 14px; font-weight: 700; line-height: 1.2; }
  .pqs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .pq p, .pn p { margin: 5px 0 0; font-size: 11.5px; color: #3d4652; line-height: 1.4; }
  .pantalla { border: 5px solid #1c2530; border-radius: 18px; overflow: hidden; height: 236px; margin-bottom: 8px; background: #f8f9fa; }
  .pantalla img { width: 100%; display: block; }
  .mas { background: #eef4ff; border-radius: 12px; padding: 10px 14px; font-size: 12.5px; margin: 12px 0 14px; line-height: 1.4; }
  h4 { font-size: 15px; margin: 0 0 8px; font-weight: 700; }
  .piezas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pieza { border: 1.5px solid #e4e6ea; border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; }
  .pieza img { width: 100%; height: 92px; object-fit: cover; border-radius: 9px; }
  .pieza b { display: block; font-size: 13px; }
  .pieza span { color: #3d4652; line-height: 1.35; }
  .regla { background: #fff8e6; color: #7a5200; border-radius: 12px; padding: 9px 12px; font-size: 11.5px; margin-top: auto; line-height: 1.4; }
  .p2 .num, .naranja-num .num { background: #ea8a00; }
  .copiar { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; align-items: center; border: 1.5px solid #e4e6ea; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; }
  .copiar img { width: 100%; border-radius: 10px; display: block; }
  .copiar p { margin: 5px 0 0; font-size: 11.5px; color: #3d4652; line-height: 1.45; }
  .alt { margin-top: 7px !important; font-size: 10.5px !important; color: #5f6b7a !important; }
  .pns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pn { border: 1.5px solid #e4e6ea; border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 7px; }
  .pn img { width: 100%; height: 178px; object-fit: cover; object-position: top; border-radius: 10px; display: block; background: #eef1f6; }
  .tips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; font-size: 11px; color: #3d4652; }
  .tip { background: #f4f6f9; border-radius: 12px; padding: 9px 11px; line-height: 1.4; }
  .tip b { color: #1c2530; display: block; font-size: 12px; margin-bottom: 2px; }
  .video { margin-top: 10px; font-size: 11.5px; color: #3d4652; text-align: center; }
</style></head><body>

<div class="hoja">
  <div class="arriba"><div class="logo">${logo}</div><div class="pagina">GUÍA · 1 DE 2</div></div>
  <h1>Tu pieza, lista en 2 partes</h1>
  <p class="sub">Se hace una sola vez. Después, cada cliente que la toque o la escanee va directo a dejarte una reseña en Google.</p>
  <div class="partes">
    <div class="parte p1"><b>Parte 1 · El QR</b>Se activa desde el celular, en 1 minuto. Esta página.</div>
    <div class="parte p2"><b>Parte 2 · El chip NFC</b>Viene vacío: se graba con una app gratis, en 2 minutos. Página 2.</div>
  </div>

  <div><span class="etq azul">PARTE 1</span></div>
  <h2>Activá el QR</h2>
  <p class="h2sub">Con el celular que vas a usar para el negocio. Si en algún paso dudás, en la página hay un video de 35 segundos.</p>
  <div class="pqs">
    ${pasoQr(1, "Escaneá el QR", "Abrí la cámara del celular y apuntá al QR de la pieza. Tocá el aviso que aparece: se abre la página para activarla.", "qr-1-escanear.jpg")}
    ${pasoQr(2, "Buscá tu negocio", "Escribí el nombre (si hace falta, con el barrio o la ciudad), tocá <b>Buscar</b> y elegí el tuyo de la lista.", "qr-2-buscar.jpg")}
    ${pasoQr(3, "Elegí un PIN", "Cuatro números que puedas recordar: sirven para cambiar algo más adelante. Si querés, pedí el aviso semanal gratis.", "qr-3-pin.jpg")}
    ${pasoQr(4, "Tocá Activar", "Tocá <b>Activar mi pieza</b>. ¡Listo! Escaneá el QR de nuevo: se abre la reseña de tu negocio.", "qr-4-listo.jpg")}
  </div>

  <div class="mas"><b>¿Más de una?</b> Escaneá la siguiente con el mismo celular y tocá <b>“Sí, usar los mismos datos”</b>. <b>¿La querés cambiar o se la das a otro negocio?</b> Escaneala con ese mismo celular. <b>No cierres todavía la página</b>: más abajo está el link del chip (parte 2).</div>

  <h4>Cómo usar cada pieza</h4>
  <div class="piezas">
    ${pieza("landing/assets/img/productos/standee-480.webp", "Standee de mostrador", "En la caja, a la vista. Al cobrar: “¿Nos dejás una reseña? Acercá el celu acá”.")}
    ${pieza("landing/assets/img/productos/tarjeta-480.webp", "Tarjeta PVC", "En el bolsillo del mozo o de quien atiende. Se la acerca al cliente al cerrar la cuenta.")}
    ${pieza("landing/assets/img/productos/sticker-480.webp", "Sticker NFC", "En la mesa, el mostrador o la puerta. El cliente lo toca mientras espera.")}
  </div>
  <div class="regla">Pedile la reseña a todos tus clientes por igual y sin ofrecer nada a cambio: es lo que pide Google para que tus reseñas cuenten.</div>
</div>

<div class="hoja naranja-num">
  <div class="arriba"><div class="logo">${logo}</div><div class="pagina">GUÍA · 2 DE 2</div></div>
  <div style="margin-top:14px"><span class="etq naranja">PARTE 2</span></div>
  <h2>Grabá el chip NFC</h2>
  <p class="h2sub">El chip viene vacío. Se graba una sola vez con la app gratis <b>NFC Tools</b> (iPhone y Android). En la página de activación está el video de 50 segundos.</p>

  <div class="copiar">
    <div>
      <div class="cab"><span class="num">1</span><h3>Copiá el link de tu pieza</h3></div>
      <p>En la página donde activaste el QR, más abajo, tocá <b>Copiar</b>. Así el QR y el chip llevan al mismo lugar, te contamos cuántas personas la usan y, si algún día cambiás algo, no hay que volver a grabarla.</p>
      <p class="alt">¿Cerraste la página? En la pantalla de “¡Listo!” te mostramos el link para editar tu pieza (sacale una captura): ahí está de nuevo el botón Copiar. También podés grabar directo el link de reseñas de Google (lo copiás desde tu perfil de negocio → Pedir reseñas); funciona igual, pero esos toques no se cuentan en el aviso semanal.</p>
    </div>
    <img src="${cap("nfc-1-copiar.jpg")}" alt="">
  </div>

  <div class="pns">
    ${pasoNfc(2, "Descargá NFC Tools", "Es gratis. Buscala en el Play Store o en el App Store.", "nfc-2-app.jpg")}
    ${pasoNfc(3, "Tocá Escribir", "En la pantalla principal de la app.", "nfc-3-escribir.jpg")}
    ${pasoNfc(4, "Añadir registro → URL / URI", "Agregás un registro de tipo link.", "nfc-4-url.jpg")}
    ${pasoNfc(5, "Pegá el link y tocá ✓", "El que copiaste en el paso 1.", "nfc-5-pegar.jpg")}
    ${pasoNfc(6, "Tocá Escribir y apoyá", "Apoyá el celular en la pieza y esperá el aviso de “listo”.", "nfc-6-apoyar.jpg")}
    ${pasoNfc("✓", "Probalo", "Acercá el celular a la pieza: se abre la página de reseñas de tu negocio.", "nfc-7-probar.jpg")}
  </div>

  <div class="tips">
    <div class="tip"><b>iPhone</b>Del XS en adelante lee la pieza sin apps, con la pantalla desbloqueada. Apoyá la parte de arriba del celular.</div>
    <div class="tip"><b>Android</b>Activá el NFC (Ajustes → Conexiones → NFC) y apoyá el centro de la espalda del celular.</div>
    <div class="tip"><b>No la pegues sobre metal</b>Interfiere con la señal. Si el celular no tiene NFC, el QR anda igual.</div>
  </div>
  <div class="regla" style="margin-top:12px">¿El chip no graba? El QR funciona igual mientras tanto. Y si te equivocaste de negocio, cambialo con tu PIN desde el link para editar que te mostramos al activar.</div>
</div>

</body></html>`;

mkdirSync(SALIDA, { recursive: true });
const archivoHtml = join(tmpdir(), "instructivo-metricsfield.html");
writeFileSync(archivoHtml, html);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(archivoHtml).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: join(SALIDA, "instructivo-metricsfield.pdf"), format: "A4", printBackground: true });
await page.screenshot({ path: join(SALIDA, "instructivo-metricsfield.png"), fullPage: true });
await browser.close();
rmSync(archivoHtml, { force: true });
console.log("Listo: public/instructivo/instructivo-metricsfield.pdf y .png");
