import type { NextConfig } from "next";

// Cabeceras de seguridad para TODAS las respuestas. Lo más importante:
// frame-ancestors 'none' — nadie puede meter /login ni /portal en un iframe
// (clickjacking), reforzado por X-Frame-Options: DENY para navegadores que
// todavía no soportan CSP. Una CSP completa (script-src etc.) queda para más
// adelante: requiere trabajo aparte por los estilos inline de Next/Tailwind.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "geo-seo-analytics.vercel.app" }],
        destination: "https://app.metricsfield.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
