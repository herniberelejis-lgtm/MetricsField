// Serie "30 días para renunciar" · Episodio 2 DE PRUEBA: puerta a puerta en
// la avenida Gauss (Villa Belgrano, Córdoba). Datos inventados para ver cómo
// queda el formato: 20 locales → 13 no, 5 piden info, 3 sí. Los nombres de los
// locales son de fantasía (no se atribuyen respuestas a negocios reales) y el
// video lleva la marca "PRUEBA · datos inventados" todo el tiempo.
//
//   node contenido/videos/serie-ep02/generar.mjs
//
// Voces: Hernán (Tomás) en assets/voz/<id>.wav y los dueños (Elena) en
// assets/voz/d-<id>.wav; duraciones en assets/voz/duraciones.json.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, L, persona, sticker, caritaPieza, destello, escena } from "../dibujos.mjs";
import { hud, hudSube, eligieron, prueba, fachada } from "../serie.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const VOZ = JSON.parse(readFileSync(join(AQUI, "assets/voz/duraciones.json"), "utf8"));
const META = 50;
const r2 = (n) => Math.round(n * 100) / 100;

const L4 = L.replace('stroke-width="6"', 'stroke-width="4"');
const txt = (x, y, s, t, { peso = 800, color = "#111", anchor = "middle", ignorar = true } = {}) =>
  `<text ${ignorar ? "data-layout-ignore " : ""}x="${x}" y="${y}" text-anchor="${anchor}" font-family="Montserrat" font-weight="${peso}" font-size="${s}" fill="${color}">${t}</text>`;
const T = (id, top, html, extra = "") => `<h1 id="${id}" class="tit" style="top:${top}px${extra}">${html}</h1>`;
const entraT = (sel, t = 0) => `tl.fromTo("${sel}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${t});`;
const pop = (sel, t) => `tl.fromTo("${sel}", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});`;
const piso = (y = 1560, color = C.gris) => `<rect x="0" y="${y}" width="1080" height="${1920 - y}" fill="${color}"/><path d="M0 ${y} H1080" ${L}/>`;
const corbata = `<path d="M-14 -478 h28 l-6 24 l18 120 l-26 30 l-26 -30 l18 -120 Z" fill="#111" ${L4}/>`;
const hernan = (id) => persona(id, { camisa: "#fff" }).replace(`<g id="${id}-bI">`, `${corbata}<g id="${id}-bI">`);
const sello = (id, x, y, palabra = "NO", color = "#D9534F") =>
  `<g id="${id}" opacity="0"><g transform="translate(${x} ${y}) rotate(-14)"><rect x="-150" y="-70" width="300" height="140" rx="18" fill="none" stroke="${color}" stroke-width="14"/>${txt(0, 34, 96, palabra, { color, ignorar: false })}</g></g>`;
const globo = (id, x, y, w, frase) => `<g id="${id}" opacity="0"><rect x="${x}" y="${y}" width="${w}" height="120" rx="30" fill="#fff" ${L}/><path d="M${x + 60} ${y + 116} l-10 50 l50 -50" fill="#fff" ${L}/>${txt(x + w / 2, y + 76, 44, frase, { ignorar: false })}</g>`;
const marca = prueba("prueba");

// Clips de audio por escena: [archivo, segundo dentro de la escena].
const clips = {};
const escenas = {};
const DUR = {};
function agrega(id, dur, audio, cfg) {
  DUR[id] = r2(dur);
  clips[id] = audio;
  escenas[id] = escena(id, DUR[id], cfg);
}
const V = (k) => VOZ[k];

