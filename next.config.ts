import type { NextConfig } from "next";

// Cabeceras de seguridad para TODAS las respuestas. Lo más importante:
// frame-ancestors 'none' — nadie puede meter /login ni /portal en un iframe
// (clickjacking). Una CSP completa (script-src etc.) queda para más
// adelante: requiere trabajo aparte por los estilos inline de Next/Tailwind.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
