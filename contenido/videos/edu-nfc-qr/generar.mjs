// Reel educativo "NFC + QR dinámico": qué es la pieza, cómo funciona y cómo se
// usa. Mismo estilo de dibujo animado que ml-cartoon (../dibujos.mjs).
//
//   node contenido/videos/edu-nfc-qr/generar.mjs
//
// Lee assets/voz/duraciones.json y escribe compositions/*.html e index.html.
// El paso a paso es el del producto en main: el chip viene vacío; se escanea
// el QR para activar (negocio + PIN) y se graba el chip una vez con NFC Tools
// pegando el link de la pieza (components/tap/ActivarCartel.tsx y GrabarChip.tsx).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, L, persona, sticker, tarjeta, caritaPieza, celu, ondas, destello, escena } from "../dibujos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const VOZ = JSON.parse(readFileSync(join(AQUI, "assets/voz/duraciones.json"), "utf8"));
const ORDEN = ["gancho", "problema", "dos", "nfc", "qr", "dinamico", "paso1", "paso2", "paso3", "aviso", "cta"];
const DUR = Object.fromEntries(ORDEN.map((id) => [id, Math.round((VOZ[id] + (id === "cta" ? 1.4 : id === "aviso" ? 1.0 : 0.4)) * 100) / 100]));

const L4 = L.replace('stroke-width="6"', 'stroke-width="4"');
const txt = (x, y, s, t, { peso = 800, color = "#111", anchor = "middle", ignorar = true } = {}) =>
  `<text ${ignorar ? "data-layout-ignore " : ""}x="${x}" y="${y}" text-anchor="${anchor}" font-family="Montserrat" font-weight="${peso}" font-size="${s}" fill="${color}">${t}</text>`;
const numero = (id, n, x = 940, y = 1700) =>
  `<g id="${id}"><circle cx="${x}" cy="${y}" r="90" fill="${C.niebla}" ${L}/>${txt(x, y + 40, 120, n, { ignorar: false })}</g>`;
const notiHtml = (id, top = 110) => `
    <div id="${id}" style="position:absolute;left:60px;right:60px;top:${top}px;background:#fff;border:5px solid #111;border-radius:40px;padding:28px 34px;display:flex;gap:26px;align-items:center">
      <span style="width:84px;height:84px;border-radius:22px;background:${C.niebla};border:4px solid #111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:44px">★</span>
      <span><b style="display:block;font-size:36px;font-weight:700">Tu página de reseñas de Google</b><small style="display:block;font-size:30px;color:#5e5e5e;margin-top:4px">Tocá para abrir</small></span></div>`;
const pantallaResena = `<rect x="-110" y="-190" width="220" height="120" rx="20" fill="${C.niebla}"/>${txt(0, -118, 40, "★")}<rect x="-110" y="-50" width="220" height="24" rx="12" fill="${C.gris}"/><rect x="-110" y="-10" width="160" height="24" rx="12" fill="${C.gris}"/>`;
const piso = (y = 1560, color = C.gris) => `<rect x="0" y="${y}" width="1080" height="${1920 - y}" fill="${color}"/><path d="M0 ${y} H1080" ${L}/>`;
const T = (id, top, html, extra = "") => `<h1 id="${id}" class="tit" style="top:${top}px${extra}">${html}</h1>`;
const entraT = (sel, t = 0) => `tl.fromTo("${sel}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${t});`;
const pop = (sel, t) => `tl.fromTo("${sel}", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});`;

const escenas = {};

