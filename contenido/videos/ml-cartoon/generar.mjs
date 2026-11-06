// Genera las escenas en dibujo animado del video de Mercado Libre (mismo
// guion y misma voz que ml-vende). Personajes y piezas son SVG planos con
// contorno negro; un filtro de turbulencia que cambia de semilla 12 veces por
// segundo hace "temblar" la línea como un dibujo a mano.
//
//   node contenido/videos/ml-cartoon/generar.mjs
//
// Escribe compositions/*.html. Después: npx hyperframes check / render.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));

import { C, L, persona, sticker, tarjeta, caritaPieza, celu, ondas, destello, escena } from "../dibujos.mjs";


const escenas = {};

// 1 · Gancho: el cliente se despide contento y se va. Contador de reseñas en 0.
escenas.gancho = escena("gancho", 3.2, {
  svg: `
    <rect x="0" y="1380" width="1080" height="540" fill="${C.gris}"/>
    <path d="M0 1380 H1080" ${L}/>
    <g id="g-puerta"><rect x="800" y="640" width="230" height="740" fill="${C.verde}" ${L}/><circle cx="830" cy="1020" r="12" fill="#111"/><rect x="830" y="690" width="170" height="220" fill="#fff" ${L}/></g>
    <g transform="translate(250 1380) scale(.85)">${persona("mozo", { camisa: "#fff", delantal: true })}</g>
    <g transform="translate(60 0)"><rect x="0" y="1050" width="380" height="330" fill="${C.madera}" ${L}/><rect x="-20" y="1020" width="420" height="40" rx="10" fill="#fff" ${L}/>
      <path d="M90 1020 v-50 h40 v50 M250 1020 q0 -60 30 -60 q30 0 30 60" fill="#fff" ${L}/></g>
    <g transform="translate(620 1400)"><g id="g-cli">${persona("cli")}</g></g>
    <g id="g-nube" opacity="0"><path d="M560 600 q-20 -70 60 -80 q30 -50 90 -20 q60 -30 90 30 q60 10 40 70 Z" fill="#fff" ${L}/><text x="680" y="590" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="56" fill="#111">¡Chau!</text></g>
  `,
  html: `
    <h1 id="g-t1" class="tit" style="top:170px">Tu cliente se fue feliz…</h1>
    <h1 id="g-t2" class="tit" style="top:1520px">…y no te dejó <span class="acc">ni una reseña.</span></h1>
    <span id="g-cero" class="chip negro" style="left:620px;top:1760px">Reseñas: 0</span>`,
  js: `
    gsap.set(["#cli-bD", "#mozo-bD"], { transformOrigin: "50% 4%" });
    tl.fromTo("#g-t1", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#cli-bD", { rotation: 0 }, { rotation: -150, duration: 0.3, ease: "back.out(2)" }, 0.15);
    tl.to("#cli-bD", { rotation: -120, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.45);
    tl.fromTo("#mozo-bD", { rotation: 0 }, { rotation: -140, duration: 0.3, ease: "back.out(2)" }, 0.3);
    tl.to("#mozo-bD", { rotation: -110, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.6);
    tl.fromTo("#g-nube", { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.35);
    tl.to("#g-nube", { opacity: 0, duration: 0.2 }, 1.3);
    tl.to("#cli-bD", { rotation: 0, duration: 0.2 }, 1.25);
    tl.to("#g-cli", { x: 520, duration: 1.4, ease: "power1.in" }, 1.4);
    tl.to("#cli-cuerpo", { y: -18, duration: 0.17, yoyo: true, repeat: 7, ease: "sine.inOut" }, 1.4);
    tl.fromTo("#g-t2", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.6)" }, 1.1);
    tl.fromTo("#g-cero", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.9);
    tl.to("#g-cero", { x: -14, duration: 0.05, yoyo: true, repeat: 7, ease: "none" }, 2.3);
    tl.to("#mozo-feliz", { opacity: 0, duration: 0.1 }, 2.3); tl.to("#mozo-serio", { opacity: 1, duration: 0.1 }, 2.3);`,
});

