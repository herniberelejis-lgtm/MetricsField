// Serie "30 días para renunciar" · Episodio 1: la presentación.
// Hernán cuenta el trato (50 locales en 30 días o sigue en la oficina) y
// abre el primer voto: PUERTA o MENSAJES.
//
//   node contenido/videos/serie-ep01/generar.mjs
//
// Lee assets/voz/duraciones.json y escribe compositions/*.html e index.html.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, L, persona, sticker, caritaPieza, tarjeta, celu, destello, escena } from "../dibujos.mjs";
import { hud } from "../serie.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const VOZ = JSON.parse(readFileSync(join(AQUI, "assets/voz/duraciones.json"), "utf8"));
const ORDEN = ["gancho", "caja", "trato", "ustedes", "dilema", "cta"];
const DUR = Object.fromEntries(ORDEN.map((id) => [id, Math.round((VOZ[id] + (id === "cta" ? 1.5 : 0.4)) * 100) / 100]));
const ESTADO = { dias: 30, locales: 0, meta: 50, renuncio: 0 };

const L4 = L.replace('stroke-width="6"', 'stroke-width="4"');
const txt = (x, y, s, t, { peso = 800, color = "#111", anchor = "middle", ignorar = true } = {}) =>
  `<text ${ignorar ? "data-layout-ignore " : ""}x="${x}" y="${y}" text-anchor="${anchor}" font-family="Montserrat" font-weight="${peso}" font-size="${s}" fill="${color}">${t}</text>`;
const T = (id, top, html, extra = "") => `<h1 id="${id}" class="tit" style="top:${top}px${extra}">${html}</h1>`;
const entraT = (sel, t = 0) => `tl.fromTo("${sel}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${t});`;
const pop = (sel, t) => `tl.fromTo("${sel}", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});`;
const piso = (y = 1560, color = C.gris) => `<rect x="0" y="${y}" width="1080" height="${1920 - y}" fill="${color}"/><path d="M0 ${y} H1080" ${L}/>`;
// Corbata de oficina sobre el torso de una persona (coordenadas del personaje).
const corbata = `<path d="M-14 -478 h28 l-6 24 l18 120 l-26 30 l-26 -30 l18 -120 Z" fill="#111" ${L4}/>`;
const hernan = (id, extra = {}) => persona(id, { camisa: "#fff", ...extra, mano: extra.mano ?? "" }).replace(`<g id="${id}-bI">`, `${corbata}<g id="${id}-bI">`);
const HUD = hud("hud", ESTADO);
const hudJs = `tl.fromTo("#hud", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(1.6)" }, 0);`;

const escenas = {};

// 1 · Gancho: en la oficina, mirando el almanaque. 30 días.
escenas.gancho = escena("gancho", DUR.gancho, {
  fondo: "#E4E7EA",
  svg: `
    ${piso(1500, "#C9CDD2")}
    <g><rect x="620" y="560" width="360" height="300" fill="#fff" ${L}/><path d="M800 560 v300 M620 710 h360" ${L}/></g>
    <g transform="translate(250 760) rotate(-4)"><g id="g-cal"><rect x="-120" y="-120" width="240" height="250" rx="20" fill="#fff" ${L}/><rect x="-120" y="-120" width="240" height="70" rx="20" fill="#D9534F" ${L}/>${txt(0, -72, 34, "DÍAS", { color: "#fff" })}<text id="g-num" data-layout-ignore x="0" y="80" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="120" fill="#111">30</text></g></g>
    <g transform="translate(540 1500) scale(.95)"><g id="g-her">${hernan("her")}</g></g>
    <rect x="160" y="1240" width="760" height="40" rx="10" fill="${C.madera}" ${L}/><rect x="200" y="1280" width="40" height="230" fill="${C.madera}" ${L}/><rect x="840" y="1280" width="40" height="230" fill="${C.madera}" ${L}/>
    <g transform="translate(700 1150)"><rect x="-110" y="-120" width="220" height="140" rx="12" fill="#111" ${L}/><rect x="-96" y="-106" width="192" height="112" rx="6" fill="${C.niebla}"/><rect x="-20" y="20" width="40" height="60" fill="#111"/><rect x="-60" y="76" width="120" height="14" rx="6" fill="#111"/></g>
    <g id="g-gota" opacity="0"><path d="M470 860 q-20 34 0 52 q20 -18 0 -52 Z" fill="${C.niebla}" ${L}/></g>
  `,
  html: `${HUD}${T("g-t", 260, `En 30 días decido si <span class="acc">renuncio.</span>`)}`,
  js: `
    gsap.set("#her-cabeza", { transformOrigin: "50% 100%" });
    ${hudJs}
    tl.fromTo("#g-t", { scale: 1 }, { scale: 1.04, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.5);
    tl.fromTo("#g-cal", { y: -700, rotation: -30, transformOrigin: "50% 0%" }, { y: 0, rotation: 0, duration: 0.5, ease: "bounce.out" }, 0.2);
    tl.to("#g-cal", { rotation: 6, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.8);
    tl.to("#her-cabeza", { rotation: -12, duration: 0.3 }, 0.9);
    tl.to("#her-feliz", { opacity: 0, duration: 0.08 }, 1.4); tl.to("#her-serio", { opacity: 1, duration: 0.08 }, 1.4);
    tl.fromTo("#g-gota", { opacity: 0, y: 0 }, { opacity: 1, y: 30, duration: 0.5 }, 1.6);
    tl.fromTo("#her-ojos", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.4, duration: 0.2, ease: "back.out(3)" }, 2.2);`,
});