// 1 · Ustedes eligieron PUERTA: Hernán sale con la caja hacia la Av. Gauss.
agrega("eligieron", V("eligieron") + 0.4, [["eligieron", 0.15]], {
  svg: `
    ${piso(1500)}
    <g transform="translate(700 0)"><rect x="0" y="900" width="26" height="600" fill="#555"/><rect x="-170" y="830" width="360" height="110" rx="14" fill="#2E7D4F" ${L}/>${txt(10, 900, 48, "AV. GAUSS", { color: "#fff", ignorar: false })}</g>
    <g transform="translate(300 1520) scale(.9)"><g id="e-her">${hernan("eher")}</g></g>
    <g transform="translate(300 1300)"><g id="e-caja"><rect x="80" y="-120" width="200" height="140" fill="#C89B6A" ${L}/>${txt(180, -40, 30, "FRÁGIL")}</g></g>
  `,
  html: `${hud("hud", { dias: 29, locales: 0, meta: META })}${eligieron("e-card", "PUERTA", 240)}
    <span id="e-c" class="chip dato" style="left:80px;top:1620px">Villa Belgrano, Córdoba</span>${marca}`,
  js: `
    gsap.set("#eher-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#e-card", { scale: 0, rotation: -20, transformOrigin: "50% 50%" }, { scale: 1, rotation: -3, duration: 0.45, ease: "back.out(2.2)" }, 0.05);
    tl.to("#e-card", { opacity: 0, y: -60, duration: 0.3 }, 2.6);
    tl.to("#eher-bD", { rotation: -40, duration: 0.3 }, 0.4);
    tl.to(["#e-her", "#e-caja"], { x: 260, duration: 2.4, ease: "power1.inOut" }, 2.2);
    tl.to("#eher-cuerpo", { y: -16, duration: 0.15, yoyo: true, repeat: 15, ease: "sine.inOut" }, 2.2);
    ${pop("#e-c", 3.0)}`,
});

// 2 · La ruta: la avenida en un mapa y 20 pines que aparecen uno por uno.
const pines = Array.from({ length: 20 }, (_, i) => {
  const lado = i % 2 ? 1 : -1;
  return `<g id="r-p${i}" opacity="0"><g transform="translate(${540 + lado * 120} ${560 + i * 52})"><path d="M0 0 c-22 -24 -30 -40 -30 -56 a30 30 0 1 1 60 0 c0 16 -8 32 -30 56 Z" fill="#fff" ${L4}/>${txt(0, -46, 26, i + 1)}</g></g>`;
}).join("");
agrega("ruta", V("ruta") + 0.6, [["ruta", 0.15]], {
  fondo: "#EEF2EA",
  svg: `
    <rect x="490" y="480" width="100" height="1150" fill="#fff" ${L}/><path d="M540 500 V1610" stroke="#FFD54A" stroke-width="8" stroke-dasharray="30 24"/>
    <rect x="150" y="700" width="180" height="140" rx="12" fill="${C.verde}" ${L4}/><rect x="760" y="900" width="180" height="200" rx="12" fill="${C.verde}" ${L4}/><rect x="150" y="1200" width="180" height="160" rx="12" fill="${C.verde}" ${L4}/>
    ${pines}
  `,
  html: `${hud("hud", { dias: 29, locales: 0, meta: META })}${T("r-t", 250, `20 locales. <span class="acc">Una tarde.</span>`)}
    <span id="r-n" class="chip negro" style="left:80px;top:1700px;font-size:44px"><span id="r-num">0</span> puertas</span>${marca}`,
  js: `
    ${entraT("#r-t")}
    for (let i = 0; i < 20; i++) tl.fromTo("#r-p" + i, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.18, ease: "back.out(3)" }, 0.4 + i * 0.12);
    ${pop("#r-n", 0.4)}
    const rk = { n: 0 };
    tl.fromTo(rk, { n: 0 }, { n: 20, duration: 20 * 0.12, ease: "none", onUpdate: () => { document.querySelector("#r-num").textContent = Math.round(rk.n); } }, 0.4);`,
});