// 2 · Fiaca: en el sillón, el celular, buscar el nombre del lugar… bostezo.
const pantFiaca = `
    <rect x="-112" y="-200" width="224" height="56" rx="28" fill="${C.papel}" ${L.replace('stroke-width="6"', 'stroke-width="4"')}/>
    <text id="f-bus" x="-92" y="-162" font-family="Montserrat" font-weight="700" font-size="26" fill="#111">el café de la esq</text>
    <rect x="-112" y="-120" width="224" height="50" rx="14" fill="${C.gris}"/><rect x="-112" y="-56" width="224" height="50" rx="14" fill="${C.gris}"/>
    <text id="f-q" x="0" y="120" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="90" fill="#111" opacity="0">¿…?</text>`;
escenas.fiaca = escena("fiaca", 3.1, {
  svg: `
    <rect x="0" y="1500" width="1080" height="420" fill="${C.gris}"/>
    <path d="M0 1500 H1080" ${L}/>
    <g transform="translate(0 0)"><rect x="70" y="1150" width="620" height="260" rx="60" fill="${C.verde}" ${L}/><rect x="40" y="1300" width="680" height="200" rx="50" fill="${C.verde}" ${L}/><rect x="90" y="1490" width="30" height="40" fill="#111"/><rect x="640" y="1490" width="30" height="40" fill="#111"/></g>
    <g id="f-cli" transform="translate(380 1500) scale(.95)">${persona("fcli")}</g>
    <g transform="translate(800 980) rotate(8)"><g id="f-tel">${celu("ftel", pantFiaca)}</g></g>
    <g id="f-z" font-family="Montserrat" font-weight="800" fill="#111"><text id="f-z1" x="520" y="760" font-size="64" opacity="0">Z</text><text id="f-z2" x="580" y="690" font-size="80" opacity="0">Z</text><text id="f-z3" x="650" y="610" font-size="96" opacity="0">Z</text></g>
    <path id="f-gota" d="M300 820 q-18 30 0 46 q18 -16 0 -46 Z" fill="${C.niebla}" ${L} opacity="0"/>
  `,
  html: `
    <h1 id="f-t1" class="tit" style="top:170px;font-size:72px;color:#5e5e5e">No es que no quiera.</h1>
    <h1 id="f-t2" class="tit" style="top:270px">Le da <span class="acc">fiaca</span> buscarte.</h1>`,
  js: `
    gsap.set("#fcli-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#f-t1", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#f-t2", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 1.1);
    tl.fromTo("#f-tel", { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.4)" }, 0.1);
    tl.fromTo("#f-bus", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "steps(17)" }, 0.45);
    tl.to("#f-bus", { clipPath: "inset(0 65% 0 0)", duration: 0.45, ease: "steps(8)" }, 1.5);
    tl.fromTo("#f-q", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.9);
    tl.to("#fcli-cabeza", { rotation: 8, duration: 0.4, ease: "sine.inOut" }, 0.6);
    tl.to("#fcli-cabeza", { rotation: -6, duration: 0.5, ease: "sine.inOut" }, 1.0);
    tl.fromTo("#f-gota", { opacity: 0, y: 0 }, { opacity: 1, y: 30, duration: 0.5 }, 1.0);
    tl.to("#fcli-feliz", { opacity: 0, duration: 0.08 }, 1.5);
    tl.to("#fcli-boste", { opacity: 1, duration: 0.08 }, 1.5);
    tl.fromTo("#fcli-boste", { scaleY: 0.4, transformOrigin: "50% 50%" }, { scaleY: 1.2, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.5);
    tl.to("#fcli-ojos", { opacity: 0, duration: 0.05 }, 1.5); tl.to("#fcli-parp", { opacity: 1, duration: 0.05 }, 1.5);
    ["#f-z1", "#f-z2", "#f-z3"].forEach((z, i) => tl.fromTo(z, { opacity: 0, y: 20 }, { opacity: 1, y: -10, duration: 0.3, ease: "power2.out" }, 2.0 + i * 0.2));
    tl.to("#f-tel", { rotation: 30, y: 200, opacity: 0.5, duration: 0.5, ease: "power2.in" }, 2.5);`,
});