// 1 · Gancho: el cliente se va contento; el sticker brilla en primer plano.
escenas.gancho = escena("gancho", DUR.gancho, {
  svg: `
    ${piso(1380)}
    <g id="g-puerta"><rect x="760" y="640" width="250" height="740" fill="${C.verde}" ${L}/><circle cx="790" cy="1020" r="12" fill="#111"/><rect x="790" y="690" width="190" height="230" fill="#fff" ${L}/></g>
    <g transform="translate(560 1400)"><g id="g-cli">${persona("cli")}</g></g>
    <g id="g-chau" opacity="0"><path d="M520 600 q-20 -70 60 -80 q30 -50 90 -20 q60 -30 90 30 q60 10 40 70 Z" fill="#fff" ${L}/>${txt(640, 590, 56, "¡Chau!", { ignorar: false })}</g>
    <g transform="translate(260 1560) scale(.9)"><g id="g-st">${sticker("g-stc", caritaPieza("g-stc", -88))}</g></g>
    ${destello("g-d1", 120, 1340, 0.9)}${destello("g-d2", 420, 1330, 0.7)}
  `,
  html: `${T("g-t", 170, `¿Tu cliente te deja la reseña <span class="acc">antes de irse?</span>`)}`,
  js: `
    gsap.set("#cli-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#g-t", { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.4);
    tl.fromTo("#cli-bD", { rotation: 0 }, { rotation: -150, duration: 0.3, ease: "back.out(2)" }, 0.2);
    tl.to("#cli-bD", { rotation: -120, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.5);
    ${pop("#g-chau", 0.3)}
    tl.to("#g-chau", { opacity: 0, duration: 0.2 }, 1.5);
    tl.to("#cli-bD", { rotation: 0, duration: 0.2 }, 1.3);
    tl.to("#g-cli", { x: 560, duration: 1.4, ease: "power1.in" }, 1.6);
    tl.to("#cli-cuerpo", { y: -18, duration: 0.17, yoyo: true, repeat: 7, ease: "sine.inOut" }, 1.6);
    tl.fromTo("#g-st", { y: 500, rotation: -15, transformOrigin: "50% 50%" }, { y: 0, rotation: -6, duration: 0.5, ease: "back.out(1.6)" }, 0.9);
    ["#g-d1", "#g-d2"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 1.3 + i * 0.2));`,
});

// 2 · Problema: el link por WhatsApp queda en "visto" y el cliente se duerme en el sillón.
escenas.problema = escena("problema", DUR.problema, {
  svg: `
    ${piso(1500)}
    <rect x="70" y="1150" width="620" height="260" rx="60" fill="${C.verde}" ${L}/><rect x="40" y="1300" width="680" height="200" rx="50" fill="${C.verde}" ${L}/>
    <g transform="translate(380 1500) scale(.95)"><g id="p-cli">${persona("pcli")}</g></g>
    <g transform="translate(800 960) rotate(8)"><g id="p-tel">${celu("ptel", `
      <rect x="-118" y="-240" width="236" height="60" fill="${C.verde}"/>${txt(-100, -200, 26, "Café Ejemplo", { anchor: "start" })}
      <g id="p-burbuja"><rect x="-110" y="-150" width="210" height="130" rx="22" fill="${C.niebla}" ${L4}/>${txt(-95, -110, 22, "¡Gracias por venir!", { peso: 700, anchor: "start" })}${txt(-95, -78, 22, "Te paso el link", { peso: 600, anchor: "start" })}${txt(-95, -46, 22, "para la reseña", { peso: 600, anchor: "start" })}</g>
      <g id="p-visto" opacity="0">${txt(80, 5, 26, "✓✓", { color: "#5e5e5e" })}${txt(0, 60, 26, "Visto", { peso: 600, color: "#5e5e5e" })}</g>`)}</g></g>
    <g font-family="Montserrat" font-weight="800" fill="#111"><text id="p-z1" x="520" y="780" font-size="64" opacity="0">Z</text><text id="p-z2" x="580" y="710" font-size="80" opacity="0">Z</text><text id="p-z3" x="650" y="630" font-size="96" opacity="0">Z</text></g>
  `,
  html: `${T("p-t", 170, `Mandar el link después <span class="acc">no sirve.</span>`)}
    <span id="p-c" class="chip negro" style="left:80px;top:1640px">Se olvida · le da fiaca</span>`,
  js: `
    ${entraT("#p-t")}
    tl.fromTo("#p-tel", { y: 900 }, { y: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.1);
    tl.fromTo("#p-burbuja", { opacity: 0, scale: 0.5, transformOrigin: "0% 100%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.6);
    tl.fromTo("#p-visto", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.6);
    tl.to("#pcli-feliz", { opacity: 0, duration: 0.08 }, 2.0); tl.to("#pcli-boste", { opacity: 1, duration: 0.08 }, 2.0);
    tl.fromTo("#pcli-boste", { scaleY: 0.4, transformOrigin: "50% 50%" }, { scaleY: 1.2, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 2.0);
    tl.to("#pcli-ojos", { opacity: 0, duration: 0.05 }, 2.0); tl.to("#pcli-parp", { opacity: 1, duration: 0.05 }, 2.0);
    ["#p-z1", "#p-z2", "#p-z3"].forEach((z, i) => tl.fromTo(z, { opacity: 0, y: 20 }, { opacity: 1, y: -10, duration: 0.3, ease: "power2.out" }, 2.4 + i * 0.2));
    ${pop("#p-c", 2.6)}`,
});

