import type { MetadataRoute } from "next";

// Solo la landing y la política de privacidad son contenido público real.
// El panel interno (/admin), el portal de cada cliente (/portal/[codigo]) y
// el star-gate de un tap (/t/[slug]) son herramientas privadas o redirects
// funcionales — no tienen nada que hacer en un buscador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/t"],
    },
    host: "https://geo-seo-analytics.vercel.app",
  };
}
