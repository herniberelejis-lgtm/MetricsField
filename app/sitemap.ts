import type { MetadataRoute } from "next";
import landing from "@/lib/landing-rutas.json";

// Igual que robots.ts: solo el sitio público y las páginas legales son
// contenido real para un buscador. El resto (login, admin, portal, t/*) no
// tiene nada que hacer en un sitemap. Las rutas del sitio público las
// escribe scripts/landing/generar.mjs en lib/landing-rutas.json.
export default function sitemap(): MetadataRoute.Sitemap {
  const actualizado = new Date(landing.actualizado);
  return [
    ...landing.rutas.map((ruta) => ({
      url: `https://metricsfield.com${ruta}`,
      lastModified: actualizado,
      changeFrequency: (ruta === "/" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: ruta === "/" ? 1 : ruta.startsWith("/guias/") ? 0.7 : 0.8,
    })),
    {
      url: "https://metricsfield.com/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://metricsfield.com/terms",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
