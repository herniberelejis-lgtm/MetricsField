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
      <div style="${caja};width:220px"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">LOCALES</small><b style="display:block;font-size:64px;font-weight:800;color:${C.niebla};line-height:1.05">${locales}<span style="font-size:36px;color:#aaa">/${meta}</span></b></div>
      <div style="${caja};flex:1"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">¿RENUNCIO?</small>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px"><div style="flex:1;height:22px;border-radius:11px;background:#333;overflow:hidden"><div id="${id}-barra" style="height:100%;width:${Math.max(pct, 3)}%;background:${C.verde}"></div></div><b style="font-size:44px;font-weight:800;color:${C.verde}">${pct}%</b></div></div>
    </div>`;
}

/** Cartel "USTEDES ELIGIERON: X" (del episodio 2 en adelante). */
export const eligieron = (id, palabra, top = 240) => `
    <div id="${id}" style="position:absolute;left:150px;right:150px;top:${top}px;background:#111;border:5px solid #FFD54A;border-radius:22px;padding:16px 24px;text-align:center;font-family:Montserrat;transform:rotate(-3deg)">
      <small style="display:block;font-size:34px;font-weight:800;color:#fff">USTEDES ELIGIERON:</small>
      <b style="display:block;font-size:72px;font-weight:800;color:#FFD54A;line-height:1.05">${palabra}</b></div>`;
