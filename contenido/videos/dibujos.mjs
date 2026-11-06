// Dibujos compartidos de los videos animados (personajes, sticker, tarjeta,
// celular, destellos) y la plantilla de escena de HyperFrames con la línea
// "temblorosa" de dibujo a mano. Lo usan ml-cartoon y ml-competencia.
export const C = {
  tinta: "#111111",
  papel: "#F7F7F7",
  gris: "#EAEAEA",
  niebla: "#C8D8E8",
  verde: "#C8DDD0",
  piel: "#F2C9A0",
  piel2: "#C98E62",
  pelo: "#3B2A20",
  azul: "#3D6FD6",
  madera: "#D9C7AE",
};
export const L = `stroke="${C.tinta}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

export const CSS = `
#root{position:absolute;inset:0;font-family:Montserrat,sans-serif;color:#111;overflow:hidden;background:${C.papel}}
.tit{position:absolute;left:80px;right:80px;margin:0;font-weight:800;font-size:92px;line-height:1.02;letter-spacing:-0.035em}
.acc{background:${C.niebla};color:#111;padding:0 .1em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.chip{position:absolute;font-weight:700;font-size:36px;background:#fff;color:#111;border:5px solid #111;border-radius:999px;padding:12px 30px;white-space:nowrap}
.chip.dato{background:${C.niebla}}
.chip.negro{background:#111;color:#fff}
.etq{position:absolute;font-weight:600;font-size:28px;color:#5e5e5e;background:#fff;border:2px solid #dcdfe4;border-radius:999px;padding:8px 22px}
svg.esc{position:absolute;left:0;top:0;width:1080px;height:1920px}
`;

export const boilDefs = (id) => `
  <filter id="${id}-boil" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence id="${id}-turb" type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="1"/>
    <feDisplacementMap in="SourceGraphic" scale="5"/>
  </filter>`;

// Hace temblar la línea: cambia la semilla 12 veces por segundo, siempre igual en cada render.
export const boilJs = (id, dur) => `
    const turb = document.querySelector("#${id}-turb");
    const reloj = { t: 0 };
    tl.to(reloj, { t: ${dur}, duration: ${dur}, ease: "none", onUpdate: () => turb.setAttribute("seed", String(1 + (Math.floor(reloj.t * 12) % 6))) }, 0);`;

/** Persona plana. Origen en los pies. Partes con id para animar:
 * -cuerpo, -cabeza, -bD/-bI (brazos, giran desde el hombro), -feliz/-serio/-boste (bocas),
 * -ojos, -parp (párpados). */
export function persona(id, { camisa = C.niebla, pelo = C.pelo, piel = C.piel, delantal = false, bigote = false, mano = "" } = {}) {
  return `
  <g id="${id}">
    <g id="${id}-cuerpo">
      <rect x="-58" y="-235" width="46" height="235" rx="18" fill="#2B2B2B" ${L}/>
      <rect x="12" y="-235" width="46" height="235" rx="18" fill="#2B2B2B" ${L}/>
      <ellipse cx="-40" cy="-2" rx="42" ry="18" fill="#111"/>
      <ellipse cx="40" cy="-2" rx="42" ry="18" fill="#111"/>
      <rect x="-100" y="-480" width="200" height="275" rx="56" fill="${camisa}" ${L}/>
      ${delantal ? `<path d="M-70 -380 H70 V-215 Q0 -195 -70 -215 Z" fill="#111" ${L}/>` : ""}
      <g id="${id}-bI"><rect x="-128" y="-460" width="44" height="210" rx="22" fill="${camisa}" ${L}/><circle cx="-106" cy="-245" r="28" fill="${piel}" ${L}/></g>
      <g id="${id}-bD"><rect x="84" y="-460" width="44" height="210" rx="22" fill="${camisa}" ${L}/><circle cx="106" cy="-245" r="28" fill="${piel}" ${L}/>${mano}</g>
      <g id="${id}-cabeza">
        <rect x="-26" y="-510" width="52" height="40" fill="${piel}" ${L}/>
        <circle cx="0" cy="-600" r="100" fill="${piel}" ${L}/>
        <path d="M-100 -615 Q-95 -715 0 -712 Q95 -715 100 -615 Q60 -665 0 -660 Q-60 -665 -100 -615 Z" fill="${pelo}" ${L}/>
        <circle cx="-62" cy="-575" r="14" fill="#E9A48C" opacity=".8"/>
        <circle cx="62" cy="-575" r="14" fill="#E9A48C" opacity=".8"/>
        <g id="${id}-ojos"><ellipse cx="-34" cy="-605" rx="10" ry="14" fill="#111"/><ellipse cx="34" cy="-605" rx="10" ry="14" fill="#111"/></g>
        <g id="${id}-parp" opacity="0"><path d="M-50 -606 H-18 M18 -606 H50" ${L} fill="none"/></g>
        ${bigote ? `<path d="M-40 -560 Q-20 -578 0 -565 Q20 -578 40 -560 Q20 -550 0 -556 Q-20 -550 -40 -560 Z" fill="${pelo}" ${L}/>` : ""}
        <path id="${id}-feliz" d="M-36 -548 Q0 -505 36 -548" fill="none" ${L}/>
        <path id="${id}-serio" d="M-26 -540 H26" fill="none" ${L} opacity="0"/>
        <ellipse id="${id}-boste" cx="0" cy="-535" rx="22" ry="30" fill="#5A2A2A" ${L} opacity="0"/>
      </g>
    </g>
  </g>`;
}

/** El sticker (10x10 cm): banda azul con estrellas, ícono NFC y QR. Centro en 0,0, lado 300. */
export function sticker(id, cara = "") {
  return `
  <g id="${id}">
    <rect x="-150" y="-150" width="300" height="300" rx="34" fill="#fff" ${L}/>
    <path d="M-147 -120 Q-147 -147 -120 -147 H120 Q147 -147 147 -120 V-30 Q70 -5 0 -30 Q-70 -55 -147 -30 Z" fill="${C.azul}"/>
    <path d="M-150 -30 Q-70 -55 0 -30 Q70 -5 150 -30" fill="none" ${L}/>
    ${cara ? "" : `<text data-layout-ignore x="0" y="-92" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="34" fill="#FFD54A">★★★★★</text>
    <text data-layout-ignore x="0" y="-52" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="24" fill="#fff">Dejá tu reseña</text>`}
    <g transform="translate(-72 62)"><path d="M-30 -30 Q-10 0 -30 30 M-12 -44 Q16 0 -12 44 M6 -58 Q42 0 6 58" fill="none" ${L}/></g>
    <g transform="translate(60 60)"><rect x="-55" y="-55" width="110" height="110" fill="#fff" ${L}/>
      <rect x="-42" y="-42" width="30" height="30" fill="#111"/><rect x="12" y="-42" width="30" height="30" fill="#111"/><rect x="-42" y="12" width="30" height="30" fill="#111"/>
      <rect x="18" y="18" width="10" height="10" fill="#111"/><rect x="32" y="30" width="10" height="10" fill="#111"/><rect x="18" y="36" width="8" height="8" fill="#111"/></g>
    ${cara}
  </g>`;
}

/** La tarjeta (formato tarjeta de crédito). Centro en 0,0, 340x214. */
export function tarjeta(id, cara = "") {
  return `
  <g id="${id}">
    <rect x="-170" y="-107" width="340" height="214" rx="24" fill="#fff" ${L}/>
    <path d="M-167 -85 Q-167 -104 -148 -104 H148 Q167 -104 167 -85 V-30 Q80 -5 0 -30 Q-80 -55 -167 -30 Z" fill="${C.azul}"/>
    <path d="M-170 -30 Q-80 -55 0 -30 Q80 -5 170 -30" fill="none" ${L}/>
    ${cara ? "" : `<text data-layout-ignore x="0" y="-55" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="30" fill="#FFD54A">★★★★★</text>`}
    <g transform="translate(-80 40)"><path d="M-24 -24 Q-8 0 -24 24 M-10 -36 Q12 0 -10 36 M4 -48 Q34 0 4 48" fill="none" ${L}/></g>
    <g transform="translate(80 40)"><rect x="-44" y="-44" width="88" height="88" fill="#fff" ${L}/>
      <rect x="-34" y="-34" width="24" height="24" fill="#111"/><rect x="10" y="-34" width="24" height="24" fill="#111"/><rect x="-34" y="10" width="24" height="24" fill="#111"/><rect x="14" y="14" width="10" height="10" fill="#111"/></g>
    ${cara}
  </g>`;
}

export const caritaPieza = (id, dy = 0) => `
    <g id="${id}-cara" transform="translate(0 ${dy})">
      <circle cx="-38" cy="-8" r="19" fill="#fff" ${L}/><circle cx="38" cy="-8" r="19" fill="#fff" ${L}/>
      <circle cx="-34" cy="-6" r="8" fill="#111"/><circle cx="42" cy="-6" r="8" fill="#111"/>
      <path d="M-22 18 Q0 38 22 18" fill="#fff" ${L}/>
    </g>`;

/** Celular. Centro en 0,0, 300x560. `pantalla` es contenido SVG dentro de la pantalla. */
export function celu(id, pantalla = "") {
  return `
  <g id="${id}">
    <rect x="-150" y="-280" width="300" height="560" rx="46" fill="#111" ${L}/>
    <rect x="-130" y="-255" width="260" height="510" rx="30" fill="#fff"/>
    <rect x="-40" y="-246" width="80" height="16" rx="8" fill="#111"/>
    ${pantalla}
  </g>`;
}

export const ondas = (id, x, y) =>
  [0, 1, 2].map((i) => `<circle id="${id}-o${i}" cx="${x}" cy="${y}" r="90" fill="none" stroke="${C.niebla}" stroke-width="12" opacity="0"/>`).join("");

export const destello = (id, x, y, s = 1) =>
  `<path id="${id}" transform="translate(${x} ${y}) scale(${s})" d="M0 -40 L10 -10 L40 0 L10 10 L0 40 L-10 10 L-40 0 L-10 -10 Z" fill="#FFD54A" ${L}/>`;

export function escena(id, dur, { fondo = C.papel, svg = "", html = "", js = "" }) {
  return `<template>
  <style>
${CSS}
#root{background:${fondo}}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">
    <svg class="esc" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>${boilDefs(id)}</defs>
      <g filter="url(#${id}-boil)">${svg}</g>
    </svg>
${html}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });${boilJs(id, dur)}
${js}
    window.__timelines["${id}"] = tl;
  </script>
</template>
`;
}