// 3 · Dos tecnologías: el sticker se "abre" y muestra el chip NFC y el QR.
escenas.dos = escena("dos", DUR.dos, {
  fondo: "#111",
  svg: `
    <g transform="translate(540 1000) scale(1.9)"><g id="d-st">${sticker("d-stc")}</g></g>
    <g id="d-a1" opacity="0"><path d="M300 1210 Q200 1400 250 1480" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M228 1450 l22 34 l20 -38" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g id="d-a2" opacity="0"><path d="M760 1210 Q860 1400 810 1480" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M788 1450 l22 34 l20 -38" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
  `,
  html: `${T("d-t", 170, `Dos tecnologías <span class="acc">en una pieza.</span>`, ";color:#fff")}
    <span id="d-c1" class="chip dato" style="left:110px;top:1520px;font-size:44px">Chip NFC</span>
    <span id="d-c2" class="chip dato" style="left:600px;top:1520px;font-size:44px">QR dinámico</span>`,
  js: `
    ${entraT("#d-t")}
    tl.fromTo("#d-st", { scale: 0, rotation: -20, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2)" }, 0.1);
    tl.fromTo("#d-a1", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.3);
    ${pop("#d-c1", 1.4)}
    tl.fromTo("#d-a2", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 2.3);
    ${pop("#d-c2", 2.4)}`,
});

// 4 · NFC por dentro: rayos X del sticker, antena y chip. El celu le da energía y lee el link.
const antena = [0, 1, 2, 3].map((i) => `<rect x="${-120 + i * 22}" y="${-120 + i * 22}" width="${240 - i * 44}" height="${240 - i * 44}" rx="${30 - i * 5}" fill="none" stroke="#C88A2B" stroke-width="8"/>`).join("");
escenas.nfc = escena("nfc", DUR.nfc, {
  fondo: C.madera,
  svg: `
    <g transform="translate(400 1120) scale(1.6)"><g id="n-rx">
      <rect x="-150" y="-150" width="300" height="300" rx="34" fill="#fff" ${L} fill-opacity=".55"/>
      <g id="n-ant">${antena}</g><rect id="n-chip" x="-26" y="-26" width="52" height="52" rx="8" fill="#111"/>
    </g></g>
    <g id="n-rayos" opacity="0"><path d="M470 760 l-40 90 h50 l-40 100" fill="none" stroke="#FFD54A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M600 780 l-30 70 h40 l-30 80" fill="none" stroke="#FFD54A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(560 520)"><g id="n-celu">${celu("n-tel", pantallaResena)}</g></g>
    <g id="n-link" opacity="0"><path d="M400 1080 C400 900 520 860 560 700" fill="none" stroke="#111" stroke-width="8" stroke-dasharray="4 22" stroke-linecap="round"/></g>
  `,
  html: `${T("n-t", 1530, `<span class="acc">Sin batería.</span> Sin apps.`, ";font-size:84px")}
    <span id="n-c1" class="chip negro" style="left:80px;top:170px">Antena + chip</span>
    <span id="n-c2" class="chip" style="left:80px;top:270px">El celu le da energía</span>
    ${notiHtml("n-noti", 380)}`,
  js: `
    tl.fromTo("#n-rx", { scale: 0.3, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.6)" }, 0.05);
    tl.fromTo("#n-ant rect", { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.12 }, 0.4);
    ${pop("#n-c1", 0.5)}
    ${entraT("#n-t", 1.6)}
    tl.fromTo("#n-celu", { y: -900, rotation: -20, transformOrigin: "50% 50%" }, { y: 0, rotation: -8, duration: 0.55, ease: "power3.out" }, 3.3);
    tl.fromTo("#n-rayos", { opacity: 0 }, { opacity: 1, duration: 0.12, yoyo: true, repeat: 7 }, 4.3);
    ${pop("#n-c2", 4.3)}
    tl.to("#n-ant rect", { stroke: "#FFD54A", duration: 0.2, stagger: 0.08 }, 4.5);
    tl.fromTo("#n-link", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 6.0);
    tl.fromTo("#n-link path", { strokeDashoffset: 0 }, { strokeDashoffset: -260, duration: 1.4, ease: "none" }, 6.0);
    tl.fromTo("#n-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }, 7.2);
    tl.fromTo("#n-t", { scale: 1, transformOrigin: "0% 50%" }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" }, 8.9);
    tl.to("#n-celu", { y: -30, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 7.6);`,
});

