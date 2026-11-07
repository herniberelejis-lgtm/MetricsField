// "30 días para decidir" · Episodio 1: la presentación.
// Hernán gastó sus ahorros en el stock; en 30 días decide con datos si va
// all-in o lo deja (umbrales del tablero: 30 locales activos, 300 usos por
// semana, 15 locales que pagan). Abre el primer voto: CAFÉ o PELU.
// Guion: doc "Serie «30 días para decidir» — MetricsField".
//
//   node contenido/videos/decidir-ep01/generar.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, L, persona, sticker, tarjeta, caritaPieza, celu, ondas, destello, escena } from "../dibujos.mjs";
import { hudDecidir, fachada } from "../serie.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const VOZ = JSON.parse(readFileSync(join(AQUI, "assets/voz/duraciones.json"), "utf8"));
const ORDEN = ["ahorros", "producto", "panel", "decidir", "datos", "ustedes", "cta"];
const DUR = Object.fromEntries(ORDEN.map((id) => [id, Math.round((VOZ[id] + (id === "cta" ? 1.6 : 0.45)) * 100) / 100]));

const L4 = L.replace('stroke-width="6"', 'stroke-width="4"');
const txt = (x, y, s, t, { peso = 800, color = "#111", anchor = "middle", ignorar = true } = {}) =>
  `<text ${ignorar ? "data-layout-ignore " : ""}x="${x}" y="${y}" text-anchor="${anchor}" font-family="Montserrat" font-weight="${peso}" font-size="${s}" fill="${color}">${t}</text>`;
const T = (id, top, html, extra = "") => `<h1 id="${id}" class="tit" style="top:${top}px${extra}">${html}</h1>`;
const entraT = (sel, t = 0) => `tl.fromTo("${sel}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${t});`;
const pop = (sel, t) => `tl.fromTo("${sel}", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});`;
const piso = (y = 1560, color = C.gris) => `<rect x="0" y="${y}" width="1080" height="${1920 - y}" fill="${color}"/><path d="M0 ${y} H1080" ${L}/>`;
const hernan = (id, extra = {}) => persona(id, { camisa: C.niebla, ...extra });
const HUD = hudDecidir("hud", { dia: 1, locales: 0, metaLocales: 30, usos: 0, balanza: 0 });

const escenas = {};

// 1 · Ahorros: la alcancía se vacía en una caja enorme; saltan stickers y tarjetas.
const minis = Array.from({ length: 9 }, (_, i) => {
  const x = 420 + (i % 3) * 210, y = 640 + Math.floor(i / 3) * 150;
  const pieza = i % 2 ? tarjeta(`a-m${i}c`, caritaPieza(`a-m${i}c`, -66)) : sticker(`a-m${i}c`, caritaPieza(`a-m${i}c`, -88));
  return `<g transform="translate(${x} ${y}) scale(.36)"><g id="a-m${i}" opacity="0">${pieza}</g></g>`;
}).join("");
escenas.ahorros = escena("ahorros", DUR.ahorros, {
  svg: `
    ${piso(1560)}
    <g transform="translate(150 1560) scale(.8)"><g id="a-her">${hernan("aher")}</g></g>
    <g transform="translate(930 1430)"><g id="a-chancho"><ellipse cx="0" cy="0" rx="120" ry="90" fill="#F4B6C2" ${L}/><circle cx="105" cy="-20" r="34" fill="#F4B6C2" ${L}/><circle cx="114" cy="-24" r="6" fill="#111"/><path d="M-40 -88 h80" stroke="#111" stroke-width="10" stroke-linecap="round"/><rect x="-80" y="70" width="34" height="50" rx="10" fill="#F4B6C2" ${L}/><rect x="40" y="70" width="34" height="50" rx="10" fill="#F4B6C2" ${L}/></g></g>
    <g id="a-monedas">${[0, 1, 2, 3, 4].map((i) => `<circle id="a-c${i}" cx="${880 + i * 18}" cy="1340" r="26" fill="#FFD54A" ${L4} opacity="0"/>`).join("")}</g>
    <g transform="translate(560 1560)"><g id="a-caja"><path d="M-260 -300 h520 v300 h-520 Z" fill="#C89B6A" ${L}/>${txt(0, -130, 52, "STOCK", { ignorar: false })}</g></g>
    ${minis}
  `,
  html: `${HUD}${T("a-t", 230, `Gasté todos mis <span class="acc">ahorros</span> en esto.`)}`,
  js: `
    tl.fromTo("#hud", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(1.6)" }, 0);
    tl.fromTo("#a-t", { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.4);
    tl.to("#a-chancho", { rotation: 160, transformOrigin: "50% 50%", duration: 0.4, ease: "back.in(1.5)" }, 0.3);
    ${[0, 1, 2, 3, 4].map((i) => `tl.fromTo("#a-c${i}", { opacity: 1, y: 0, x: 0 }, { y: -40, x: ${-280 - i * 30}, duration: 0.45, ease: "power2.in" }, ${0.6 + i * 0.08});\n    tl.to("#a-c${i}", { opacity: 0, duration: 0.05 }, ${1.05 + i * 0.08});`).join("\n    ")}
    tl.to("#a-chancho", { y: -20, duration: 0.1, yoyo: true, repeat: 5 }, 0.7);
    ${Array.from({ length: 9 }, (_, i) => `tl.fromTo("#a-m${i}", { opacity: 0, y: 700, rotation: ${(i % 3 - 1) * 30}, transformOrigin: "50% 50%" }, { opacity: 1, y: 0, rotation: ${(i % 3 - 1) * -10}, duration: 0.4, ease: "back.out(1.8)" }, ${1.3 + i * 0.09});`).join("\n    ")}
    tl.to("#aher-feliz", { opacity: 0, duration: 0.08 }, 1.0); tl.to("#aher-serio", { opacity: 1, duration: 0.08 }, 1.0);`,
});