// 3 · Los NO: tres locales que pasan como una tira; sellos y frases de los dueños.
{
  const n = V("nos");
  const a3 = n + 0.25; // "No tengo tiempo para eso." (dueño 3)
  const a2 = a3 + V("d-no3") + 0.3; // "Ya tengo un QR." (montaje hasta 13)
  const fin = a2 + V("d-no2") + 0.9;
  const tira = [
    ["Pizzería La Fórmula", C.niebla, "#C98E62"],
    ["Óptica Foco", C.verde, "#3B2A20"],
    ["Ferretería El Tornillo", "#F2C9A0", "#777"],
  ]
    .map(([nombre, color, pelo], i) => `<g transform="translate(${i * 1080} 0)"><g transform="translate(320 1500)">${fachada("n-f" + i, nombre, color, L)}</g>
      <g transform="translate(320 1520) scale(.8)">${persona("nd" + i, { camisa: i === 1 ? "#fff" : "#8C6BB1", pelo })}</g></g>`)
    .join("");
  agrega("nos", fin, [["nos", 0.15], ["d-no3", a3], ["d-no2", a2]], {
    svg: `
      ${piso(1500)}
      <g id="n-tira">${tira}</g>
      ${globo("n-g", 520, 540, 520, "No tengo tiempo")}
      ${globo("n-g2", 520, 540, 520, "Ya tengo un QR")}
      ${sello("n-s0", 540, 1150)}${sello("n-s1", 540, 1150)}${sello("n-s2", 540, 1150)}
    `,
    html: `${hud("hud", { dias: 29, locales: 0, meta: META })}${T("n-t", 250, `Primero, <span class="acc">los "no".</span>`)}
      <span id="n-c" class="chip negro" style="left:80px;top:1640px;font-size:52px;background:#D9534F;border-color:#D9534F">NO: <span id="n-num">0</span></span>${marca}`,
    js: `
      ["#nd0-bI", "#nd1-bI", "#nd2-bI"].forEach((b) => gsap.set(b, { transformOrigin: "50% 4%" }));
      ${entraT("#n-t")}
      ${pop("#n-c", 0.2)}
      tl.fromTo("#n-s0", { opacity: 0, scale: 2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, ${r2(n * 0.28)});
      tl.to("#n-s0", { opacity: 0, duration: 0.1 }, ${r2(n * 0.4)});
      tl.to("#n-tira", { x: -1080, duration: 0.3, ease: "power3.inOut" }, ${r2(n * 0.4)});
      tl.fromTo("#n-s1", { opacity: 0, scale: 2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, ${r2(n * 0.62)});
      tl.to("#n-s1", { opacity: 0, duration: 0.1 }, ${r2(n * 0.75)});
      tl.to("#n-tira", { x: -2160, duration: 0.3, ease: "power3.inOut" }, ${r2(n * 0.75)});
      tl.fromTo("#n-g", { opacity: 0, scale: 0.4, transformOrigin: "10% 100%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, ${r2(a3)});
      tl.to("#nd2-bI", { rotation: 30, duration: 0.2 }, ${r2(a3)});
      tl.fromTo("#n-s2", { opacity: 0, scale: 2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, ${r2(a3 + V("d-no3"))});
      tl.to(["#n-g", "#n-s2"], { opacity: 0, duration: 0.15 }, ${r2(a2 - 0.1)});
      tl.fromTo("#n-g2", { opacity: 0, scale: 0.4, transformOrigin: "10% 100%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, ${r2(a2)});
      tl.to("#n-tira", { x: -1080, duration: 0.12, yoyo: true, repeat: 3, ease: "none" }, ${r2(a2 + 0.2)});
      // Contador según el tiempo de la escena (igual en cualquier cuadro que se renderice).
      const marcas = [${r2(n * 0.28)}, ${r2(n * 0.62)}, ${r2(a3 + V("d-no3"))}];
      tl.to({}, { duration: ${r2(fin)}, ease: "none", onUpdate: () => {
        const tt = tl.time();
        let v = marcas.filter((m) => tt >= m).length;
        if (tt >= ${r2(a2 + 0.2)}) v = Math.min(13, 3 + Math.floor(((tt - ${r2(a2 + 0.2)}) / 0.9) * 10));
        document.querySelector("#n-num").textContent = v;
      } }, 0);
      tl.to("#n-c", { scale: 1.15, transformOrigin: "50% 50%", duration: 0.15, yoyo: true, repeat: 1 }, ${r2(a2 + 1.1)});`,
  });
}

