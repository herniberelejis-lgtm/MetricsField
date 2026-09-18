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
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