// 5 · QR: un celu sin NFC escanea con la cámara.
escenas.qr = escena("qr", DUR.qr, {
  fondo: C.madera,
  svg: `
    <g transform="translate(540 1120) scale(1.6)"><g id="q-st">${sticker("q-stc")}</g></g>
    <g transform="translate(560 500)"><g id="q-celu">${celu("q-tel", `<rect x="-110" y="-200" width="220" height="300" rx="20" fill="#333"/><path d="M-60 -120 h-30 v30 M60 -120 h30 v30 M-60 40 h-30 v-30 M60 40 h30 v-30" fill="none" stroke="${C.niebla}" stroke-width="8"/>${txt(0, 170, 30, "Cámara", { peso: 700 })}`)}
      <g id="q-sin"><circle cx="150" cy="-280" r="56" fill="#fff" ${L}/>${txt(150, -265, 26, "NFC")}<path d="M110 -320 L190 -240" stroke="#D9534F" stroke-width="10" stroke-linecap="round"/></g></g></g>
    <g id="q-cam" opacity="0"><path d="M560 1100 h-40 v40 M720 1100 h40 v40 M560 1330 h-40 v-40 M720 1330 h40 v-40" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><rect id="q-scan" x="525" y="1110" width="230" height="10" fill="#fff"/></g>
  `,
  html: `${T("q-t", 1520, `¿Sin NFC?<br><span class="acc">Escanea el QR.</span>`, ";font-size:84px")}
    <span id="q-c" class="chip negro" style="left:80px;top:1730px">Plan B: la cámara</span>
    ${notiHtml("q-noti")}`,
  js: `
    tl.fromTo("#q-celu", { y: -900, rotation: 20, transformOrigin: "50% 50%" }, { y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.3)" }, 0.05);
    ${pop("#q-sin", 0.5)}
    ${entraT("#q-t", 0.3)}
    tl.fromTo("#q-cam", { opacity: 0, scale: 1.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }, 1.1);
    tl.fromTo("#q-scan", { y: 0 }, { y: 200, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.3);
    ${pop("#q-c", 1.2)}
    tl.to("#q-celu", { y: -900, duration: 0.4, ease: "power2.in" }, 2.3);
    tl.fromTo("#q-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }, 2.5);`,
});

// 6 · Dinámico: el QR apunta a un link corto; el destino cambia y el cartel queda igual.
const destino = (id, y, nombre) => `<g id="${id}"><rect x="640" y="${y}" width="380" height="150" rx="28" fill="#fff" ${L}/>${txt(830, y + 62, 32, "Reseñas de", { peso: 600 })}${txt(830, y + 110, 38, nombre)}</g>`;
escenas.dinamico = escena("dinamico", DUR.dinamico, {
  svg: `
    <g transform="translate(220 1000) scale(1.05)"><g id="y-st">${sticker("y-stc")}</g></g>
    <g id="y-link"><rect x="90" y="1240" width="270" height="90" rx="45" fill="${C.niebla}" ${L}/>${txt(225, 1300, 34, "link corto")}</g>
    <path id="y-fl" d="M380 1285 C520 1285 520 1010 630 1010" fill="none" ${L} stroke-dasharray="1 0"/>
    ${destino("y-d1", 940, "Local Centro")}${destino("y-d2", 1290, "Local Nueva Cba.")}
    <g id="y-tij" opacity="0">${txt(520, 1180, 70, "✕", { color: "#D9534F" })}</g>
  `,
  html: `${T("y-t", 170, `Cambiás a dónde lleva. <span class="acc">No reimprimís.</span>`)}
    <span id="y-c" class="chip negro" style="left:80px;top:1560px">El cartel queda igual</span>`,
  js: `
    ${entraT("#y-t")}
    tl.fromTo("#y-st", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, 0.1);
    ${pop("#y-link", 0.5)}
    tl.fromTo("#y-fl", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.8);
    tl.fromTo("#y-d1", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 0.9);
    tl.fromTo("#y-d2", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.6)" }, 1.4);
    tl.to("#y-d1", { opacity: 0.35, duration: 0.3 }, 2.4);
    tl.to("#y-fl", { attr: { d: "M380 1285 C520 1285 520 1360 630 1360" }, duration: 0.5, ease: "back.out(1.6)" }, 2.4);
    tl.fromTo("#y-d2", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, 2.8);
    tl.to("#y-st", { rotation: -6, duration: 0.15, yoyo: true, repeat: 3, transformOrigin: "50% 50%" }, 3.2);
    ${pop("#y-c", 3.2)}`,
});

