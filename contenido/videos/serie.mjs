// Piezas fijas de la serie "30 días para renunciar": el marcador de arriba
// (días para renunciar, locales y el medidor "¿ME BANCA?") y el cartel de
// "USTEDES ELIGIERON". Todos los episodios lo usan igual.

import { C } from "./dibujos.mjs";

const caja = "background:#111;border:4px solid #333;border-radius:20px;padding:10px 18px;color:#fff;text-align:center";

/** Marcador fijo arriba. `estado`: { dias, locales, meta, banca (0–100) }:
 * días para renunciar, locales con la pieza y cuánto "me banca" el negocio. */
export function hud(id, { dias, locales, meta, banca }) {
  return `
    <div id="${id}" style="position:absolute;left:40px;right:40px;top:40px;display:flex;gap:16px;font-family:Montserrat">
      <div style="${caja};width:250px"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">DÍAS PARA RENUNCIAR</small><b style="display:block;font-size:64px;font-weight:800;color:#FFD54A;line-height:1.05">${dias}</b></div>
      <div style="${caja};width:220px"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">LOCALES</small><b style="display:block;font-size:64px;font-weight:800;color:${C.niebla};line-height:1.05">${locales}<span style="font-size:36px;color:#aaa">/${meta}</span></b></div>
      <div style="${caja};flex:1"><small style="display:block;font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.1">¿ME BANCA?</small>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px"><div style="flex:1;height:22px;border-radius:11px;background:#333;overflow:hidden"><div id="${id}-barra" style="height:100%;width:${Math.max(banca, 3)}%;background:${C.verde}"></div></div><b style="font-size:44px;font-weight:800;color:${C.verde}">${banca}%</b></div></div>
    </div>`;
}

/** Cartel "USTEDES ELIGIERON: X" (del episodio 2 en adelante). */
export const eligieron = (id, palabra, top = 240) => `
    <div id="${id}" style="position:absolute;left:150px;right:150px;top:${top}px;background:#111;border:5px solid #FFD54A;border-radius:22px;padding:16px 24px;text-align:center;font-family:Montserrat;transform:rotate(-3deg)">
      <small style="display:block;font-size:34px;font-weight:800;color:#fff">USTEDES ELIGIERON:</small>
      <b style="display:block;font-size:72px;font-weight:800;color:#FFD54A;line-height:1.05">${palabra}</b></div>`;
