// Arma las versiones en píxeles de la marca a partir de los SVG que deja
// scripts/marca/generar.py: PNG para usar afuera (redes, documentos,
// Google Cloud Console), el ícono de Apple, el favicon.ico y la imagen que
// se ve al compartir un link de metricsfield.com.
//
//   node scripts/marca/rasterizar.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const brand = (f) => join(RAIZ, "public", "brand", f);
const svg = (f) => readFileSync(brand(f));

async function png(entrada, ancho) {
  return sharp(entrada, { density: 144 }).resize({ width: ancho }).png().toBuffer();
}

/** Isotipo centrado en un cuadrado de `lado`, ocupando `escala` del alto. */
async function cuadrado(entrada, lado, escala, fondo) {
  const alto = Math.round(lado * escala);
  const iso = await sharp(entrada, { density: 144 }).resize({ height: alto }).png().toBuffer();
  return sharp({ create: { width: lado, height: lado, channels: 4, background: fondo } })
    .composite([{ input: iso, gravity: "center" }])
    .png()
    .toBuffer();
}

// ICO con imágenes PNG adentro (lo aceptan todos los navegadores actuales).
function ico(pngs) {
  const cabecera = Buffer.alloc(6 + 16 * pngs.length);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2);
  cabecera.writeUInt16LE(pngs.length, 4);
  let offset = cabecera.length;
  pngs.forEach(({ lado, datos }, i) => {
    const e = 6 + 16 * i;
    cabecera.writeUInt8(lado >= 256 ? 0 : lado, e);
    cabecera.writeUInt8(lado >= 256 ? 0 : lado, e + 1);
    cabecera.writeUInt16LE(1, e + 4);
    cabecera.writeUInt16LE(32, e + 6);
    cabecera.writeUInt32LE(datos.length, e + 8);
    cabecera.writeUInt32LE(offset, e + 12);
    offset += datos.length;
  });
  return Buffer.concat([cabecera, ...pngs.map((p) => p.datos)]);
}

const transparente = { r: 0, g: 0, b: 0, alpha: 0 };
const blanco = { r: 255, g: 255, b: 255, alpha: 1 };
const negro = { r: 17, g: 17, b: 17, alpha: 1 };

const salidas = {
  "public/brand/isotipo-512.png": await png(svg("isotipo.svg"), 512),
  "public/brand/isotipo-blanco-512.png": await png(svg("isotipo-blanco.svg"), 512),
  "public/brand/logo-1200.png": await png(svg("logo.svg"), 1200),
  "public/brand/logo-blanco-1200.png": await png(svg("logo-blanco.svg"), 1200),
  "public/brand/logo-horizontal-1200.png": await png(svg("logo-horizontal.svg"), 1200),
  // Para Google Cloud Console (pantalla de consentimiento OAuth): 120×120.
  "public/brand/isotipo-120-fondo-blanco.png": await cuadrado(svg("isotipo.svg"), 120, 0.86, blanco),
  "app/apple-icon.png": await cuadrado(svg("isotipo.svg"), 180, 0.72, blanco),
  "public/landing/assets/img/favicon.png": await cuadrado(svg("isotipo.svg"), 64, 0.94, transparente),
};

// Miniatura genérica de WhatsApp para los links de los carteles.
salidas["public/og-resena.png"] = await png(svg("og-resena.svg"), 1200);

const lados = [16, 32, 48];
salidas["app/favicon.ico"] = ico(
  await Promise.all(lados.map(async (lado) => ({ lado, datos: await cuadrado(svg("isotipo.svg"), lado, 1, transparente) }))),
);

// Imagen al compartir (1200×630): logo blanco sobre el negro de marca.
const logoOg = await sharp(svg("logo-blanco.svg"), { density: 144 }).resize({ height: 430 }).png().toBuffer();
salidas["public/landing/assets/img/og-image.jpg"] = await sharp({ create: { width: 1200, height: 630, channels: 4, background: negro } })
  .composite([{ input: logoOg, gravity: "center" }])
  .jpeg({ quality: 88 })
  .toBuffer();

for (const [ruta, datos] of Object.entries(salidas)) writeFileSync(join(RAIZ, ruta), datos);
console.log(`Listo: ${Object.keys(salidas).length} archivos.`);