// 2 · La caja: se abre y saltan los stickers y la tarjeta; al lado, el panel.
escenas.caja = escena("caja", DUR.caja, {
  svg: `
    ${piso(1500, C.madera)}
    <g transform="translate(360 1500)"><g id="c-caja"><path d="M-220 -260 h440 v260 h-440 Z" fill="#C89B6A" ${L}/><path id="c-tapa1" d="M-220 -260 l-60 -90 h220 l60 90 Z" fill="#B88A58" ${L}/><path id="c-tapa2" d="M220 -260 l60 -90 h-220 l-60 90 Z" fill="#B88A58" ${L}/>${txt(0, -110, 40, "FRÁGIL")}</g></g>
    <g transform="translate(260 980) scale(.6)"><g id="c-s1">${sticker("c-s1c", caritaPieza("c-s1c", -88))}</g></g>
    <g transform="translate(470 900) scale(.55)"><g id="c-s2">${tarjeta("c-s2c", caritaPieza("c-s2c", -66))}</g></g>
    <g transform="translate(360 760) scale(.5)"><g id="c-s3">${sticker("c-s3c", caritaPieza("c-s3c", -88))}</g></g>
    <g transform="translate(820 1180)"><g id="c-lap"><rect x="-200" y="-260" width="400" height="260" rx="18" fill="#111" ${L}/><rect x="-180" y="-240" width="360" height="220" rx="8" fill="#fff"/>
      ${txt(-160, -200, 24, "Panel", { anchor: "start" })}
      <rect id="c-b1" x="-150" y="-160" width="40" height="120" fill="${C.niebla}" ${L4}/><rect id="c-b2" x="-90" y="-130" width="40" height="90" fill="${C.niebla}" ${L4}/><rect id="c-b3" x="-30" y="-180" width="40" height="140" fill="${C.niebla}" ${L4}/><rect id="c-b4" x="30" y="-200" width="40" height="160" fill="${C.verde}" ${L4}/>
      <path d="M-240 0 h480 l-30 40 h-420 Z" fill="#111" ${L}/></g></g>
  `,
  html: `${HUD}${T("c-t", 260, `Esto es lo que <span class="acc">vendo.</span>`)}
    <span id="c-c1" class="chip negro" style="left:80px;top:1620px">Stickers y tarjetas NFC + QR</span>
    <span id="c-c2" class="chip dato" style="left:80px;top:1730px">Panel: cuántos lo usan</span>`,
  js: `
    ${entraT("#c-t")}
    tl.fromTo("#c-caja", { y: 600 }, { y: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.1);
    tl.to("#c-tapa1", { rotation: -60, transformOrigin: "100% 100%", duration: 0.3, ease: "back.out(2)" }, 0.7);
    tl.to("#c-tapa2", { rotation: 60, transformOrigin: "0% 100%", duration: 0.3, ease: "back.out(2)" }, 0.75);
    ["#c-s1", "#c-s2", "#c-s3"].forEach((s, i) => tl.fromTo(s, { y: 500, opacity: 0, rotation: (i - 1) * 25, transformOrigin: "50% 50%" }, { y: 0, opacity: 1, rotation: (i - 1) * -8, duration: 0.45, ease: "back.out(1.8)" }, 0.95 + i * 0.15));
    ${pop("#c-c1", 1.4)}
    tl.fromTo("#c-lap", { x: 600 }, { x: 0, duration: 0.45, ease: "back.out(1.3)" }, 3.2);
    ["#c-b1", "#c-b2", "#c-b3", "#c-b4"].forEach((b, i) => tl.fromTo(b, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.3, ease: "back.out(2)" }, 3.6 + i * 0.12));
    ${pop("#c-c2", 4.2)}`,
});

