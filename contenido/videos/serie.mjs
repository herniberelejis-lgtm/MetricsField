// Piezas fijas de la serie "30 días para renunciar": el marcador de arriba
// (días restantes, locales y el medidor "¿RENUNCIO?") y el cartel de
// "USTEDES ELIGIERON". Todos los episodios lo usan igual.

import { C } from "./dibujos.mjs";

const caja = "background:#111;border:4px solid #333;border-radius:20px;padding:10px 18px;color:#fff;text-align:center";

/** Marcador fijo arriba. `estado`: { dias, locales, meta }. La barra "¿RENUNCIO?"
 * es el avance hacia la meta (locales / meta): si llega a 50 locales, renuncia. */
export function hud(id, { dias, locales, meta }) {
  const pct = Math.round((locales / meta) * 100);
  return `
    <div id="${id}" style="position:absolute;left:40px;right:40px;top:40px;display:flex;gap:16px;font-family:Montserrat">
      <div style="${caja};width:250px"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">DÍAS RESTANTES</small><b style="display:block;font-size:64px;font-weight:800;color:#FFD54A;line-height:1.05">${dias}</b></div>
      <div style="${caja};width:220px"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">LOCALES</small><b style="display:block;font-size:64px;font-weight:800;color:${C.niebla};line-height:1.05"><span id="${id}-loc">${locales}</span><span style="font-size:36px;color:#aaa">/${meta}</span></b></div>
      <div style="${caja};flex:1"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">¿RENUNCIO?</small>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px"><div style="flex:1;height:22px;border-radius:11px;background:#333;overflow:hidden"><div id="${id}-barra" style="height:100%;width:${Math.max(pct, 3)}%;background:${C.verde}"></div></div><b id="${id}-pct" style="font-size:44px;font-weight:800;color:${C.verde}">${pct}%</b></div></div>
    </div>`;
}

/** Cartel "USTEDES ELIGIERON: X" (del episodio 2 en adelante). */
export const eligieron = (id, palabra, top = 240) => `
    <div id="${id}" style="position:absolute;left:150px;right:150px;top:${top}px;background:#111;border:5px solid #FFD54A;border-radius:22px;padding:16px 24px;text-align:center;font-family:Montserrat;transform:rotate(-3deg)">
      <small style="display:block;font-size:34px;font-weight:800;color:#fff">USTEDES ELIGIERON:</small>
      <b style="display:block;font-size:72px;font-weight:800;color:#FFD54A;line-height:1.05">${palabra}</b></div>`;

/** Animación del marcador: cuenta de `desde` a `hasta` locales (número, % y barra). */
export const hudSube = (id, desde, hasta, meta, t) => `
    const hk = { n: ${desde} };
    tl.fromTo(hk, { n: ${desde} }, { n: ${hasta}, duration: 0.9, ease: "power2.out", onUpdate: () => {
      const n = Math.round(hk.n), pct = Math.round((n / ${meta}) * 100);
      document.querySelector("#${id}-loc").textContent = n;
      document.querySelector("#${id}-pct").textContent = pct + "%";
      document.querySelector("#${id}-barra").style.width = Math.max(pct, 3) + "%";
    } }, ${t});`;

/** Marca fija de video de prueba (datos inventados): no publicar con esto. */
export const prueba = (id) => `<span id="${id}" style="position:absolute;right:40px;bottom:40px;font-family:Montserrat;font-weight:700;font-size:28px;color:#fff;background:#D9534F;border-radius:999px;padding:8px 20px">PRUEBA · datos inventados</span>`;

/** Fachada de un local en dibujo. Origen abajo a la izquierda, 440 de ancho. */
export function fachada(id, nombre, color, L) {
  const rayas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 55}" y="-640" width="55" height="90" fill="${i % 2 ? "#fff" : color}"/>`).join("");
  return `
  <g id="${id}">
    <rect x="10" y="-560" width="420" height="560" fill="#fff" ${L}/>
    <g>${rayas}</g><rect x="0" y="-640" width="440" height="90" fill="none" ${L}/>
    <path d="M0 -550 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0 q27 30 55 0" fill="${color}" ${L}/>
    <rect x="10" y="-740" width="420" height="90" rx="16" fill="#111" ${L}/>
    <text data-layout-ignore x="220" y="-680" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="${nombre.length > 14 ? 30 : 38}" fill="#fff">${nombre}</text>
    <rect x="40" y="-430" width="200" height="200" fill="${C.niebla}" ${L}/>
    <rect x="280" y="-360" width="120" height="360" fill="${C.madera}" ${L}/><circle cx="300" cy="-180" r="9" fill="#111"/>
  </g>`;
}

/** Marcador de "30 días para decidir": día, locales activos, usos de los últimos
 * 7 días y la balanza ALL-IN ↔ LO DEJO (`balanza` de -100, todo LO DEJO, a 100,
 * todo ALL-IN; 0 = en el medio). */
export function hudDecidir(id, { dia, locales, metaLocales, usos, balanza = 0 }) {
  const pos = 50 + balanza / 2;
  return `
    <div id="${id}" style="position:absolute;left:40px;right:40px;top:40px;display:flex;gap:14px;font-family:Montserrat">
      <div style="${caja};width:150px"><small style="display:block;font-size:28px;font-weight:800;line-height:1.1">DÍA</small><b style="display:block;font-size:60px;font-weight:800;color:#FFD54A;line-height:1.05">${dia}<span style="font-size:32px;color:#aaa">/30</span></b></div>
      <div style="${caja};width:200px"><small style="display:block;font-size:28px;font-weight:800;line-height:1.1">LOCALES</small><b style="display:block;font-size:60px;font-weight:800;color:${C.niebla};line-height:1.05"><span id="${id}-loc">${locales}</span><span style="font-size:32px;color:#aaa">/${metaLocales}</span></b></div>
      <div style="${caja};width:170px"><small style="display:block;font-size:28px;font-weight:800;line-height:1.1">USOS</small><b id="${id}-usos" style="display:block;font-size:60px;font-weight:800;color:${C.verde};line-height:1.05">${usos}</b></div>
      <div style="${caja};flex:1;padding:10px 14px"><div style="display:flex;justify-content:space-between;font-size:28px;font-weight:800"><span style="color:${C.verde}">ALL-IN</span><span style="color:#bbb">LO DEJO</span></div>
        <div style="position:relative;height:22px;margin-top:16px;border-radius:11px;overflow:visible;display:flex"><div style="flex:1;background:${C.verde};border-radius:11px 0 0 11px"></div><div style="flex:1;background:#555;border-radius:0 11px 11px 0"></div><div id="${id}-aguja" style="position:absolute;top:-8px;left:calc(${100 - pos}% - 6px);width:12px;height:38px;border-radius:6px;background:#fff;border:3px solid #111"></div></div></div>
    </div>`;
}