// 3 · Solución: el sticker aparece con destellos y ondas.
escenas.solucion = escena("solucion", 1.9, {
  fondo: "#111",
  svg: `
    ${ondas("s", 540, 1080)}
    <g transform="translate(540 1080) scale(2.2)">${sticker("s-st", caritaPieza("s-st", -88))}</g>
    ${destello("s-d1", 230, 760, 1.4)}${destello("s-d2", 870, 820, 1.1)}${destello("s-d3", 860, 1440, 1.5)}${destello("s-d4", 210, 1390, 1)}
  `,
  html: `<h1 id="s-t" class="tit" style="top:220px;color:#fff">Entonces ponésela<br><span class="acc">a un toque.</span></h1>`,
  js: `
    tl.fromTo("#s-t", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#s-st", { scale: 0, rotation: -25, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, duration: 0.55, ease: "back.out(2)" }, 0.1);
    tl.fromTo("#s-st", { y: 0 }, { y: -14, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.7);
    ["#s-d1", "#s-d2", "#s-d3", "#s-d4"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.3, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 0.45 + i * 0.12));
    [0, 1, 2].forEach((i) => tl.fromTo("#s-o" + i, { opacity: 0.9, attr: { r: 300 } }, { opacity: 0, attr: { r: 620 }, duration: 0.8, ease: "power2.out" }, 0.6 + i * 0.25));`,
});

