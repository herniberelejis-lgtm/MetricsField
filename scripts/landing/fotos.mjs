// Fotos de los productos para el sitio público. Las originales van en
// fotos/productos/ (fuera de public/, así no se sirven pesadas), con el
// nombre de la pieza que muestran:
//
//   standee.jpg   tarjeta.jpg   sticker.jpg   local.jpg (el cartel en uso)
//
// (vale .jpg, .jpeg, .png o .webp). Este script las recorta a 4:3, las pasa a
// WebP en dos tamaños y anota sus medidas en productos/fotos.json; después
// generar.mjs las usa en lugar de los dibujos.
//
//   node scripts/landing/fotos.mjs && node scripts/landing/generar.mjs

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORIGEN = join(RAIZ, "fotos", "productos");
const DESTINO = join(RAIZ, "public", "landing", "assets", "img", "productos");
export const NOMBRES = ["standee", "tarjeta", "sticker", "local"];
const ANCHOS = [480, 960];

mkdirSync(DESTINO, { recursive: true });
const archivos = existsSync(ORIGEN) ? readdirSync(ORIGEN) : [];
const manifiesto = {};

for (const nombre of NOMBRES) {
  const archivo = archivos.find((a) => parse(a).name.toLowerCase() === nombre && /^\.(jpe?g|png|webp)$/i.test(extname(a)));
  if (!archivo) continue;
  for (const ancho of ANCHOS) {
    await sharp(join(ORIGEN, archivo))
      .rotate() // respeta la orientación de la foto del celular
      .resize({ width: ancho, height: Math.round((ancho * 3) / 4), fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toFile(join(DESTINO, `${nombre}-${ancho}.webp`));
  }
  manifiesto[nombre] = { ancho: ANCHOS[1], alto: Math.round((ANCHOS[1] * 3) / 4) };
  console.log(`${nombre}: ${archivo} → ${ANCHOS.map((a) => `${nombre}-${a}.webp`).join(", ")}`);
}

writeFileSync(join(DESTINO, "fotos.json"), JSON.stringify(manifiesto, null, 2) + "\n");
console.log(Object.keys(manifiesto).length ? "Listo." : "No hay fotos en fotos/productos/ todavía: la tienda sigue con los dibujos.");
