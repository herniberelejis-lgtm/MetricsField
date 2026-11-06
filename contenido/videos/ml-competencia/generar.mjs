// Video animado "El de enfrente" para Mercado Libre: dos cafés iguales en la
// misma cuadra, la gente entra al otro porque antes mira Google. Mismo estilo
// que ml-cartoon (dibujos de ../dibujos.mjs).
//
//   node contenido/videos/ml-competencia/generar.mjs
//
// Lee las duraciones de assets/voz/duraciones.json y escribe compositions/*.html
// e index.html. Reglas: no promete más clientes ni más reseñas; la comparación
// con la competencia es la del panel (competidores que elige el comercio); todo
// número lleva "Datos de ejemplo".

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, L, persona, sticker, tarjeta, caritaPieza, celu, ondas, destello, escena } from "../dibujos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const VOZ = JSON.parse(readFileSync(join(AQUI, "assets/voz/duraciones.json"), "utf8"));
const ORDEN = ["gancho", "cruzan", "porque", "fichas", "contentos", "piezas", "panel", "cierre"];
// Cada escena dura lo que su voz más un respiro; el cierre se queda un poco más en pantalla.
const DUR = Object.fromEntries(ORDEN.map((id) => [id, Math.round((VOZ[id] + (id === "cierre" ? 1.3 : 0.45)) * 100) / 100]));

const calle = `<rect x="0" y="1500" width="1080" height="420" fill="${C.gris}"/><path d="M0 1500 H1080" ${L}/>
  <path d="M60 1700 h120 M300 1700 h120 M540 1700 h120 M780 1700 h120" stroke="#fff" stroke-width="14" stroke-linecap="round"/>`;

/** Frente de un local: toldo a rayas, cartel, vidriera y puerta. Origen abajo a la izquierda, 440 de ancho. */
function local(id, nombre, color, { puertaAbierta = false } = {}) {
  const rayas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 55}" y="-640" width="55" height="90" fill="${i % 2 ? "#fff" : color}"/>`).join("");
  return `
  <g id="${id}">
    <rect x="10" y="-560" width="420" height="560" fill="#fff" ${L}/>
    <g>${rayas}</g><rect x="0" y="-640" width="440" height="90" fill="none" ${L}/>
    <path d="M0 -550 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0" fill="${color}" ${L}/>
    <rect x="10" y="-740" width="420" height="90" rx="16" fill="#111" ${L}/>
    <text x="220" y="-680" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="${nombre.length > 10 ? 32 : 40}" fill="#fff">${nombre}</text>
    <rect x="40" y="-430" width="200" height="200" fill="${C.niebla}" ${L}/>
    <path d="M60 -260 h160" ${L}/><circle cx="110" cy="-300" r="22" fill="#fff" ${L}/><path d="M150 -280 h40 v-30 h-40 z" fill="#fff" ${L}/>
    <g id="${id}-puerta"><rect x="280" y="-360" width="120" height="360" fill="${puertaAbierta ? "#111" : C.verde}" ${L}/><circle cx="300" cy="-180" r="9" fill="#111"/></g>
  </g>`;
}

const escenas = {};

// 1 · Gancho: los dos locales caen uno al lado del otro. Iguales.
escenas.gancho = escena("gancho", DUR.gancho, {
  svg: `
    ${calle}
    <g transform="translate(70 1500) scale(.95)">${local("g-tuyo", "TU CAFÉ", C.verde)}</g>
    <g transform="translate(590 1500) scale(.95)">${local("g-otro", "EL DE ENFRENTE", C.niebla)}</g>
    <text id="g-igual" x="540" y="1180" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="150" fill="#111" opacity="0">=</text>
  `,
  html: `
    <h1 id="g-t" class="tit" style="top:170px">Dos cafés.<br><span class="acc">Misma cuadra.</span></h1>
    <span id="g-c1" class="chip" style="left:80px;top:1580px">Mismo café</span>
    <span id="g-c2" class="chip dato" style="left:600px;top:1580px">Misma onda</span>`,
  js: `
    tl.fromTo("#g-t", { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.6);
    tl.fromTo("#g-tuyo", { y: -1600 }, { y: 0, duration: 0.6, ease: "bounce.out" }, 0.1);
    tl.fromTo("#g-otro", { y: -1600 }, { y: 0, duration: 0.6, ease: "bounce.out" }, 0.35);
    tl.fromTo("#g-igual", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, 1.2);
    tl.fromTo("#g-c1", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, 1.7);
    tl.fromTo("#g-c2", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, 2.3);`,
});