// 4 · Los que piden info: un dueño con el celular y 5 cartitas que salen volando.
{
  const n = V("info");
  const a = n + 0.2;
  const rubros = ["Dietética", "Veterinaria", "Gimnasio", "Estética", "Librería"];
  const cartas = rubros.map((r, i) => `<g id="i-k${i}" opacity="0"><g transform="translate(${130 + (i % 3) * 300} ${1000 + Math.floor(i / 3) * 190})"><rect x="0" y="0" width="260" height="150" rx="20" fill="#fff" ${L}/><path d="M0 10 L130 85 L260 10" fill="none" ${L4}/>${txt(130, 132, 30, r)}</g></g>`).join("");
  agrega("info", a + V("d-info") + 0.6, [["info", 0.15], ["d-info", a]], {
    svg: `
      ${piso(1560)}
      ${cartas}
      <g transform="translate(870 1560) scale(.8)"><g id="i-due">${persona("idu", { camisa: C.verde, pelo: "#B07A3A" })}</g></g>
      ${globo("i-g", 80, 640, 700, "¿Me mandás info?")}
    `,
    html: `${hud("hud", { dias: 29, locales: 0, meta: META })}${T("i-t", 250, `5 me pidieron <span class="acc">más info.</span>`, ";right:80px")}
      <span id="i-c" class="chip dato" style="left:80px;top:1660px;font-size:44px">MÁS INFO: 5</span>${marca}`,
    js: `
      ${entraT("#i-t")}
      ${rubros.map((_, i) => `tl.fromTo("#i-k${i}", { opacity: 0, y: 200, rotation: ${(i - 2) * 12}, transformOrigin: "50% 50%" }, { opacity: 1, y: 0, rotation: 0, duration: 0.3, ease: "back.out(1.8)" }, ${r2(0.4 + i * 0.18)});`).join("\n      ")}
      ${pop("#i-c", 1.4)}
      tl.fromTo("#i-g", { opacity: 0, scale: 0.4, transformOrigin: "80% 100%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, ${r2(a)});
      tl.fromTo("#i-due", { x: 300 }, { x: 0, duration: 0.4, ease: "back.out(1.4)" }, ${r2(a - 0.4)});`,
  });
}

