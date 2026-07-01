/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La base de datos (data/db.json) y el seed viajan con el bundle serverless:
  // sin esto, Vercel no incluye el archivo y el portal no tendría datos.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