// 7 · Paso 1: escaneás el QR y activás la pieza (buscás tu negocio y elegís un PIN).
escenas.paso1 = escena("paso1", DUR.paso1, {
  svg: `
    ${piso()}
    <g transform="translate(250 1560) scale(.85)"><g id="a-due">${persona("ad", { camisa: C.verde, bigote: true })}</g></g>
    <g transform="translate(720 950)"><g id="a-tel">${celu("a-t", `
      ${txt(-110, -195, 26, "Activá tu pieza", { anchor: "start" })}
      <g id="a-f1"><rect x="-115" y="-160" width="230" height="110" rx="18" fill="${C.papel}" ${L4}/>${txt(-100, -122, 22, "1 · Tu negocio", { peso: 700, anchor: "start" })}<rect x="-100" y="-100" width="200" height="34" rx="10" fill="#fff" ${L4}/>${txt(-90, -76, 20, "Café Ejemplo", { peso: 600, anchor: "start" })}</g>
      <g id="a-f2"><rect x="-115" y="-30" width="230" height="110" rx="18" fill="${C.papel}" ${L4}/>${txt(-100, 8, 22, "2 · Tu PIN", { peso: 700, anchor: "start" })}${txt(0, 60, 44, "• • • •")}</g>
      <g id="a-btn"><rect x="-115" y="110" width="230" height="64" rx="32" fill="#111"/>${txt(0, 152, 24, "Activar mi pieza", { color: "#fff" })}</g>`)}</g></g>
    ${numero("a-n", "1", 900, 360)}
  `,
  html: `${T("a-t", 170, `Escaneás el QR <span class="acc">y la activás.</span>`, ";right:240px")}
    <span id="a-c1" class="chip" style="left:80px;top:1640px">Buscás tu negocio</span>
    <span id="a-c2" class="chip dato" style="left:520px;top:1640px">Elegís un PIN</span>`,
  js: `
    gsap.set("#ad-bD", { transformOrigin: "50% 4%" });
    ${pop("#a-n", 0)}
    ${entraT("#a-t", 0.1)}
    tl.fromTo("#a-due", { x: -600 }, { x: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.1);
    tl.fromTo("#a-tel", { y: 900 }, { y: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.3);
    tl.to("#ad-bD", { rotation: -60, duration: 0.3, ease: "back.out(2)" }, 0.5);
    tl.fromTo("#a-f1", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.3 }, 1.6);
    ${pop("#a-c1", 1.7)}
    tl.fromTo("#a-f2", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.3 }, 2.5);
    ${pop("#a-c2", 2.6)}
    tl.fromTo("#a-btn", { scale: 1, transformOrigin: "50% 50%" }, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, 3.6);`,
});