// 2 · Cruzan: alguien camina, duda en tu puerta y sigue de largo al de enfrente.
escenas.cruzan = escena("cruzan", DUR.cruzan, {
  svg: `
    ${calle}
    <g transform="translate(70 1500) scale(.95)">${local("c-tuyo", "TU CAFÉ", C.verde)}</g>
    <g transform="translate(590 1500) scale(.95)">${local("c-otro", "EL DE ENFRENTE", C.niebla, { puertaAbierta: true })}</g>
    <g transform="translate(0 1560) scale(.62)"><g id="c-cam">${persona("cam", { camisa: "#FFD54A" })}</g></g>
    <g transform="translate(1000 1560) scale(.5)"><g id="c-fila1">${persona("fil1", { camisa: C.verde })}</g></g>
    <g transform="translate(1080 1560) scale(.5)"><g id="c-fila2">${persona("fil2", { camisa: "#fff", pelo: "#B07A3A" })}</g></g>
    <g id="c-gota" opacity="0"><path d="M330 870 q-22 36 0 54 q22 -18 0 -54 Z" fill="${C.niebla}" ${L}/></g>
  `,
  html: `<h1 id="c-t" class="tit" style="top:170px">Pero la gente entra<br><span class="acc">al de enfrente.</span></h1>`,
  js: `
    gsap.set("#cam-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#c-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#c-cam", { x: -200 }, { x: 420, duration: 0.7, ease: "power1.out" }, 0.05);
    tl.to("#cam-cuerpo", { y: -16, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.05);
    tl.to("#cam-cabeza", { rotation: -14, duration: 0.2, yoyo: true, repeat: 1 }, 0.8);
    tl.to("#c-cam", { x: 1260, duration: 0.8, ease: "power1.in" }, 1.25);
    tl.to("#cam-cuerpo", { y: -16, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, 1.25);
    tl.to("#c-cam", { opacity: 0, duration: 0.15 }, 1.9);
    tl.fromTo(["#c-fila1", "#c-fila2"], { x: 300 }, { x: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.4)" }, 0.6);
    tl.fromTo("#c-gota", { opacity: 0, y: 0 }, { opacity: 1, y: 30, duration: 0.5 }, 1.5);`,
});

// 3 · Por qué: antes de entrar, mira el celular. Dos lugares, misma nota, distinta cantidad de reseñas.
const fila = (y, nombre, nota, n, id, dato) => `
    <g id="${id}"><rect x="-120" y="${y}" width="240" height="120" rx="20" fill="${dato ? C.niebla : C.papel}" ${L.replace('stroke-width="6"', 'stroke-width="4"')}/>
    <text data-layout-ignore x="-104" y="${y + 44}" font-family="Montserrat" font-weight="800" font-size="26" fill="#111">${nombre}</text>
    <text data-layout-ignore x="-104" y="${y + 92}" font-family="Montserrat" font-weight="700" font-size="28" fill="#111">★ ${nota} · ${n}</text></g>`;