// 4 · Productos: se despega el 3M y se pega en la mesa; el mozo da vuelta la tarjeta.
escenas.productos = escena("productos", 4.3, {
  svg: `
    <rect x="0" y="0" width="1080" height="960" fill="${C.papel}"/>
    <path d="M-20 620 L1100 520 L1100 960 L-20 960 Z" fill="${C.madera}" ${L}/>
    <g id="p-taza" transform="translate(860 420)"><path d="M-70 0 h140 l-15 110 h-110 z" fill="#fff" ${L}/><path d="M70 25 q45 5 30 50 q-10 20 -40 15" fill="none" ${L}/><path d="M-30 -30 q-15 -25 0 -45 M10 -30 q-15 -25 0 -45" fill="none" ${L}/></g>
    <g transform="translate(470 720)"><g id="p-stw">
      <g id="p-liner"><rect x="-150" y="-150" width="300" height="300" rx="34" fill="${C.gris}" ${L}/><text data-layout-ignore x="0" y="16" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="72" fill="#555">3M</text></g>
      ${sticker("p-st")}
    </g></g>
    <g transform="translate(470 560)"><g id="p-mano"><path d="M-60 -40 q0 -60 60 -60 q60 0 60 60 v80 q0 40 -60 40 q-60 0 -60 -40 Z" fill="${C.piel}" ${L}/><rect x="-50" y="-260" width="100" height="170" fill="${C.niebla}" ${L}/></g></g>
    <rect x="0" y="960" width="1080" height="960" fill="${C.niebla}"/>
    <path d="M0 960 H1080" ${L}/>
    <g transform="translate(330 1900) scale(.95)">${persona("pmozo", { camisa: "#fff", delantal: true })}</g>
    <g transform="translate(690 1350)"><g id="p-tj">${tarjeta("p-tjc")}</g></g>
  `,
  html: `
    <span id="p-c1" class="chip negro" style="left:70px;top:170px;font-size:44px">STICKER</span>
    <span id="p-c1b" class="chip dato" style="left:70px;top:270px">Adhesivo 3M</span>
    <span id="p-c1c" class="chip" style="left:70px;top:370px">Mesa · caja · mostrador</span>
    <span id="p-c2" class="chip negro" style="left:620px;top:1040px;font-size:44px">TARJETA</span>
    <span id="p-c2b" class="chip dato" style="left:620px;top:1140px">1 por mozo</span>
    <span id="p-c2c" class="chip" style="left:620px;top:1590px">Igual de los dos lados</span>`,
  js: `
    gsap.set("#pmozo-bD", { transformOrigin: "50% 4%" });
    tl.fromTo("#p-c1", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25, ease: "power3.out" }, 0.1);
    tl.fromTo("#p-stw", { y: -500, rotation: -20 }, { y: 0, rotation: -6, transformOrigin: "50% 50%", duration: 0.45, ease: "back.out(1.3)" }, 0);
    tl.fromTo("#p-liner", { x: 0, y: 0, rotation: 0, transformOrigin: "50% 50%" }, { x: 260, y: 180, rotation: 40, opacity: 0, duration: 0.55, ease: "power2.in" }, 0.5);
    tl.fromTo("#p-c1b", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.7);
    tl.fromTo("#p-mano", { y: -900 }, { y: 0, duration: 0.3, ease: "power2.in" }, 1.0);
    tl.to("#p-stw", { scale: 0.96, transformOrigin: "50% 50%", duration: 0.1, yoyo: true, repeat: 1 }, 1.3);
    tl.to("#p-mano", { y: -900, duration: 0.35, ease: "power2.out" }, 1.5);
    tl.fromTo("#p-c1c", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.25, ease: "power3.out" }, 1.3);
    tl.fromTo("#pmozo", { x: -900 }, { x: 0, duration: 0.45, ease: "back.out(1.2)" }, 2.0);
    tl.fromTo("#p-tj", { x: 900, rotation: 20 }, { x: 0, rotation: -8, duration: 0.45, ease: "back.out(1.3)" }, 2.1);
    tl.fromTo("#p-c2", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.25 }, 2.3);
    tl.fromTo("#p-c2b", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 2.6);
    tl.fromTo("#pmozo-bD", { rotation: 0 }, { rotation: -60, duration: 0.3, ease: "back.out(2)" }, 2.5);
    tl.to("#p-tjc", { scaleX: -1, transformOrigin: "50% 50%", duration: 0.25, ease: "power2.in" }, 3.0);
    tl.to("#p-tjc", { scaleX: 1, duration: 0.25, ease: "power2.out" }, 3.25);
    tl.fromTo("#p-c2c", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, 3.2);`,
});