// 8 · Paso 2: grabás el chip una sola vez con NFC Tools.
escenas.paso2 = escena("paso2", DUR.paso2, {
  fondo: C.madera,
  svg: `
    <g transform="translate(400 1180) scale(1.4)"><g id="b-st">${sticker("b-stc")}</g></g>
    ${ondas("b", 400, 1180)}
    <g transform="translate(620 720)"><g id="b-celu">${celu("b-t", `
      ${txt(0, -190, 28, "NFC Tools")}
      <rect x="-110" y="-150" width="220" height="90" rx="16" fill="${C.papel}" ${L4}/>${txt(0, -113, 22, "Grabar el link", { peso: 700 })}${txt(0, -80, 22, "de tu pieza", { peso: 600 })}
      <g id="b-ok" opacity="0"><circle cx="0" cy="60" r="70" fill="${C.verde}" ${L}/><path d="M-30 60 l20 22 l42 -46" fill="none" ${L}/></g>`)}</g></g>
    ${numero("b-n", "2", 900, 360)}
  `,
  html: `${T("b-t", 170, `Grabás el chip <span class="acc">una sola vez.</span>`, ";right:240px")}
    <span id="b-c" class="chip negro" style="left:80px;top:1560px">App gratis NFC Tools</span>
    <span id="b-c2" class="chip" style="left:80px;top:1670px">iPhone y Android</span>`,
  js: `
    ${pop("#b-n", 0)}
    ${entraT("#b-t", 0.1)}
    tl.fromTo("#b-st", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, 0.1);
    tl.fromTo("#b-celu", { y: -900, rotation: -25, transformOrigin: "50% 50%" }, { y: 0, rotation: -10, duration: 0.5, ease: "power3.out" }, 0.3);
    ${pop("#b-c", 0.9)}
    tl.to("#b-celu", { x: -220, y: 300, rotation: -18, duration: 0.45, ease: "power2.inOut" }, 1.6);
    [0, 1, 2].forEach((i) => tl.fromTo("#b-o" + i, { opacity: 0.95, attr: { r: 120 } }, { opacity: 0, attr: { r: 420 }, duration: 0.8, ease: "power2.out" }, 2.0 + i * 0.22));
    tl.fromTo("#b-ok", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, 2.6);
    ${pop("#b-c2", 2.7)}`,
});

// 9 · Paso 3: lo pegás o lo das al mozo y pedís la reseña al cerrar la cuenta.
escenas.paso3 = escena("paso3", DUR.paso3, {
  svg: `
    ${piso(1460, C.madera)}
    <g transform="translate(330 1900) scale(.85)"><g id="c-mozo">${persona("cm", { camisa: "#fff", delantal: true })}</g></g>
    <g transform="translate(720 1460) scale(.85)"><g id="c-cli">${persona("cc", { camisa: "#FFD54A" })}</g></g>
    <rect x="80" y="1180" width="920" height="40" rx="12" fill="#fff" ${L}/>
    <g transform="translate(220 1130) scale(.38)"><g id="c-st">${sticker("c-stc")}</g></g>
    <g transform="translate(520 1150) scale(.42)"><g id="c-tj">${tarjeta("c-tjc")}</g></g>
    <g id="c-glob" opacity="0"><path d="M120 560 h420 q40 0 40 40 v120 q0 40 -40 40 h-300 l-60 60 v-60 h-60 q-40 0 -40 -40 v-120 q0 -40 40 -40 Z" fill="#fff" ${L}/>${txt(330, 650, 40, "¿Nos dejás", { ignorar: false })}${txt(330, 705, 40, "tu reseña?", { ignorar: false })}</g>
    ${numero("c-n", "3", 900, 360)}
  `,
  html: `${T("c-t", 170, `Pedila al <span class="acc">cerrar la cuenta.</span>`, ";right:240px")}
    <span id="c-c1" class="chip negro" style="left:520px;top:1680px">Mesa o mozo</span>
    <span id="c-c2" class="chip" style="left:520px;top:1790px">No sobre metal</span>`,
  js: `
    gsap.set("#cm-bD", { transformOrigin: "50% 4%" }); gsap.set("#cc-cabeza", { transformOrigin: "50% 100%" });
    ${pop("#c-n", 0)}
    ${entraT("#c-t", 0.1)}
    tl.fromTo("#c-st", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.3);
    tl.fromTo("#c-mozo", { x: -700 }, { x: 0, duration: 0.45, ease: "back.out(1.2)" }, 0.6);
    tl.fromTo("#c-tj", { y: -600, rotation: 20, transformOrigin: "50% 50%" }, { y: 0, rotation: -6, duration: 0.45, ease: "back.out(1.4)" }, 1.2);
    tl.to("#cm-bD", { rotation: -70, duration: 0.3, ease: "back.out(2)" }, 1.2);
    ${pop("#c-c1", 1.4)}
    tl.fromTo("#c-glob", { opacity: 0, scale: 0.4, transformOrigin: "20% 100%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 2.6);
    tl.to("#cc-cabeza", { rotation: 10, duration: 0.25, yoyo: true, repeat: 1 }, 3.1);
    ${pop("#c-c2", 3.4)}`,
});