// 2 · Producto: el celu se apoya en el sticker, ondas, cae la notificación. QR como alternativa.
escenas.producto = escena("producto", DUR.producto, {
  fondo: C.madera,
  svg: `
    <g transform="translate(400 1080) scale(1.5)"><g id="p-st">${sticker("p-stc")}</g></g>
    ${ondas("p", 400, 1080)}
    <g transform="translate(700 880)"><g id="p-celu">${celu("p-tel", `<rect x="-110" y="-190" width="220" height="120" rx="20" fill="${C.niebla}"/>${txt(0, -118, 40, "★")}<rect x="-110" y="-50" width="220" height="24" rx="12" fill="${C.gris}"/><rect x="-110" y="-10" width="160" height="24" rx="12" fill="${C.gris}"/>`)}</g></g>
    <g id="p-cam" opacity="0"><path d="M440 1080 h-50 v50 M640 1080 h50 v50 M440 1290 h-50 v-50 M640 1290 h50 v-50" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></g>
  `,
  html: `
    <div id="p-noti" style="position:absolute;left:60px;right:60px;top:200px;background:#fff;border:5px solid #111;border-radius:40px;padding:28px 34px;display:flex;gap:26px;align-items:center">
      <span style="width:84px;height:84px;border-radius:22px;background:${C.niebla};border:4px solid #111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:44px">★</span>
      <span><b style="display:block;font-size:36px;font-weight:700">Tu página de reseñas de Google</b><small style="display:block;font-size:30px;color:#5e5e5e;margin-top:4px">Tocá para abrir</small></span></div>
    <span id="p-c1" class="chip negro" style="left:80px;top:1560px">NFC: apoyás el celu</span>
    <span id="p-c2" class="chip dato" style="left:80px;top:1670px">QR: escaneás con la cámara</span>
    ${HUD}`,
  js: `
    tl.fromTo("#p-st", { scale: 0, rotation: -20, transformOrigin: "50% 50%" }, { scale: 1, rotation: -4, duration: 0.4, ease: "back.out(2)" }, 0.05);
    tl.fromTo("#p-celu", { x: 400, y: -900, rotation: -40, transformOrigin: "50% 50%" }, { x: -300, y: 180, rotation: -16, duration: 0.6, ease: "power3.out" }, 0.9);
    ${pop("#p-c1", 1.2)}
    [0, 1, 2].forEach((i) => tl.fromTo("#p-o" + i, { opacity: 0.95, attr: { r: 120 } }, { opacity: 0, attr: { r: 420 }, duration: 0.8, ease: "power2.out" }, 1.5 + i * 0.22));
    tl.to("#p-celu", { x: 400, y: -300, rotation: 10, duration: 0.45, ease: "power2.in" }, 2.8);
    tl.fromTo("#p-cam", { opacity: 0, scale: 1.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3 }, 3.1);
    ${pop("#p-c2", 3.2)}
    tl.fromTo("#p-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }, 4.6);
    tl.to("#p-noti", { scale: 1.04, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, 5.6);
    tl.to("#p-st", { rotation: 4, duration: 0.2, yoyo: true, repeat: 5, ease: "sine.inOut" }, 6.6);`,
});