// 5 · Toque: el celu se apoya en el sticker, ondas NFC, cae la notificación. Después el QR.
escenas.toque = escena("toque", 5.7, {
  fondo: C.madera,
  svg: `
    <g transform="translate(400 1060) scale(1.5)">${sticker("t-st")}</g>
    ${ondas("t", 400, 1060)}
    <g transform="translate(720 860)"><g id="t-celu">${celu("t-tel", `<rect x="-110" y="-190" width="220" height="120" rx="20" fill="${C.niebla}"/><text data-layout-ignore x="0" y="-118" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="#111">★</text><rect x="-110" y="-50" width="220" height="24" rx="12" fill="${C.gris}"/><rect x="-110" y="-10" width="160" height="24" rx="12" fill="${C.gris}"/><rect x="-110" y="60" width="220" height="80" rx="18" fill="${C.gris}"/>`)}
      <g transform="translate(150 140)"><path d="M0 -60 q60 0 60 60 v90 q0 50 -60 50 q-70 0 -90 -40 l-30 -70 q-10 -30 20 -35 q20 -3 30 20 l10 20 v-95 Z" fill="${C.piel}" ${L}/></g>
    </g></g>
    <g id="t-cam" opacity="0">
      <path d="M260 920 h-50 v50 M540 920 h50 v50 M260 1200 h-50 v-50 M540 1200 h50 v-50" fill="none" stroke="${C.niebla}" stroke-width="14" stroke-linecap="round"/>
      <rect id="t-scan" x="230" y="930" width="340" height="10" fill="${C.niebla}"/>
    </g>
  `,
  html: `
    <div id="t-noti" style="position:absolute;left:60px;right:60px;top:110px;background:#fff;border:5px solid #111;border-radius:40px;padding:28px 34px;display:flex;gap:26px;align-items:center">
      <span style="width:84px;height:84px;border-radius:22px;background:${C.niebla};border:4px solid #111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:44px">★</span>
      <span><b style="display:block;font-size:36px;font-weight:700">Tu página de reseñas de Google</b><small style="display:block;font-size:30px;color:#5e5e5e;margin-top:4px">Tocá para abrir</small></span></div>
    <span id="t-c1" class="chip negro" style="left:80px;top:1390px">APOYÁS</span>
    <span id="t-c2" class="chip negro" style="left:360px;top:1390px">O ESCANEÁS</span>
    <h1 id="t-tit" class="tit" style="top:1500px;font-size:84px"><span class="acc">Se abre sola.</span><br>Sin apps.</h1>`,
  js: `
    tl.fromTo("#t-celu", { x: 300, y: -500, rotation: -44, transformOrigin: "50% 50%" }, { x: -320, y: 120, rotation: -20, duration: 0.6, ease: "power3.out" }, 0.1);
    tl.fromTo("#t-c1", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, 0.5);
    [0, 1, 2].forEach((i) => tl.fromTo("#t-o" + i, { opacity: 0.95, attr: { r: 120 } }, { opacity: 0, attr: { r: 420 }, duration: 0.8, ease: "power2.out" }, 0.75 + i * 0.22));
    tl.fromTo("#t-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }, 1.25);
    tl.fromTo("#t-tit", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 1.6);
    tl.to("#t-celu", { x: 400, y: -200, rotation: 10, duration: 0.5, ease: "power2.in" }, 2.6);
    tl.to("#t-noti", { y: -300, opacity: 0, duration: 0.3, ease: "power2.in" }, 2.7);
    tl.fromTo("#t-c2", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, 3.0);
    tl.fromTo("#t-cam", { opacity: 0, scale: 1.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }, 3.1);
    tl.fromTo("#t-scan", { y: 0 }, { y: 250, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, 3.4);
    tl.fromTo("#t-noti", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.5)", immediateRender: false }, 4.5);`,
});