// 3 · El trato: dos puertas. 50 locales → RENUNCIO. Si no → SIGO EN LA OFICINA.
const puerta = (id, x, color, titulo, sub) => `
    <g id="${id}"><rect x="${x}" y="700" width="380" height="800" rx="16" fill="${color}" ${L}/><circle cx="${x + 330}" cy="1120" r="14" fill="#111"/>
    <rect x="${x + 30}" y="740" width="320" height="170" rx="16" fill="#fff" ${L}/>${txt(x + 190, 815, 44, titulo)}${txt(x + 190, 870, 30, sub, { peso: 600 })}</g>`;
escenas.trato = escena("trato", DUR.trato, {
  svg: `
    ${piso(1500)}
    ${puerta("t-p1", 70, C.verde, "RENUNCIO", "50 locales")}
    ${puerta("t-p2", 630, "#9AA0A6", "OFICINA", "menos de 50")}
    <g transform="translate(540 1560) scale(.75)"><g id="t-her">${hernan("ther")}</g></g>
    ${destello("t-d1", 100, 660, 0.9)}${destello("t-d2", 420, 640, 0.7)}
  `,
  html: `${HUD}${T("t-t", 260, `El trato: <span class="acc">50 locales.</span>`)}`,
  js: `
    gsap.set("#ther-cabeza", { transformOrigin: "50% 100%" }); gsap.set(["#ther-bD", "#ther-bI"], { transformOrigin: "50% 4%" });
    ${entraT("#t-t")}
    tl.fromTo("#t-p1", { y: -1200 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.2);
    tl.fromTo("#t-p2", { y: -1200 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.4);
    tl.fromTo("#t-her", { y: 700 }, { y: 0, duration: 0.4, ease: "back.out(1.4)" }, 0.6);
    tl.to("#ther-cabeza", { rotation: -18, duration: 0.3, ease: "sine.inOut" }, 1.4);
    tl.to("#ther-bI", { rotation: 60, duration: 0.3, ease: "back.out(2)" }, 1.4);
    ["#t-d1", "#t-d2"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 1.6 + i * 0.2));
    tl.to("#ther-bI", { rotation: 0, duration: 0.2 }, 3.0);
    tl.to("#ther-cabeza", { rotation: 18, duration: 0.35, ease: "sine.inOut" }, 3.2);
    tl.to("#ther-bD", { rotation: -60, duration: 0.3, ease: "back.out(2)" }, 3.2);
    tl.to("#ther-feliz", { opacity: 0, duration: 0.08 }, 3.4); tl.to("#ther-serio", { opacity: 1, duration: 0.08 }, 3.4);
    tl.to("#t-p2", { x: -8, duration: 0.05, yoyo: true, repeat: 7, ease: "none" }, 3.6);`,
});