// 3 · Panel: el dueño mira el panel y el contador de usos sube.
escenas.panel = escena("panel", DUR.panel, {
  svg: `
    ${piso(1560)}
    <g transform="translate(860 1880) scale(.82)"><g id="n-due">${persona("ndu", { camisa: C.verde, bigote: true })}</g></g>
  `,
  html: `${HUD}${T("n-t", 230, `El dueño ve <span class="acc">cuántos lo usan.</span>`)}
    <div id="n-panel" style="position:absolute;left:60px;width:720px;top:560px;background:#fff;border:5px solid #111;border-radius:36px;padding:34px;font-family:Montserrat">
      <p style="display:flex;align-items:center;gap:14px;font-size:28px;font-weight:700;margin:0 0 20px"><img src="assets/isotipo.svg" alt="" style="width:40px;height:40px">MetricsField Reviews</p>
      <div style="background:${C.niebla};border-radius:20px;padding:20px"><small style="display:block;font-size:30px;font-weight:600">Usos de tus piezas este mes</small><b id="n-k" style="display:block;font-size:96px;font-weight:800;line-height:1.1">0</b></div>
    </div>
    <span id="n-etq" class="etq" style="left:60px;top:1040px">Datos de ejemplo</span>`,
  js: `
    gsap.set("#ndu-cabeza", { transformOrigin: "50% 100%" });
    ${entraT("#n-t")}
    tl.fromTo("#n-panel", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.15);
    tl.fromTo("#n-due", { x: 400 }, { x: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.2);
    ${pop("#n-etq", 0.4)}
    const k = { a: 0 };
    tl.fromTo(k, { a: 0 }, { a: 148, duration: 1.6, ease: "power2.out", onUpdate: () => { document.querySelector("#n-k").textContent = Math.round(k.a); } }, 0.5);
    tl.to("#ndu-cabeza", { rotation: -10, duration: 0.3, ease: "sine.inOut" }, 0.9);
    tl.fromTo("#ndu-ojos", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.35, duration: 0.2, ease: "back.out(3)" }, 1.8);`,
});

// 4 · Decidir: Hernán frente a una balanza. ALL-IN o LO DEJO.
const balanza = `
  <g id="b-bal">
    <rect x="520" y="900" width="40" height="560" fill="#111"/><path d="M440 1470 h200 l-30 -40 h-140 Z" fill="#111"/>
    <g id="b-brazo"><rect x="190" y="880" width="700" height="24" rx="12" fill="#111"/>
      <g><path d="M230 904 l-60 180 M230 904 l60 180" stroke="#111" stroke-width="5"/><path d="M150 1084 h160 q-20 60 -80 60 q-60 0 -80 -60 Z" fill="${C.verde}" ${L}/>${txt(230, 1050, 40, "ALL-IN", { ignorar: false })}</g>
      <g><path d="M850 904 l-60 180 M850 904 l60 180" stroke="#111" stroke-width="5"/><path d="M770 1084 h160 q-20 60 -80 60 q-60 0 -80 -60 Z" fill="#9AA0A6" ${L}/>${txt(850, 1050, 40, "LO DEJO", { ignorar: false })}</g>
    </g>
    <circle cx="540" cy="892" r="22" fill="#FFD54A" ${L}/>
  </g>`;