escenas.porque = escena("porque", DUR.porque, {
  svg: `
    <rect x="0" y="1600" width="1080" height="320" fill="${C.gris}"/><path d="M0 1600 H1080" ${L}/>
    <g transform="translate(300 1600) scale(1.05)"><g id="p-cam">${persona("pcam", { camisa: "#FFD54A" })}</g></g>
    <g transform="translate(780 1050) rotate(6)"><g id="p-tel">${celu("ptel", fila(-200, "Tu café", "4,7", "(18)", "p-f1", false) + fila(-50, "El de enfrente", "4,7", "(312)", "p-f2", true) + `<text data-layout-ignore x="0" y="150" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="36" fill="#111">Cafés cerca</text>`)}</g></g>
    <g id="p-preg" opacity="0"><circle cx="420" cy="760" r="60" fill="#fff" ${L}/><text x="420" y="790" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="80" fill="#111">?</text></g>
  `,
  html: `
    <h1 id="p-t" class="tit" style="top:170px">Antes de entrar,<br>todos miran <span class="acc">Google.</span></h1>
    <span id="p-etq" class="etq" style="left:80px;top:1700px">Datos de ejemplo</span>`,
  js: `
    gsap.set("#pcam-cabeza", { transformOrigin: "50% 100%" }); gsap.set("#pcam-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#p-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#p-tel", { y: 900, rotation: 30, transformOrigin: "50% 50%" }, { y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.4)" }, 0.15);
    tl.to("#pcam-bD", { rotation: -55, duration: 0.3, ease: "back.out(2)" }, 0.2);
    tl.to("#pcam-cabeza", { rotation: 12, duration: 0.3 }, 0.4);
    tl.fromTo("#p-f1", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25 }, 0.8);
    tl.fromTo("#p-f2", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25 }, 1.1);
    tl.fromTo("#p-f2", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.6);
    tl.fromTo("#p-preg", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, 1.4);
    tl.fromTo("#p-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9);`,
});

// 4 · Fichas: los números lado a lado. 18 contra 312.
const ficha = (id, nombre, num, ultima, dato) => `
    <div id="${id}" style="position:absolute;left:70px;right:70px;background:${dato ? C.niebla : "#fff"};border:5px solid #111;border-radius:32px;padding:30px 40px">
      <p style="font-size:38px;font-weight:700;margin:0">${nombre}</p>
      <p style="display:flex;align-items:baseline;gap:22px;margin:8px 0 0"><b style="font-size:110px;font-weight:800;letter-spacing:-0.04em;line-height:1">4,7</b><span style="font-size:52px">★</span></p>
      <p style="font-size:38px;margin:10px 0 0"><b id="${id}-n" style="font-weight:800">${num}</b> reseñas · la última, ${ultima}</p>
    </div>`;
escenas.fichas = escena("fichas", DUR.fichas, {
  svg: `
    <g transform="translate(900 1760) scale(.6)"><g id="f-st">${sticker("f-stc", caritaPieza("f-stc", -88))}</g></g>
    <g id="f-gota" opacity="0"><path d="M960 1580 q-20 32 0 50 q20 -16 0 -50 Z" fill="${C.niebla}" ${L}/></g>
  `,
  html: `
    <h1 id="f-t" class="tit" style="top:170px">El de enfrente tiene <span class="acc">cientos</span>… y vos, 18.</h1>
    ${ficha("f-a", "Tu café", "18", "hace 3 meses", false).replace('position:absolute;', 'position:absolute;top:560px;')}
    ${ficha("f-b", "El de enfrente", "0", "hoy", true).replace('position:absolute;', 'position:absolute;top:980px;')}
    <span id="f-etq" class="etq" style="left:70px;top:1420px">Datos de ejemplo</span>`,
  js: `
    tl.fromTo("#f-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#f-a", { opacity: 0, x: -200, rotation: -3 }, { opacity: 1, x: 0, rotation: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.2);
    tl.fromTo("#f-b", { opacity: 0, x: 200, rotation: 3 }, { opacity: 1, x: 0, rotation: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.5);
    const k = { n: 0 };
    tl.fromTo(k, { n: 0 }, { n: 312, duration: 1.1, ease: "power2.out", onUpdate: () => { document.querySelector("#f-b-n").textContent = Math.round(k.n); } }, 0.8);
    tl.fromTo("#f-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.6);
    tl.fromTo("#f-st", { y: 900 }, { y: 0, duration: 0.45, ease: "back.out(1.6)" }, 2.0);
    tl.fromTo("#f-gota", { opacity: 0, y: 0 }, { opacity: 1, y: 26, duration: 0.45 }, 2.5);
    tl.to("#f-stc-cara", { y: 6, duration: 0.3 }, 2.5);`,
});