// 4 · Ustedes deciden: llueven comentarios; Hernán señala a cámara.
const comentario = (id, x, y, palabra) => `<g id="${id}"><rect x="${x}" y="${y}" width="${130 + palabra.length * 30}" height="96" rx="48" fill="#fff" ${L}/><circle cx="${x + 48}" cy="${y + 48}" r="28" fill="${C.niebla}" ${L4}/>${txt(x + 96, y + 62, 38, palabra, { anchor: "start" })}</g>`;
escenas.ustedes = escena("ustedes", DUR.ustedes, {
  svg: `
    ${piso(1560)}
    <g transform="translate(330 1560) scale(.95)"><g id="u-her">${hernan("uher")}</g></g>
    ${comentario("u-k1", 560, 620, "PUERTA")}${comentario("u-k2", 640, 760, "MENSAJES")}${comentario("u-k3", 520, 900, "PUERTA")}
    ${comentario("u-k4", 680, 1040, "PUERTA")}${comentario("u-k5", 560, 1180, "MENSAJES")}${comentario("u-k6", 650, 1320, "PUERTA")}
  `,
  html: `${HUD}${T("u-t", 260, `Deciden <span class="acc">ustedes.</span>`)}`,
  js: `
    gsap.set("#uher-bD", { transformOrigin: "50% 4%" });
    ${entraT("#u-t")}
    tl.to("#uher-bD", { rotation: -100, duration: 0.3, ease: "back.out(2)" }, 0.3);
    tl.to("#uher-bD", { rotation: -85, duration: 0.15, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.7);
    ["#u-k1", "#u-k2", "#u-k3", "#u-k4", "#u-k5", "#u-k6"].forEach((k, i) => tl.fromTo(k, { opacity: 0, x: 300, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.0 + i * 0.35));`,
});

// 5 · El dilema: pantalla partida. PUERTA (local por local) o MENSAJES (uno por uno).
escenas.dilema = escena("dilema", DUR.dilema, {
  svg: `
    <rect x="0" y="0" width="540" height="1920" fill="${C.verde}"/><rect x="540" y="0" width="540" height="1920" fill="${C.niebla}"/><path d="M540 0 V1920" ${L}/>
    <g id="d-izq"><g transform="translate(60 1400) scale(.85)"><rect x="0" y="-560" width="420" height="560" fill="#fff" ${L}/><rect x="260" y="-360" width="120" height="360" fill="${C.madera}" ${L}/><rect x="40" y="-430" width="180" height="180" fill="${C.niebla}" ${L}/></g>
      <g transform="translate(230 1500) scale(.62)"><g id="d-her">${hernan("dher")}</g></g></g>
    <g id="d-der"><g transform="translate(810 1080) scale(1.1)">${celu("d-tel", `
      <g id="d-m1"><rect x="-115" y="-200" width="200" height="80" rx="20" fill="${C.verde}" ${L4}/>${txt(-100, -150, 22, "¡Hola! Vi tu local…", { peso: 700, anchor: "start" })}</g>
      <g id="d-m2"><rect x="-115" y="-100" width="200" height="80" rx="20" fill="${C.verde}" ${L4}/>${txt(-100, -50, 22, "¡Hola! Vi tu café…", { peso: 700, anchor: "start" })}</g>
      <g id="d-m3"><rect x="-115" y="0" width="200" height="80" rx="20" fill="${C.verde}" ${L4}/>${txt(-100, 50, 22, "¡Hola! Vi tu bar…", { peso: 700, anchor: "start" })}</g>`)}</g></g>
  `,
  html: `${HUD}
    <div id="d-a" style="position:absolute;left:30px;width:480px;top:270px;text-align:center;font-family:Montserrat;font-weight:800;font-size:96px;letter-spacing:-0.03em">PUERTA</div>
    <div id="d-a2" style="position:absolute;left:30px;width:480px;top:390px;text-align:center;font-family:Montserrat;font-weight:600;font-size:36px">local por local</div>
    <div id="d-b" style="position:absolute;left:570px;width:480px;top:270px;text-align:center;font-family:Montserrat;font-weight:800;font-size:82px;letter-spacing:-0.03em">MENSAJES</div>
    <div id="d-b2" style="position:absolute;left:570px;width:480px;top:390px;text-align:center;font-family:Montserrat;font-weight:600;font-size:36px">uno por uno</div>
    <div id="d-vs" style="position:absolute;left:470px;top:820px;width:140px;height:140px;border-radius:50%;background:#111;color:#fff;border:6px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-weight:800;font-size:56px">VS</div>`,
  js: `
    tl.fromTo("#d-izq", { x: -600 }, { x: 0, duration: 0.45, ease: "power3.out" }, 0.05);
    tl.fromTo("#d-der", { x: 600 }, { x: 0, duration: 0.45, ease: "power3.out" }, 0.05);
    ${pop("#d-a", 0.3)}${pop("#d-a2", 0.5)}
    tl.to("#d-her", { x: 60, duration: 1.2, ease: "power1.inOut" }, 0.5);
    tl.to("#dher-cuerpo", { y: -14, duration: 0.15, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0.5);
    ${pop("#d-b", 2.4)}${pop("#d-b2", 2.6)}
    ["#d-m1", "#d-m2", "#d-m3"].forEach((m, i) => tl.fromTo(m, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25, ease: "back.out(2)" }, 2.7 + i * 0.3));
    tl.fromTo("#d-vs", { scale: 0, rotation: -90, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, 1.6);`,
});