escenas.decidir = escena("decidir", DUR.decidir, {
  svg: `
    ${piso(1560)}
    ${balanza}
    <g transform="translate(540 1900) scale(.55)"><g id="b-her">${hernan("bher")}</g></g>
  `,
  html: `${HUD}${T("b-t", 230, `30 días para <span class="acc">decidir.</span>`)}`,
  js: `
    gsap.set("#bher-cabeza", { transformOrigin: "50% 100%" });
    ${entraT("#b-t")}
    tl.fromTo("#b-bal", { y: -1200 }, { y: 0, duration: 0.55, ease: "bounce.out" }, 0.1);
    tl.to("#b-brazo", { rotation: -8, svgOrigin: "540 892", duration: 0.5, ease: "sine.inOut" }, 1.0);
    tl.to("#b-brazo", { rotation: 8, svgOrigin: "540 892", duration: 0.7, ease: "sine.inOut" }, 1.6);
    tl.to("#b-brazo", { rotation: -4, svgOrigin: "540 892", duration: 0.6, ease: "sine.inOut" }, 2.4);
    tl.to("#b-brazo", { rotation: 0, svgOrigin: "540 892", duration: 0.5, ease: "sine.inOut" }, 3.1);
    tl.to("#bher-cabeza", { rotation: -15, duration: 0.3 }, 1.0);
    tl.to("#bher-cabeza", { rotation: 15, duration: 0.4 }, 1.7);
    tl.to("#bher-cabeza", { rotation: 0, duration: 0.3 }, 2.5);`,
});

// 5 · Datos: el tablero con las tres metas.
const meta = (id, num, nombre, top, dato) => `
    <div id="${id}" style="position:absolute;left:80px;right:80px;top:${top}px;background:${dato ? C.niebla : "#fff"};border:5px solid #111;border-radius:30px;padding:24px 34px;display:flex;align-items:center;gap:30px;font-family:Montserrat">
      <b style="font-size:96px;font-weight:800;letter-spacing:-0.04em;min-width:220px">${num}</b><span style="font-size:40px;font-weight:700;line-height:1.15">${nombre}</span></div>`;
escenas.datos = escena("datos", DUR.datos, {
  html: `${HUD}${T("d-t", 230, `Decido <span class="acc">con datos.</span>`)}
    <p id="d-sub" style="position:absolute;left:80px;right:80px;top:350px;font-family:Montserrat;font-size:40px;font-weight:600;color:#5e5e5e;margin:0">En 30 días, si llego a:</p>
    ${meta("d-m1", "30", "locales activos", 460, false)}
    ${meta("d-m2", "300", "usos por semana", 680, false)}
    ${meta("d-m3", "15", "locales que pagan", 900, false)}
    <div id="d-si" style="position:absolute;left:80px;width:440px;top:1160px;background:${C.verde};border:5px solid #111;border-radius:30px;padding:24px;font-family:Montserrat;font-size:44px;font-weight:800;text-align:center">Sí → ALL-IN</div>
    <div id="d-no" style="position:absolute;left:560px;width:440px;top:1160px;background:#9AA0A6;border:5px solid #111;border-radius:30px;padding:24px;font-family:Montserrat;font-size:44px;font-weight:800;text-align:center">No → LO DEJO</div>`,
  js: `
    ${entraT("#d-t")}
    ${entraT("#d-sub", 1.2)}
    tl.fromTo("#d-m1", { opacity: 0, x: -200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 3.2);
    tl.fromTo("#d-m2", { opacity: 0, x: -200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 4.4);
    tl.fromTo("#d-m3", { opacity: 0, x: -200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 5.6);
    ${pop("#d-si", 7.0)}
    ${pop("#d-no", 8.0)}`,
});

// 6 · Ustedes: llueven comentarios; Hernán señala a cámara.
const comentario = (id, x, y, palabra) => `<g id="${id}"><rect x="${x}" y="${y}" width="${130 + palabra.length * 30}" height="96" rx="48" fill="#fff" ${L}/><circle cx="${x + 48}" cy="${y + 48}" r="28" fill="${C.niebla}" ${L4}/>${txt(x + 96, y + 62, 38, palabra, { anchor: "start" })}</g>`;
escenas.ustedes = escena("ustedes", DUR.ustedes, {
  svg: `
    ${piso(1560)}
    <g transform="translate(330 1560) scale(.95)"><g id="u-her">${hernan("uher")}</g></g>
    ${comentario("u-k1", 600, 620, "CAFÉ")}${comentario("u-k2", 660, 760, "PELU")}${comentario("u-k3", 560, 900, "CAFÉ")}
    ${comentario("u-k4", 700, 1040, "PELU")}${comentario("u-k5", 600, 1180, "CAFÉ")}${comentario("u-k6", 680, 1320, "CAFÉ")}
  `,
  html: `${HUD}${T("u-t", 230, `El camino lo <span class="acc">eligen ustedes.</span>`)}`,
  js: `
    gsap.set("#uher-bD", { transformOrigin: "50% 4%" });
    ${entraT("#u-t")}
    tl.to("#uher-bD", { rotation: -100, duration: 0.3, ease: "back.out(2)" }, 0.3);
    tl.to("#uher-bD", { rotation: -85, duration: 0.15, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.7);
    ["#u-k1", "#u-k2", "#u-k3", "#u-k4", "#u-k5", "#u-k6"].forEach((k, i) => tl.fromTo(k, { opacity: 0, x: 300, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.9 + i * 0.4));`,
});