// 6 · Panel: el dueño mira su panel, se sorprende y levanta el pulgar.
escenas.panel = escena("panel", 5.7, {
  svg: `
    <rect x="0" y="1560" width="1080" height="360" fill="${C.gris}"/><path d="M0 1560 H1080" ${L}/>
    <g transform="translate(860 1880) scale(.82)"><g id="pn-due">${persona("due", { camisa: C.verde, bigote: true, mano: `<g id="due-pulgar" opacity="0"><rect x="96" y="-300" width="22" height="50" rx="11" fill="${C.piel}" ${L}/></g>` })}</g></g>
    ${destello("pn-d1", 980, 1140, 0.9)}
  `,
  html: `
    <h1 id="pn-tit" class="tit" style="top:150px">Y vos ves <span class="acc">todo</span><br>en tu panel.</h1>
    <div id="pn-panel" style="position:absolute;left:60px;width:720px;top:430px;background:#fff;border:5px solid #111;border-radius:36px;padding:34px">
      <p style="display:flex;align-items:center;gap:14px;font-size:28px;font-weight:700;margin:0 0 22px"><img src="assets/isotipo.svg" alt="" style="width:40px;height:40px">MetricsField Reviews</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:${C.niebla};border-radius:20px;padding:18px"><small style="display:block;font-size:28px;font-weight:600">Usos</small><b id="pn-k1" style="display:block;font-size:68px;font-weight:800">0</b></div>
        <div style="background:${C.papel};border-radius:20px;padding:18px"><small style="display:block;font-size:28px;font-weight:600">Reseñas nuevas</small><b id="pn-k2" style="display:block;font-size:68px;font-weight:800">0</b></div>
      </div>
      <div id="pn-res" style="margin-top:20px;border:3px solid #e4e6ea;border-radius:22px;padding:22px">
        <p style="font-size:30px;margin:0;font-weight:700">Reseña nueva</p>
        <p style="font-size:30px;margin:8px 0 0;line-height:1.3">"Riquísimo el café y la atención de Sofi."</p>
        <div style="margin-top:14px;background:${C.papel};border-radius:18px;padding:18px"><small style="display:block;font-size:28px;font-weight:700">Respuesta sugerida</small><p id="pn-resp" style="font-size:28px;margin:6px 0 0;line-height:1.3">¡Gracias! Le pasamos tu saludo a Sofi.</p></div>
      </div>
    </div>
    <span id="pn-etq" class="etq" style="left:60px;top:1470px">Datos de ejemplo</span>`,
  js: `
    gsap.set("#due-bD", { transformOrigin: "50% 4%" }); gsap.set("#due-cabeza", { transformOrigin: "50% 100%" });
    tl.fromTo("#pn-tit", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#pn-panel", { opacity: 0, y: 80, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.45, ease: "back.out(1.3)" }, 0.15);
    tl.fromTo("#pn-due", { x: 400 }, { x: 0, duration: 0.5, ease: "back.out(1.3)" }, 0.2);
    tl.fromTo("#pn-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
    const k = { a: 0, b: 0 };
    tl.fromTo(k, { a: 0, b: 0 }, { a: 148, b: 23, duration: 1.3, ease: "power2.out", onUpdate: () => {
      document.querySelector("#pn-k1").textContent = Math.round(k.a);
      document.querySelector("#pn-k2").textContent = Math.round(k.b);
    } }, 0.6);
    tl.to("#due-cabeza", { rotation: -10, duration: 0.3, ease: "sine.inOut" }, 0.8);
    tl.fromTo("#due-ojos", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.35, duration: 0.2, ease: "back.out(3)" }, 1.4);
    tl.fromTo("#pn-res", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 2.3);
    tl.fromTo("#pn-resp", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.0, ease: "none" }, 2.9);
    tl.to("#due-cabeza", { rotation: 4, duration: 0.3 }, 3.9);
    tl.fromTo("#due-bD", { rotation: 0 }, { rotation: -150, duration: 0.35, ease: "back.out(2)" }, 4.1);
    tl.to("#due-pulgar", { opacity: 1, duration: 0.05 }, 4.2);
    tl.fromTo("#pn-d1", { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, ease: "back.out(2)" }, 4.3);`,
});

