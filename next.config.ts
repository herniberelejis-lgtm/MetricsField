import type { NextConfig } from "next";

// Cabeceras de seguridad para TODAS las respuestas — salvo Content-Security-
// Policy, que NO va acá: necesita un nonce distinto en cada request (para
// permitir los scripts de hidratación de Next.js sin caer en 'unsafe-inline',
// que anularía la protección real contra un XSS futuro), y headers() de
// next.config.ts no puede generar un valor distinto por request. Esa vive en
// middleware.ts, que ahora corre en todas las rutas.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Páginas del sitio público (las mismas que reescribe rewrites() más abajo)
// y del producto, para mandar cada una a su dominio.
const RUTAS_SITIO = ["/reputacion", "/retail", "/loyalty", "/herramientas", "/guias", "/guias/:slug([a-z0-9-]+)"];
const RUTAS_PRODUCTO = ["/login", "/admin", "/admin/:path*", "/portal/:path*", "/t/:path*", "/baja"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no revelar "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasSeguridad }];
  },
  // El dominio que asigna Vercel solo (geo-seo-analytics.vercel.app) sirve
  // el mismo sitio que app.metricsfield.com — sin este redirect, Google ve
  // contenido duplicado en dos dominios. No se puede sacar ese dominio del
  // proyecto (Vercel lo necesita como fallback), así que se redirige en vez
  // de borrarlo. Solo el dominio exacto de producción — no toca los
  // *.vercel.app de cada preview de rama, que tienen que seguir sirviendo
  // su propio contenido para poder probarlas.
  //
  // app.metricsfield.com es el subdominio de producto: sin sesión, "/" tiene
  // que mandar directo a /login en vez de la landing de venta.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "geo-seo-analytics.vercel.app" }],
        destination: "https://app.metricsfield.com/:path*",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "app.metricsfield.com" }],
        destination: "/login",
        permanent: false,
      },
      // Un solo dominio por página, para que Google no las vea duplicadas
      // (Search Console: "Duplicada: el usuario no ha indicado ninguna
      // versión canónica"). www va siempre al dominio sin www.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.metricsfield.com" }],
        destination: "https://metricsfield.com/:path*",
        permanent: true,
      },
      // El producto se llama "Reviews" (como en Instagram) pero su página
      // es /reputacion, la dirección que ya indexó Google: metricsfield.com/
      // reviews es el atajo para compartir.
      { source: "/reviews", destination: "/reputacion", permanent: true },
      // El sitio público vive en metricsfield.com: en el subdominio de
      // producto, sus páginas mandan allá.
      ...RUTAS_SITIO.map((source) => ({
        source,
        has: [{ type: "host" as const, value: "app.metricsfield.com" }],
        destination: `https://metricsfield.com${source}`,
        permanent: true,
      })),
      // Y al revés: el producto (login, panel, portal, carteles) vive en
      // app.metricsfield.com. Temporal (307) a propósito: es por prolijidad,
      // y así un cartel viejo que apunte a metricsfield.com/t/… sigue
      // andando aunque algún día esto cambie. /api no entra: lo usan los
      // crons y los callbacks de OAuth, que ya apuntan a su dominio.
      ...RUTAS_PRODUCTO.map((source) => ({
        source,
        has: [{ type: "host" as const, value: "metricsfield.com" }],
        destination: `https://app.metricsfield.com${source}`,
        permanent: false,
      })),
    ];
  },
  // metricsfield.com y www muestran la landing de venta (estática, vive en
  // public/landing/) en la raíz del dominio, sin cambiar la URL que ve el
  // visitante. app.metricsfield.com no entra acá: ya se resuelve antes, en
  // redirects(), así que nunca llega a este rewrite.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "metricsfield.com" }],
          destination: "/landing/index.html",
        },
        {
          source: "/",
          has: [{ type: "host", value: "www.metricsfield.com" }],
          destination: "/landing/index.html",
        },
        // El resto del sitio público (scripts/landing/generar.mjs): una
        // página por vertical, las calculadoras de Intel y las guías.
        ...["reputacion", "retail", "loyalty", "herramientas", "guias"].map((p) => ({
          source: `/${p}`,
          destination: `/landing/${p}/index.html`,
        })),
        { source: "/guias/:slug([a-z0-9-]+)", destination: "/landing/guias/:slug/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