// 5 · Contentos: dos clientes felices con su café… se van, y nadie les pidió nada.
const corazon = (id, x, y) => `<path id="${id}" opacity="0" transform="translate(${x} ${y})" d="M0 20 C-40 -10 -30 -50 0 -30 C30 -50 40 -10 0 20 Z" fill="#E9A48C" ${L}/>`;
escenas.contentos = escena("contentos", DUR.contentos, {
  svg: `
    <rect x="0" y="1460" width="1080" height="460" fill="${C.madera}"/><path d="M0 1460 H1080" ${L}/>
    <g transform="translate(330 1500) scale(.9)"><g id="t-a">${persona("ca", { camisa: C.niebla })}</g></g>
    <g transform="translate(750 1500) scale(.9)"><g id="t-b">${persona("cb", { camisa: C.verde, pelo: "#B07A3A" })}</g></g>
    <rect x="220" y="1180" width="640" height="40" rx="12" fill="#fff" ${L}/><rect x="520" y="1220" width="40" height="280" fill="#fff" ${L}/>
    <g transform="translate(470 1130)"><path d="M-40 0 h80 l-10 50 h-60 z" fill="#fff" ${L}/></g>
    <g transform="translate(620 1130)"><path d="M-40 0 h80 l-10 50 h-60 z" fill="#fff" ${L}/></g>
    ${corazon("h1", 330, 760)}${corazon("h2", 760, 720)}${corazon("h3", 560, 640)}
  `,
  html: `
    <h1 id="ct-t" class="tit" style="top:170px">Tus clientes también salen <span class="acc">contentos.</span></h1>
    <span id="ct-c" class="chip negro" style="left:80px;top:1620px">Nadie les pidió la reseña</span>
    <span id="ct-n" class="chip" style="left:80px;top:1730px">Reseñas: 18</span>`,
  js: `
    gsap.set(["#ca-bD", "#cb-bI"], { transformOrigin: "50% 4%" });
    tl.fromTo("#ct-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.to("#ca-bD", { rotation: -40, duration: 0.25, yoyo: true, repeat: 3 }, 0.3);
    tl.to("#cb-bI", { rotation: 40, duration: 0.25, yoyo: true, repeat: 3 }, 0.5);
    ["#h1", "#h2", "#h3"].forEach((h, i) => tl.fromTo(h, { opacity: 0, y: 40, scale: 0.5 }, { opacity: 1, y: -40, scale: 1.2, duration: 0.6, ease: "power2.out" }, 0.4 + i * 0.25));
    tl.to(["#h1", "#h2", "#h3"], { opacity: 0, duration: 0.3 }, 1.8);
    tl.to("#t-a", { x: 900, duration: 0.9, ease: "power1.in" }, 2.0);
    tl.to("#t-b", { x: 700, duration: 0.8, ease: "power1.in" }, 2.15);
    tl.to(["#ca-cuerpo", "#cb-cuerpo"], { y: -14, duration: 0.12, yoyo: true, repeat: 7, ease: "sine.inOut" }, 2.0);
    tl.fromTo("#ct-c", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 2.4);
    tl.fromTo("#ct-n", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, 2.8);
    tl.to("#ct-n", { x: -12, duration: 0.05, yoyo: true, repeat: 7, ease: "none" }, 3.2);`,
});