// 5 · Los SÍ: tres locales reciben su sticker; el marcador sube de 0 a 3.
{
  const n = V("si");
  const a = n + 0.2;
  const locs = [
    ["Heladería Glaciar", C.niebla],
    ["Barbería Navaja", "#F2C9A0"],
    ["Café Teorema", C.verde],
  ];
  const fach = locs.map(([nombre, color], i) => `<g transform="translate(${30 + i * 345} 1460) scale(.75)"><g id="s-f${i}">${fachada("s-fc" + i, nombre, color, L)}</g></g>
    <g transform="translate(${135 + i * 345} 1180) scale(.28)"><g id="s-st${i}" opacity="0">${sticker("s-stc" + i, caritaPieza("s-stc" + i, -88))}</g></g>`).join("");
  agrega("si", a + V("d-si") + 0.9, [["si", 0.15], ["d-si", a]], {
    svg: `
      ${piso(1460)}
      ${fach}
      ${destello("s-d1", 140, 880, 1)}${destello("s-d2", 540, 840, 1.2)}${destello("s-d3", 940, 880, 1)}
      ${globo("s-g", 200, 560, 680, "¡Dale, dejame uno!")}
    `,
    html: `${hud("hud", { dias: 29, locales: 0, meta: META })}
      <span id="s-c" class="chip dato" style="left:80px;top:1620px;font-size:52px;background:${C.verde};border-color:#111">SÍ: <span id="s-num">0</span></span>${marca}`,
    js: `
      ${locs.map((_, i) => `tl.fromTo("#s-f${i}", { y: 900 }, { y: 0, duration: 0.45, ease: "back.out(1.4)" }, ${r2(0.3 + i * 0.6)});
      tl.fromTo("#s-st${i}", { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, ${r2(0.75 + i * 0.6)});`).join("\n      ")}
      ${pop("#s-c", 0.3)}
      tl.to({}, { duration: ${r2(a + V("d-si") + 0.9)}, ease: "none", onUpdate: () => {
        const tt = tl.time();
        document.querySelector("#s-num").textContent = [0.75, 1.35, 1.95].filter((m) => tt >= m).length;
      } }, 0);
      ${hudSube("hud", 0, 3, META, r2(0.8))}
      ["#s-d1", "#s-d2", "#s-d3"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.3, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 2.2 + i * 0.15));
      tl.fromTo("#s-g", { opacity: 0, scale: 0.4, transformOrigin: "20% 100%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, ${r2(a)});`,
  });
}

// 6 · La libreta: la cuenta del día con palitos.
const palitos = (n, x, y) => Array.from({ length: n }, (_, i) => {
  const g = Math.floor(i / 5), k = i % 5, gx = x + g * 120;
  return k < 4 ? `<path class="pal" d="M${gx + k * 22} ${y} l4 70" stroke="#111" stroke-width="7" stroke-linecap="round" opacity="0"/>` : `<path class="pal" d="M${gx - 10} ${y + 50} l100 -36" stroke="#111" stroke-width="7" stroke-linecap="round" opacity="0"/>`;
}).join("");
agrega("libreta", V("libreta") + 0.6, [["libreta", 0.15]], {
  fondo: C.madera,
  svg: `
    <g transform="translate(540 1050) rotate(-3)"><rect x="-420" y="-520" width="840" height="1000" rx="20" fill="#FFFDF4" ${L}/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M-380 ${-380 + i * 110} H380" stroke="${C.niebla}" stroke-width="4"/>`).join("")}
      <path d="M-300 -520 V480" stroke="#E9A48C" stroke-width="4"/>
      ${txt(-280, -420, 54, "Av. Gauss · día 1", { anchor: "start", peso: 800 })}
      ${txt(-280, -250, 56, "NO", { anchor: "start", color: "#D9534F" })}${palitos(13, -110, -305)}
      ${txt(-280, -10, 56, "INFO", { anchor: "start" })}${palitos(5, -60, -65)}
      ${txt(-280, 230, 56, "SÍ", { anchor: "start", color: "#2E7D4F" })}${palitos(3, -110, 175)}
      <g id="l-tot" opacity="0">${txt(0, 420, 64, "20 puertas", { ignorar: false })}</g>
    </g>
  `,
  html: `${hud("hud", { dias: 29, locales: 3, meta: META })}${marca}`,
  js: `
    tl.fromTo(".pal", { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.09 }, 0.4);
    tl.fromTo("#l-tot", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 2.6);`,
});

// 7 · Lo que aprendí: la lamparita y la objeción más repetida.
agrega("aprendi", V("aprendi") + 0.5, [["aprendi", 0.15]], {
  svg: `
    ${piso(1560)}
    <g transform="translate(320 1560) scale(.95)"><g id="a-her">${hernan("aher")}</g></g>
    <g id="a-luz" opacity="0"><circle cx="320" cy="820" r="60" fill="#FFD54A" ${L}/><rect x="296" y="876" width="48" height="36" fill="#999" ${L4}/>${destello("a-d", 420, 760, 0.6)}</g>
  `,
  html: `${hud("hud", { dias: 29, locales: 3, meta: META })}${T("a-t", 250, `Lo que <span class="acc">aprendí.</span>`)}
    <div id="a-c1" style="position:absolute;left:560px;right:60px;top:820px;background:#fff;border:5px solid #111;border-radius:28px;padding:24px;font-family:Montserrat;font-size:38px;font-weight:700;line-height:1.25">El "no" más repetido:<br><span class="acc">"ya tengo un QR"</span></div>
    <div id="a-c2" style="position:absolute;left:560px;right:60px;top:1130px;background:#111;color:#fff;border-radius:28px;padding:24px;font-family:Montserrat;font-size:38px;font-weight:700;line-height:1.25">Pero ninguno sabía cuánta gente lo usa.</div>${marca}`,
  js: `
    ${entraT("#a-t")}
    tl.fromTo("#a-luz", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, 0.5);
    tl.fromTo("#a-c1", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 1.0);
    tl.fromTo("#a-c2", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 3.0);`,
});

// 8 · Dilema: VUELVO (a los 5 de "más info") o NUEVA (otra avenida).
agrega("dilema", V("dilema") + 0.4, [["dilema", 0.15]], {
  svg: `
    <rect x="0" y="0" width="540" height="1920" fill="${C.verde}"/><rect x="540" y="0" width="540" height="1920" fill="${C.niebla}"/><path d="M540 0 V1920" ${L}/>
    <g id="d-izq">${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${80 + (i % 2) * 200} ${700 + Math.floor(i / 2) * 200})"><rect x="0" y="0" width="170" height="110" rx="16" fill="#fff" ${L4}/><path d="M0 8 L85 60 L170 8" fill="none" ${L4}/></g>`).join("")}</g>
    <g id="d-der"><rect x="760" y="640" width="70" height="900" fill="#fff" ${L}/><path d="M795 660 V1520" stroke="#FFD54A" stroke-width="8" stroke-dasharray="26 20"/>${txt(795, 600, 40, "¿?")}</g>
  `,
  html: `${hud("hud", { dias: 29, locales: 3, meta: META })}
    <div id="d-a" style="position:absolute;left:30px;width:480px;top:280px;text-align:center;font-family:Montserrat;font-weight:800;font-size:96px">VUELVO</div>
    <div id="d-a2" style="position:absolute;left:30px;width:480px;top:400px;text-align:center;font-family:Montserrat;font-weight:600;font-size:34px">a los 5 de "más info"</div>
    <div id="d-b" style="position:absolute;left:570px;width:480px;top:280px;text-align:center;font-family:Montserrat;font-weight:800;font-size:96px">NUEVA</div>
    <div id="d-b2" style="position:absolute;left:570px;width:480px;top:400px;text-align:center;font-family:Montserrat;font-weight:600;font-size:34px">otra avenida</div>
    <div id="d-vs" style="position:absolute;left:470px;top:880px;width:140px;height:140px;border-radius:50%;background:#111;color:#fff;border:6px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-weight:800;font-size:56px">VS</div>${marca}`,
  js: `
    tl.fromTo("#d-izq", { x: -600 }, { x: 0, duration: 0.45, ease: "power3.out" }, 0.05);
    tl.fromTo("#d-der", { x: 600 }, { x: 0, duration: 0.45, ease: "power3.out" }, 0.05);
    ${pop("#d-a", 0.4)}${pop("#d-a2", 0.6)}${pop("#d-b", 2.3)}${pop("#d-b2", 2.5)}
    tl.fromTo("#d-vs", { scale: 0, rotation: -90, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, 1.5);`,
});

// 9 · CTA: comentá una palabra. Marcador 3/50.
agrega("cta", V("cta") + 1.5, [["cta", 0.15]], {
  fondo: "#E4E7EA",
  svg: `
    ${piso(1560, "#C9CDD2")}
    <g transform="translate(540 1600) scale(.9)"><g id="z-her">${hernan("zher")}</g></g>
    <g transform="translate(820 1200) scale(.4)"><g id="z-st">${sticker("z-stc", caritaPieza("z-stc", -88))}</g></g>
  `,
  html: `${hud("hud", { dias: 29, locales: 3, meta: META })}
    <div id="z-card" style="position:absolute;left:60px;right:60px;top:260px;background:#111;color:#fff;border-radius:36px;padding:34px 40px;font-family:Montserrat">
      <p style="margin:0;font-size:44px;font-weight:700">Comentá UNA palabra:</p>
      <div style="display:flex;gap:20px;margin-top:20px"><span id="z-o1" style="flex:1;text-align:center;background:${C.verde};color:#111;border-radius:22px;padding:18px 0;font-size:64px;font-weight:800">VUELVO</span><span id="z-o2" style="flex:1;text-align:center;background:${C.niebla};color:#111;border-radius:22px;padding:18px 0;font-size:64px;font-weight:800">NUEVA</span></div>
    </div>
    <span id="z-ep" class="chip" style="left:80px;top:1680px">Día 2 de 30 · 3 de 50</span>${marca}`,
  js: `
    gsap.set("#zher-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#z-card", { y: -200, opacity: 0, rotation: -3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, 0.05);
    ${pop("#z-o1", 0.5)}${pop("#z-o2", 0.7)}
    tl.to(["#z-o1", "#z-o2"], { scale: 1.06, duration: 0.25, yoyo: true, repeat: 3, stagger: 0.25, ease: "sine.inOut" }, 1.0);
    tl.fromTo("#z-st", { y: 600 }, { y: 0, duration: 0.45, ease: "back.out(1.8)" }, 1.4);
    tl.to("#zher-bD", { rotation: -100, duration: 0.3, ease: "back.out(2)" }, 1.6);
    tl.to("#zher-feliz", { opacity: 0, duration: 0.08 }, 2.6); tl.to("#zher-serio", { opacity: 1, duration: 0.08 }, 2.6);
    ${pop("#z-ep", 2.8)}`,
});

const ORDEN = ["eligieron", "ruta", "nos", "info", "si", "libreta", "aprendi", "dilema", "cta"];
for (const id of ORDEN) writeFileSync(join(AQUI, "compositions", `${id}.html`), escenas[id]);

let t = 0;
let pista = 20;
const divs = [];
const auds = [];
ORDEN.forEach((id, i) => {
  divs.push(`      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${t.toFixed(2)}" data-duration="${DUR[id]}" data-track-index="${i + 1}" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`);
  for (const [archivo, off] of clips[id]) {
    auds.push(`      <audio id="voz-${archivo}" data-start="${(t + off).toFixed(2)}" data-duration="${VOZ[archivo]}" data-track-index="${pista++}" data-volume="1" src="assets/voz/${archivo}.wav"></audio>`);
  }
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
