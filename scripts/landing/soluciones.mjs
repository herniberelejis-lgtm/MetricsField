// Imágenes de las soluciones de la home (una por producto) y la del panel
// para la sección de Intel. Salen de lo que ya existe, sin fotos de stock:
//   - Sección de Intel: recorte de una captura real del panel (toques por día).
//   - Reviews, Retail, Loyalty e Intel (producto): la escena ilustrada de cada demo
//     (scripts/landing/demos.mjs), fotografiada desde las páginas generadas
//     con JavaScript apagado (así se ve el estado final, sin animación).
//
//   node scripts/landing/generar.mjs   # primero, para tener las páginas
//   PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs node scripts/landing/soluciones.mjs
//   node scripts/landing/generar.mjs   # de nuevo, para que las use
//
// Requiere un servidor estático de public/ en BASE (por defecto
// http://127.0.0.1:8765, p. ej. `cd public && python3 -m http.server 8765`).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IMG = join(RAIZ, "public", "landing", "assets", "img");
const DESTINO = join(IMG, "soluciones");
const BASE = process.env.BASE ?? "http://127.0.0.1:8765";
const ANCHOS = [560, 960];
mkdirSync(DESTINO, { recursive: true });

async function guardar(nombre, entrada) {
  for (const ancho of ANCHOS) {
    await sharp(entrada)
      .resize({ width: ancho, height: Math.round((ancho * 3) / 4), fit: "contain", background: "#f4f5f7" })
      .flatten({ background: "#f4f5f7" })
      .webp({ quality: 82 })
      .toFile(join(DESTINO, `${nombre}-${ancho}.webp`));
  }
  console.log(`${nombre}: ${ANCHOS.map((a) => `${nombre}-${a}.webp`).join(", ")}`);
}

// Recorte de la captura del panel (x, y, ancho, alto en px del original):
// la tarjeta "Toques por día", con margen gris alrededor.
await guardar(
  "panel",
  await sharp(join(IMG, "panel-taps.webp"))
    .extract({ left: 524, top: 104, width: 612, height: 520 })
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: "#f4f5f7" })
    .toBuffer(),
);

// Escenas de las demos, con fondo gris claro y margen.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 2.5, javaScriptEnabled: false });
const pagina = await ctx.newPage();
await pagina.route("**/*", (r) => {
  const u = new URL(r.request().url());
  if (u.origin === BASE && !u.pathname.startsWith("/landing") && /\.(svg|png|webp|woff2|js|css)$/.test(u.pathname)) {
    return r.continue({ url: `${BASE}/landing${u.pathname}` });
  }
  return r.continue();
});
for (const [nombre, ruta, escena] of [
  ["reviews", "reputacion", "rep-panel"],
  ["retail", "retail", "ret-cascada"],
  ["loyalty", "loyalty", "loy-alta"],
  ["intel", "herramientas", "int-cuenta"],
]) {
  await pagina.goto(`${BASE}/landing/${ruta}/index.html`, { waitUntil: "networkidle" });
  const el = pagina.locator(`.escena[data-escena="${escena}"]`).first();
  await el.evaluate((n) => {
    n.style.background = "#f4f5f7";
    n.style.padding = "36px 28px";
    n.style.borderRadius = "0";
  });
  await el.scrollIntoViewIfNeeded();
  await guardar(nombre, await el.screenshot());
}
await navegador.close();
writeFileSync(join(DESTINO, "LEEME.txt"), "Generadas por scripts/landing/soluciones.mjs. No editar a mano.\n");