// 10 · Aviso: cada lunes llega cuántas personas la usaron.
escenas.aviso = escena("aviso", DUR.aviso, {
  fondo: "#111",
  svg: `
    <g transform="translate(830 560) rotate(8)"><g id="v-cal"><rect x="-130" y="-120" width="260" height="250" rx="24" fill="#fff" ${L}/><rect x="-130" y="-120" width="260" height="70" rx="24" fill="${C.niebla}" ${L}/>${txt(0, -70, 40, "LUNES")}${txt(0, 80, 110, "9:00")}</g></g>
    <g transform="translate(540 1250)"><g id="v-sobre"><rect x="-300" y="-190" width="600" height="380" rx="26" fill="#fff" ${L}/><path id="v-solapa" d="M-300 -180 L0 40 L300 -180" fill="#fff" ${L}/></g></g>
  `,
  html: `${T("v-t", 200, `Y cada lunes,<br><span class="acc">cuántos la usaron.</span>`, ";color:#fff")}
    <div id="v-mail" style="position:absolute;left:130px;right:130px;top:900px;background:#fff;border:5px solid #111;border-radius:30px;padding:30px">
      <p style="font-size:28px;color:#5e5e5e;font-weight:600;margin:0">Tu pieza · resumen de la semana</p>
      <p style="display:flex;justify-content:space-between;align-items:baseline;font-size:36px;margin:16px 0 0"><span>Personas que la usaron</span><b style="background:${C.niebla};padding:0 12px;font-size:56px">34</b></p>
    </div>
    <span id="v-etq" class="etq" style="left:130px;top:1520px">Datos de ejemplo</span>`,
  js: `
    ${entraT("#v-t")}
    tl.fromTo("#v-cal", { y: -700, rotation: -30, transformOrigin: "50% 50%" }, { y: 0, rotation: 0, duration: 0.45, ease: "bounce.out" }, 0.05);
    tl.fromTo("#v-sobre", { x: -900, rotation: -25, transformOrigin: "50% 50%" }, { x: 0, rotation: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.2);
    tl.to("#v-solapa", { scaleY: -1, transformOrigin: "50% 0%", duration: 0.25, ease: "power2.inOut" }, 0.7);
    tl.fromTo("#v-mail", { opacity: 0, y: 250, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, 0.9);
    tl.fromTo("#v-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.0);`,
});

// 11 · CTA: el sticker y la tarjeta señalan hacia abajo: "Comentá GUÍA".
escenas.cta = escena("cta", DUR.cta, {
  svg: `
    <g transform="translate(320 1000) scale(1.1)"><g id="z-st">${sticker("z-stc", caritaPieza("z-stc", -88))}</g></g>
    <g transform="translate(780 1040) scale(1.05)"><g id="z-tj">${tarjeta("z-tjc", caritaPieza("z-tjc", -66))}</g></g>
    <g id="z-fl"><path d="M540 1300 v160" stroke="#111" stroke-width="14" stroke-linecap="round"/><path d="M490 1410 l50 60 l50 -60" fill="none" stroke="#111" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>
    ${destello("z-d1", 540, 760, 1.2)}${destello("z-d2", 130, 760, 0.8)}${destello("z-d3", 960, 780, 0.9)}
  `,
  html: `${T("z-t", 170, `¿Querés la guía <span class="acc">paso a paso?</span>`)}
    <div id="z-cta" style="position:absolute;left:80px;right:80px;top:1520px;background:#111;color:#fff;border-radius:36px;padding:36px 44px;font-weight:800;font-size:92px;letter-spacing:-0.035em">Comentá GUÍA</div>
    <p id="z-marca" style="position:absolute;left:80px;top:1730px;display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700;margin:0"><img src="assets/isotipo.svg" alt="" style="width:52px;height:52px">MetricsField Reviews</p>`,
  js: `
    ${entraT("#z-t")}
    tl.fromTo("#z-st", { y: -900 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.1);
    tl.fromTo("#z-tj", { y: -900 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.25);
    tl.to("#z-st", { y: -50, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.0);
    tl.to("#z-tj", { y: -50, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.25);
    tl.fromTo("#z-fl", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(2)" }, 1.2);
    tl.to("#z-fl", { y: 20, duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" }, 1.5);
    ["#z-d1", "#z-d2", "#z-d3"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 0.8 + i * 0.2));
    tl.fromTo("#z-cta", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }, 1.4);
    tl.to("#z-cta", { scale: 1.04, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 2.0);
    tl.fromTo("#z-marca", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.8);`,
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
