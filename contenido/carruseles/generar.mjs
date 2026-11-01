// Carruseles de Instagram con el manual de marca (Montserrat, blanco/negro,
// azul niebla #C8D8E8 solo para el dato). Cada carrusel es un .json en
// contenido/carruseles/piezas/ con sus láminas; esto las dibuja todas igual
// (misma grilla, márgenes y tamaños) y las exporta a PNG 1080×1350.
//
//   node contenido/carruseles/generar.mjs            # todos
//   node contenido/carruseles/generar.mjs p04        # uno
//
// Si playwright no está en node_modules, pasá PLAYWRIGHT_MODULE=/ruta/index.mjs.
// Las PNG quedan en contenido/carruseles/salida/<pieza>/.

import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

// setContent arranca en about:blank y no puede leer file://: fuente e isotipo van incrustados.
const FUENTE = `data:font/woff2;base64,${readFileSync(join(AQUI, "montserrat.woff2")).toString("base64")}`;
const ISOTIPO = `data:image/svg+xml;base64,${readFileSync(join(AQUI, "isotipo.svg")).toString("base64")}`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// **palabra** → resaltado con el azul del dato (sobre blanco) o subrayado (sobre negro).
const rico = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>").replace(/\n/g, "<br>");

const CSS = `
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FUENTE}) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;font-family:Montserrat,sans-serif;-webkit-font-smoothing:antialiased}
.lam{position:relative;width:1080px;height:1350px;padding:84px 88px;display:flex;flex-direction:column;background:#fff;color:#000}
.lam.negro{background:#000;color:#fff}
.cab{display:flex;justify-content:space-between;align-items:center;font-size:26px;font-weight:600;letter-spacing:.08em;color:#6b6b6b}
.negro .cab{color:#a8a8a8}
.cab b{font-weight:600;letter-spacing:0;color:inherit}
.cuerpo{flex:1;display:flex;flex-direction:column;justify-content:center}
.pie{display:flex;align-items:center;gap:16px;font-size:26px;font-weight:500;color:#6b6b6b}
.negro .pie{color:#a8a8a8}
.pie img{width:40px;height:40px}
.negro .pie img{filter:invert(1)}
mark{background:#C8D8E8;color:inherit;padding:0 .12em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.negro mark{background:none;padding:0;color:#fff;text-decoration:underline;text-decoration-thickness:6px;text-underline-offset:10px;text-decoration-color:#C8D8E8}
/* portada con número gigante */
.cifra{font-size:440px;font-weight:600;letter-spacing:-.06em;line-height:.9;margin-left:-14px}
.titulo{font-size:76px;font-weight:600;line-height:1.08;letter-spacing:-.025em}
.bajada{font-size:46px;font-weight:400;line-height:1.25;margin-top:36px;max-width:860px}
.accion{font-size:34px;font-weight:600;margin-top:56px}
/* ítem numerado */
.num{display:inline-flex;align-items:center;justify-content:center;width:240px;height:200px;background:#C8D8E8;font-size:150px;font-weight:700;letter-spacing:-.04em;margin-bottom:56px}
.linea{width:100%;height:3px;background:#000;margin:44px 0}
.negro .linea{background:#fff}
/* comparativa */
.comp{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:56px}
.ficha{border:3px solid #000;padding:36px 34px}
.ficha.dato{background:#C8D8E8;border-color:#C8D8E8}
.ficha h3{font-size:30px;font-weight:600;margin-bottom:18px}
.ficha .n{font-size:110px;font-weight:600;letter-spacing:-.04em;line-height:1}
.ficha p{font-size:30px;line-height:1.35;margin-top:16px}
.etq{display:inline-block;margin-top:34px;font-size:24px;font-weight:600;letter-spacing:.06em;color:#6b6b6b}
`;

function lamina(l, i, total, pieza) {
  const negro = l.fondo === "negro";
  const cab = `<div class="cab"><span>${esc(pieza.vertical || "METRICSFIELD")}</span><b>${i + 1}/${total}</b></div>`;
  const pie = l.pie ? `<div class="pie"><img src="${ISOTIPO}" alt="">${esc(l.pie)}</div>` : "";
  let cuerpo = "";
  if (l.tipo === "cifra") {
    cuerpo = `<div class="cifra">${esc(l.cifra)}</div><p class="bajada" style="font-size:54px;margin-top:40px">${rico(l.texto)}</p>${l.accion ? `<p class="accion">${esc(l.accion)}</p>` : ""}`;
  } else if (l.tipo === "item") {
    cuerpo = `<div><span class="num">${esc(l.num)}</span></div><h2 class="titulo">${rico(l.titulo)}</h2><div class="linea"></div><p class="bajada" style="margin-top:0">${rico(l.texto)}</p>`;
  } else if (l.tipo === "comparativa") {
    cuerpo = `<h2 class="titulo">${rico(l.titulo)}</h2><div class="comp">${l.fichas
      .map((f) => `<div class="ficha${f.dato ? " dato" : ""}"><h3>${esc(f.nombre)}</h3><div class="n">${esc(f.cifra)}</div><p>${rico(f.texto)}</p></div>`)
      .join("")}</div>${l.etiqueta ? `<span class="etq">${esc(l.etiqueta)}</span>` : ""}`;
  } else {
    cuerpo = `<h2 class="titulo">${rico(l.titulo)}</h2>${l.texto ? `<div class="linea"></div><p class="bajada" style="margin-top:0">${rico(l.texto)}</p>` : ""}${l.accion ? `<p class="accion">${esc(l.accion)}</p>` : ""}`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="lam${negro ? " negro" : ""}">${cab}<div class="cuerpo">${cuerpo}</div>${pie}</div></body></html>`;
}

const dirPiezas = join(AQUI, "piezas");
const filtro = process.argv[2];
const piezas = readdirSync(dirPiezas).filter((f) => f.endsWith(".json") && (!filtro || f.startsWith(filtro)));
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1350 } });
for (const archivo of piezas) {
  const pieza = JSON.parse(readFileSync(join(dirPiezas, archivo), "utf8"));
  const salida = join(AQUI, "salida", archivo.replace(/\.json$/, ""));
  mkdirSync(salida, { recursive: true });
  for (const [i, l] of pieza.laminas.entries()) {
    await pagina.setContent(lamina(l, i, pieza.laminas.length, pieza), { waitUntil: "load" });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: join(salida, `${String(i + 1).padStart(2, "0")}.png`) });
  }
  console.log(`${archivo}: ${pieza.laminas.length} láminas → ${salida}`);
}
await navegador.close();