// 7 · CTA: cafetería o peluquería. Comentá UNA palabra.
escenas.cta = escena("cta", DUR.cta, {
  svg: `
    ${piso(1560)}
    <g transform="translate(60 1560) scale(.95)"><g id="z-caf">${fachada("z-cf", "CAFETERÍA", C.verde, L)}</g></g>
    <g transform="translate(600 1560) scale(.95)"><g id="z-pel">${fachada("z-pf", "PELUQUERÍA", C.niebla, L)}</g></g>
    <g transform="translate(540 1600) scale(.5)"><g id="z-her">${hernan("zher")}</g></g>
  `,
  html: `${HUD}
    <div id="z-card" style="position:absolute;left:60px;right:60px;top:200px;background:#111;color:#fff;border-radius:36px;padding:30px 40px;font-family:Montserrat">
      <p style="margin:0;font-size:44px;font-weight:700">Comentá UNA palabra:</p>
      <div style="display:flex;gap:20px;margin-top:20px"><span id="z-o1" style="flex:1;text-align:center;background:${C.verde};color:#111;border-radius:22px;padding:18px 0;font-size:72px;font-weight:800">CAFÉ</span><span id="z-o2" style="flex:1;text-align:center;background:${C.niebla};color:#111;border-radius:22px;padding:18px 0;font-size:72px;font-weight:800">PELU</span></div>
    </div>
    <span id="z-ep" class="chip" style="left:80px;top:1680px">Día 1 de 30 · mañana, el resultado</span>`,
  js: `
    gsap.set("#zher-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#z-caf", { y: -1600 }, { y: 0, duration: 0.55, ease: "bounce.out" }, 0.05);
    tl.fromTo("#z-pel", { y: -1600 }, { y: 0, duration: 0.55, ease: "bounce.out" }, 0.25);
    tl.fromTo("#z-her", { y: 600 }, { y: 0, duration: 0.4, ease: "back.out(1.4)" }, 0.6);
    tl.to("#zher-cabeza", { rotation: -15, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.0);
    tl.fromTo("#z-card", { y: -200, opacity: 0, rotation: -3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, 3.0);
    ${pop("#z-o1", 3.4)}${pop("#z-o2", 3.6)}
    tl.to(["#z-o1", "#z-o2"], { scale: 1.06, duration: 0.25, yoyo: true, repeat: 3, stagger: 0.25, ease: "sine.inOut" }, 4.2);
    ${pop("#z-ep", 5.0)}`,
});

for (const id of ORDEN) writeFileSync(join(AQUI, "compositions", `${id}.html`), escenas[id]);

let t = 0;
const divs = [];
const auds = [];
ORDEN.forEach((id, i) => {
  divs.push(`      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${t.toFixed(2)}" data-duration="${DUR[id]}" data-track-index="${i + 1}" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`);
  auds.push(`      <audio id="voz-${id}" data-start="${(t + 0.15).toFixed(2)}" data-duration="${VOZ[id]}" data-track-index="${20 + i}" data-volume="1" src="assets/voz/${id}.wav"></audio>`);
  t += DUR[id];
});
writeFileSync(join(AQUI, "index.html"), `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: Montserrat; font-weight: 100 900; src: url(assets/montserrat.woff2) format("woff2"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #fff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${t.toFixed(2)}" data-width="1080" data-height="1920">
${divs.join("\n")}
${auds.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
console.log(`${ORDEN.length} escenas, ${t.toFixed(2)} s → compositions/ + index.html`);
