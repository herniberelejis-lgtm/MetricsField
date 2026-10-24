// Instructivo de una página para quien compra piezas por Mercado Libre:
// cómo activarlas y cómo usar cada una. Sale en PDF (para mandar por la
// mensajería de la venta, que acepta adjuntos) y en PNG (para imprimir y
// meter en la caja). Sin links, teléfonos ni redes: Mercado Libre no deja
// pasar datos de contacto, y no hacen falta — la pieza misma es el link.
//
//   node scripts/instructivo/generar.mjs
//
// Usa Playwright (Chromium). Si no está en node_modules, pasá la ruta con
// PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pub = (p) => pathToFileURL(join(RAIZ, "public", p)).href;
const SALIDA = join(RAIZ, "public", "instructivo");

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const logo = readFileSync(join(RAIZ, "public", "brand", "logo-horizontal.svg"), "utf8");

const paso = (n, titulo, texto, mock) => `
  <div class="paso">
    <div class="num">${n}</div>
    <div class="txt"><h3>${titulo}</h3><p>${texto}</p></div>
    <div class="mock">${mock}</div>
  </div>`;

const pieza = (foto, nombre, donde) => `
  <div class="pieza"><img src="${pub(foto)}" alt=""><b>${nombre}</b><span>${donde}</span></div>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Montserrat", -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1c2530; }
  .hoja { width: 210mm; min-height: 297mm; padding: 14mm 14mm 10mm; }
  .logo svg { height: 34px; width: auto; }
  h1 { font-size: 30px; margin: 14px 0 4px; letter-spacing: -.02em; }
  .sub { font-size: 15px; color: #5f6b7a; margin: 0 0 18px; }
  .paso { display: grid; grid-template-columns: 46px 1fr 190px; gap: 14px; align-items: center; border: 1.5px solid #e4e6ea; border-radius: 18px; padding: 14px 16px; margin-bottom: 12px; }
  .num { width: 46px; height: 46px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 24px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .txt h3 { margin: 0 0 4px; font-size: 19px; }
  .txt p { margin: 0; font-size: 14px; color: #3d4652; line-height: 1.4; }
  .mock { background: #f4f6f9; border-radius: 14px; padding: 10px; font-size: 12px; }
  .tel { background: #fff; border-radius: 10px; padding: 9px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .campo { border: 1px solid #dfe3e8; border-radius: 8px; padding: 6px 8px; color: #80868b; margin-top: 5px; }
  .ok { border: 2px solid #1e8e3e; background: #f3faf5; border-radius: 8px; padding: 6px 8px; margin-top: 5px; color: #1c2530; font-weight: 600; }
  .btn { background: #2563eb; color: #fff; border-radius: 999px; text-align: center; padding: 7px; margin-top: 6px; font-weight: 700; }
  .pin { letter-spacing: .3em; text-align: center; font-size: 16px; color: #1c2530; font-weight: 700; }
  .onda { font-size: 34px; text-align: center; }
  .mas { background: #eef4ff; border-radius: 14px; padding: 12px 16px; font-size: 14px; margin: 4px 0 16px; }
  h2 { font-size: 20px; margin: 6px 0 10px; }
  .piezas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .pieza { border: 1.5px solid #e4e6ea; border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .pieza img { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; }
  .pieza b { font-size: 15px; margin-top: 4px; }
  .pieza span { color: #3d4652; line-height: 1.35; }
  .tips { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; font-size: 12.5px; color: #3d4652; }
  .tip { background: #f8f9fa; border-radius: 12px; padding: 10px 12px; line-height: 1.4; }
  .tip b { color: #1c2530; }
  .regla { background: #fff8e6; color: #7a5200; border-radius: 12px; padding: 10px 12px; font-size: 12.5px; margin-top: 12px; }
</style></head><body><div class="hoja">
  <div class="logo">${logo}</div>
  <h1>Tu pieza, lista en 3 pasos</h1>
  <p class="sub">Se hace una sola vez. Después, cada cliente que la toque va directo a dejarte una reseña en Google.</p>

  ${paso(1, "Acercá tu celular a la pieza", "Desbloqueado, con la parte de arriba del celu sobre la pieza. ¿No pasa nada? Escaneá el QR con la cámara.", `<div class="onda">📱 〰️</div><div class="tel"><b>Activá tu pieza en 3 pasos</b></div>`)}
  ${paso(2, "Buscá tu negocio y tocalo", "Escribí el nombre (si hace falta, con el barrio o la ciudad), tocá <b>Buscar</b> y elegí tu negocio de la lista.", `<div class="tel">Buscá tu negocio<div class="campo">Barbería Güemes…</div><div class="ok">✓ Barbería Güemes</div></div>`)}
  ${paso(3, "Elegí un PIN y activá", "Cuatro números que puedas recordar (sirven para cambiar algo más adelante). Tocá <b>Activar mi pieza</b>. ¡Listo!", `<div class="tel">Elegí un PIN<div class="campo pin">2580</div><div class="btn">Activar mi pieza</div></div>`)}

  <div class="mas"><b>¿Compraste más de una?</b> Acercá el mismo celular a la siguiente y tocá <b>“Sí, usar los mismos datos”</b>. Queda activada en un toque.</div>

  <h2>Cómo usar cada pieza</h2>
  <div class="piezas">
    ${pieza("landing/assets/img/productos/standee-480.webp", "Standee de mostrador", "En la caja, a la vista. Al cobrar: “¿Nos dejás una reseña? Acercá el celu acá”.")}
    ${pieza("landing/assets/img/productos/tarjeta-480.webp", "Tarjeta PVC", "En el bolsillo del mozo o de quien atiende. Se la acerca al cliente al cerrar la cuenta.")}
    ${pieza("landing/assets/img/productos/sticker-480.webp", "Sticker NFC", "En la mesa, el mostrador o la puerta. El cliente lo toca mientras espera.")}
  </div>

  <div class="tips">
    <div class="tip"><b>iPhone:</b> del XS en adelante lee la pieza sin apps, con la pantalla desbloqueada. En modelos más viejos, usá el QR.</div>
    <div class="tip"><b>Android:</b> tiene que estar prendido el NFC (Ajustes → Conexiones → NFC). Si el celu no tiene NFC, usá el QR.</div>
  </div>
  <div class="regla">Pedile la reseña a todos tus clientes por igual y sin ofrecer nada a cambio: es lo que pide Google para que tus reseñas cuenten.</div>
</div></body></html>`;

mkdirSync(SALIDA, { recursive: true });
const archivoHtml = join(tmpdir(), "instructivo-metricsfield.html");
writeFileSync(archivoHtml, html);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(archivoHtml).href, { waitUntil: "networkidle" });
await page.pdf({ path: join(SALIDA, "instructivo-metricsfield.pdf"), format: "A4", printBackground: true });
await page.screenshot({ path: join(SALIDA, "instructivo-metricsfield.png"), fullPage: true });
await browser.close();
rmSync(archivoHtml, { force: true });
console.log("Listo: public/instructivo/instructivo-metricsfield.pdf y .png");