// 7 · Lunes: la hoja del calendario cae, llega el sobre y sale el resumen.
escenas.lunes = escena("lunes", 2.4, {
  fondo: "#111",
  svg: `
    <g transform="translate(830 520) rotate(8)"><g id="l-cal"><rect x="-130" y="-120" width="260" height="250" rx="24" fill="#fff" ${L}/><rect x="-130" y="-120" width="260" height="70" rx="24" fill="${C.niebla}" ${L}/><text x="0" y="-70" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="#111">LUNES</text><text x="0" y="80" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="110" fill="#111">9:00</text></g></g>
    <g transform="translate(540 1200)"><g id="l-sobre"><rect x="-300" y="-190" width="600" height="380" rx="26" fill="#fff" ${L}/><path id="l-solapa" d="M-300 -180 L0 40 L300 -180" fill="#fff" ${L}/></g></g>
  `,
  html: `
    <h1 id="l-tit" class="tit" style="top:200px;color:#fff">Y cada lunes,<br><span class="acc">el resumen en tu mail.</span></h1>
    <div id="l-mail" style="position:absolute;left:130px;right:130px;top:880px;background:#fff;border:5px solid #111;border-radius:30px;padding:30px">
      <p style="font-size:28px;color:#5e5e5e;font-weight:600;margin:0">MetricsField Reviews · Tu semana</p>
      <p style="display:flex;justify-content:space-between;font-size:34px;margin:16px 0 0"><span>Usos de tus piezas</span><b style="background:${C.niebla};padding:0 10px">34</b></p>
      <p style="display:flex;justify-content:space-between;font-size:34px;margin:12px 0 0"><span>Reseñas nuevas</span><b>6</b></p>
    </div>
    <span id="l-etq" class="etq" style="left:130px;top:1480px">Datos de ejemplo</span>`,
  js: `
    tl.fromTo("#l-tit", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#l-cal", { y: -600, rotation: -30 }, { y: 0, rotation: 8, duration: 0.45, ease: "bounce.out" }, 0.05);
    tl.fromTo("#l-sobre", { x: -900, rotation: -25 }, { x: 0, rotation: 0, duration: 0.45, ease: "back.out(1.4)" }, 0.2);
    tl.to("#l-solapa", { scaleY: -1, transformOrigin: "50% 0%", duration: 0.25, ease: "power2.inOut" }, 0.7);
    tl.fromTo("#l-mail", { opacity: 0, y: 250, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, 0.9);
    tl.fromTo("#l-etq", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.0);`,
});

// 8 · Cierre: el sticker y la tarjeta, con caritas, saltan juntos.
escenas.cierre = escena("cierre", 4.5, {
  svg: `
    <ellipse cx="320" cy="1250" rx="200" ry="26" fill="${C.gris}"/><ellipse cx="770" cy="1250" rx="200" ry="26" fill="${C.gris}"/>
    <g transform="translate(320 1000) scale(1.15)"><g id="c-st">${sticker("c-stc", caritaPieza("c-stc", -88))}</g></g>
    <g transform="translate(770 1060) scale(1.1)"><g id="c-tj">${tarjeta("c-tjc", caritaPieza("c-tjc", -66))}</g></g>
    ${destello("c-d1", 540, 760, 1.2)}${destello("c-d2", 140, 720, 0.8)}${destello("c-d3", 950, 760, 0.9)}
  `,
  html: `
    <h1 id="c-tit" class="tit" style="top:170px">Que tu buena atención<br><span class="acc">se vea en Google.</span></h1>
    <span id="c-ch3" class="chip dato" style="left:80px;top:1320px">Incluye el panel MetricsField Reviews</span>
    <div id="c-cta" style="position:absolute;left:80px;right:80px;top:1450px;background:#111;color:#fff;border-radius:36px;padding:40px 44px;font-weight:800;font-size:96px;letter-spacing:-0.035em">Llevá el tuyo.</div>`,
  js: `
    tl.fromTo("#c-tit", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0);
    tl.fromTo("#c-st", { y: -900 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.15);
    tl.fromTo("#c-tj", { y: -900 }, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.3);
    tl.to("#c-st", { y: -60, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.1);
    tl.to("#c-tj", { y: -60, duration: 0.25, yoyo: true, repeat: 5, ease: "power1.out" }, 1.35);
    ["#c-d1", "#c-d2", "#c-d3"].forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2)" }, 0.9 + i * 0.2));
    tl.fromTo("#c-ch3", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.0);
    tl.fromTo("#c-cta", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }, 1.9);
    tl.to("#c-cta", { scale: 1.04, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 2.5);`,
});

for (const [id, html] of Object.entries(escenas)) {
  writeFileSync(join(AQUI, "compositions", `${id}.html`), html);
}
console.log(`${Object.keys(escenas).length} escenas → compositions/`);