// 6 · CTA: comentá una palabra. El jefe se asoma; Hernán hace "shh".
escenas.cta = escena("cta", DUR.cta, {
  fondo: "#E4E7EA",
  svg: `
    ${piso(1560, "#C9CDD2")}
    <g transform="translate(360 1600) scale(.9)"><g id="z-her">${hernan("zher", { mano: `<g id="zher-dedo" opacity="0"><rect x="90" y="-310" width="20" height="60" rx="10" fill="${C.piel}" ${L}/></g>` })}</g></g>
    <g transform="translate(1180 1600) scale(.85)"><g id="z-jefe">${persona("jefe", { camisa: "#6B7178", bigote: true, pelo: "#777" })}</g></g>
    <g id="z-ojo" opacity="0">${txt(860, 760, 90, "!!", { color: "#D9534F" })}</g>
  `,
  html: `${HUD}
    <div id="z-card" style="position:absolute;left:60px;right:60px;top:260px;background:#111;color:#fff;border-radius:36px;padding:34px 40px;font-family:Montserrat">
      <p style="margin:0;font-size:44px;font-weight:700">Comentá UNA palabra:</p>
      <div style="display:flex;gap:20px;margin-top:20px"><span id="z-o1" style="flex:1;text-align:center;background:${C.verde};color:#111;border-radius:22px;padding:18px 0;font-size:64px;font-weight:800">PUERTA</span><span id="z-o2" style="flex:1;text-align:center;background:${C.niebla};color:#111;border-radius:22px;padding:18px 0;font-size:56px;font-weight:800">MENSAJES</span></div>
    </div>
    <span id="z-sh" class="chip negro" style="left:80px;top:1660px">Que no se entere mi jefe</span>
    <span id="z-ep" class="chip" style="left:80px;top:1770px">Día 1 de 30 · mañana, el resultado</span>`,
  js: `
    gsap.set(["#zher-bD", "#jefe-bI"], { transformOrigin: "50% 4%" }); gsap.set("#jefe-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#z-card", { y: -200, opacity: 0, rotation: -3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, 0.05);
    ${pop("#z-o1", 0.5)}${pop("#z-o2", 0.7)}
    tl.to(["#z-o1", "#z-o2"], { scale: 1.06, duration: 0.25, yoyo: true, repeat: 3, stagger: 0.25, ease: "sine.inOut" }, 1.0);
    tl.fromTo("#z-jefe", { x: 0 }, { x: -380, duration: 0.5, ease: "back.out(1.3)" }, 2.3);
    tl.to("#jefe-cabeza", { rotation: -15, duration: 0.3 }, 2.8);
    tl.fromTo("#z-ojo", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, 3.0);
    tl.to("#zher-bD", { rotation: -165, duration: 0.3, ease: "back.out(2)" }, 3.1);
    tl.to("#zher-dedo", { opacity: 1, duration: 0.05 }, 3.2);
    tl.to("#zher-feliz", { opacity: 0, duration: 0.08 }, 3.1); tl.to("#zher-serio", { opacity: 1, duration: 0.08 }, 3.1);
    ${pop("#z-sh", 3.2)}${pop("#z-ep", 3.6)}`,
});

for (const [id, html] of Object.entries(escenas)) writeFileSync(join(AQUI, "compositions", `${id}.html`), html);

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