// 6 · Piezas: sticker en la mesa, tarjeta del mozo, el celu se apoya y se abre la página.
escenas.piezas = escena("piezas", DUR.piezas, {
  fondo: C.madera,
  svg: `
    <g transform="translate(330 900) scale(1.3)"><g id="z-st">${sticker("z-stc")}</g></g>
    ${ondas("z", 330, 900)}
    <g transform="translate(300 1900) scale(.75)"><g id="z-mozo">${persona("zm", { camisa: "#fff", delantal: true })}</g></g>
    <g transform="translate(700 1380)"><g id="z-tj">${tarjeta("z-tjc")}</g></g>
    <g transform="translate(640 700)"><g id="z-celu">${celu("z-tel", `<rect x="-110" y="-190" width="220" height="120" rx="20" fill="${C.niebla}"/><text data-layout-ignore x="0" y="-118" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="#111">★</text><rect x="-110" y="-50" width="220" height="24" rx="12" fill="${C.gris}"/><rect x="-110" y="-10" width="160" height="24" rx="12" fill="${C.gris}"/>`)}</g></g>
  `,
  html: `
    <div id="z-noti" style="position:absolute;left:60px;right:60px;top:110px;background:#fff;border:5px solid #111;border-radius:40px;padding:28px 34px;display:flex;gap:26px;align-items:center">
      <span style="width:84px;height:84px;border-radius:22px;background:${C.niebla};border:4px solid #111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:44px">★</span>
      <span><b style="display:block;font-size:36px;font-weight:700">Tu página de reseñas de Google</b><small style="display:block;font-size:30px;color:#5e5e5e;margin-top:4px">Tocá para abrir</small></span></div>
    <span id="z-c1" class="chip negro" style="left:80px;top:1130px">Sticker en la mesa</span>
    <span id="z-c2" class="chip dato" style="left:560px;top:1540px">Tarjeta del mozo</span>
    <h1 id="z-t" class="tit" style="top:1640px;left:480px;right:60px;font-size:72px">Un toque <span class="acc">o el QR.</span></h1>`,
  js: `
    gsap.set("#zm-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#z-st", { scale: 0, rotation: -20, transformOrigin: "50% 50%" }, { scale: 1, rotation: -4, duration: 0.45, ease: "back.out(1.8)" }, 0.05);
    tl.fromTo("#z-c1", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25 }, 0.35);
    tl.fromTo("#z-mozo", { x: -800 }, { x: 0, duration: 0.45, ease: "back.out(1.2)" }, 0.9);
    tl.fromTo("#z-tj", { x: 800, rotation: 20, transformOrigin: "50% 50%" }, { x: 0, rotation: -8, duration: 0.45, ease: "back.out(1.3)" }, 1.0);
    tl.to("#zm-bD", { rotation: -60, duration: 0.3, ease: "back.out(2)" }, 1.3);
    tl.fromTo("#z-c2", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.4);
    tl.fromTo("#z-celu", { x: 500, y: -900, rotation: -40, transformOrigin: "50% 50%" }, { x: -310, y: 150, rotation: -18, duration: 0.55, ease: "power3.out" }, 2.4);
    [0, 1, 2].forEach((i) => tl.fromTo("#z-o" + i, { opacity: 0.95, attr: { r: 120 } }, { opacity: 0, attr: { r: 420 }, duration: 0.8, ease: "power2.out" }, 2.95 + i * 0.22));
    tl.fromTo("#z-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }, 3.3);
    tl.fromTo("#z-t", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 3.0);`,
});

// 7 · Panel: el dueño ve sus usos y cómo está contra los competidores que eligió.
const filaComp = (id, nombre, n, dato) => `<div id="${id}" style="display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid #eaeaea;padding:16px 0;font-size:32px${dato ? `;background:${C.niebla};margin:0 -16px;padding:16px` : ""}"><span style="font-weight:${dato ? 800 : 600}">${nombre}</span><span><b style="font-weight:800">★ 4,7</b> · ${n}</span></div>`;
escenas.panel = escena("panel", DUR.panel, {
  svg: `
    <rect x="0" y="1560" width="1080" height="360" fill="${C.gris}"/><path d="M0 1560 H1080" ${L}/>
    <g transform="translate(870 1880) scale(.82)"><g id="pn-due">${persona("due", { camisa: C.verde, bigote: true, mano: `<g id="due-pulgar" opacity="0"><rect x="96" y="-300" width="22" height="50" rx="11" fill="${C.piel}" ${L}/></g>` })}</g></g>
    ${destello("pn-d1", 990, 1140, 0.9)}
  `,
  html: `
    <h1 id="pn-t" class="tit" style="top:150px">Y ves cómo estás contra <span class="acc">tu competencia.</span></h1>
    <div id="pn-panel" style="position:absolute;left:60px;width:740px;top:520px;background:#fff;border:5px solid #111;border-radius:36px;padding:34px">
      <p style="display:flex;align-items:center;gap:14px;font-size:28px;font-weight:700;margin:0 0 20px"><img src="assets/isotipo.svg" alt="" style="width:40px;height:40px">MetricsField Reviews</p>
      <div style="background:${C.papel};border-radius:20px;padding:18px;margin-bottom:22px"><small style="display:block;font-size:28px;font-weight:600">Usos de tus piezas este mes</small><b id="pn-k1" style="display:block;font-size:68px;font-weight:800">0</b></div>
      <p style="font-size:30px;font-weight:800;margin:0 0 6px">Competidores que elegiste</p>
      ${filaComp("pn-r1", "El de enfrente", "312")}
      ${filaComp("pn-r2", "Tu café", "18", true)}
      ${filaComp("pn-r3", "Café de la plaza", "96")}
    </div>
    <span id="pn-etq" class="etq" style="left:60px;top:1470px">Datos de ejemplo</span>`,
  js: `
    gsap.set("#due-bD", { transformOrigin: "50% 4%" }); gsap.set("#due-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#pn-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#pn-panel", { opacity: 0, y: 80, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.15);
    tl.fromTo("#pn-due", { x: 400 }, { x: 0, duration: 0.5, ease: "back.out(1.3)" }, 0.2);
    tl.fromTo("#pn-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
    const k = { a: 0 };
    tl.fromTo(k, { a: 0 }, { a: 148, duration: 1.2, ease: "power2.out", onUpdate: () => { document.querySelector("#pn-k1").textContent = Math.round(k.a); } }, 0.6);
    tl.to("#due-cabeza", { rotation: -10, duration: 0.3, ease: "sine.inOut" }, 0.8);
    ["#pn-r1", "#pn-r2", "#pn-r3"].forEach((r, i) => tl.fromTo(r, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, 2.0 + i * 0.25));
    tl.fromTo("#due-ojos", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.35, duration: 0.2, ease: "back.out(3)" }, 2.9);
    tl.to("#due-cabeza", { rotation: 4, duration: 0.3 }, 3.8);
    tl.fromTo("#due-bD", { rotation: 0 }, { rotation: -150, duration: 0.35, ease: "back.out(2)" }, 4.1);
    tl.to("#due-pulgar", { opacity: 1, duration: 0.05 }, 4.2);
    tl.fromTo("#pn-d1", { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, ease: "back.out(2)" }, 4.3);`,
});

// 8 · Cierre: tu café, con el sticker y la tarjeta saludando en la puerta.
escenas.cierre = escena("cierre", DUR.cierre, {
  svg: `
    ${calle}
    <g transform="translate(320 1500)"><g id="ci-loc">${local("ci-tuyo", "TU CAFÉ", C.verde)}</g></g>
    <g transform="translate(200 1380) scale(.55)"><g id="ci-st">${sticker("ci-stc", caritaPieza("ci-stc", -88))}</g></g>
    <g transform="translate(890 1400) scale(.6)"><g id="ci-tj">${tarjeta("ci-tjc", caritaPieza("ci-tjc", -66))}</g></g>
    ${destello("ci-d1", 540, 700, 1.1)}${destello("ci-d2", 180, 900, 0.8)}${destello("ci-d3", 920, 880, 0.9)}
  `,
  html: `
    <h1 id="ci-t" class="tit" style="top:170px">Que te elijan por lo que <span class="acc">hacés bien.</span></h1>
    <span id="ci-ch" class="chip dato" style="left:80px;top:1560px">Incluye el panel MetricsField Reviews</span>
    <div id="ci-cta" style="position:absolute;left:80px;right:80px;top:1670px;background:#111;color:#fff;border-radius:36px;padding:34px 44px;font-weight:800;font-size:88px;letter-spacing:-0.035em">Llevá el tuyo.</div>`,
  js: `
    tl.fromTo("#ci-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#ci-loc", { y: -1600 }, { y: 0, duration: 0.6, ease: "bounce.out" }, 0.1);
    tl.fromTo("#ci-st", { y: 1400 }, { y: 0, duration: 0.45, ease: "back.out(1.8)" }, 0.6);
    tl.fromTo("#ci-tj", { y: 1400 }, { y: 0, duration: 0.45, ease: "back.out(1.8)" }, 0.75);
    tl.to("#ci-st", { y: -50, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.2);
    tl.to("#ci-tj", { y: -50, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.45);
    ["#ci-d1", "#ci-d2", "#ci-d3"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 1.0 + i * 0.2));
    tl.fromTo("#ci-ch", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.4);
    tl.fromTo("#ci-cta", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }, 2.0);
    tl.to("#ci-cta", { scale: 1.04, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 2.6);`,
});

for (const [id, html] of Object.entries(escenas)) writeFileSync(join(AQUI, "compositions", `${id}.html`), html);

// index.html con las escenas encadenadas y la voz de cada una.
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
