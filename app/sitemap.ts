import type { MetadataRoute } from "next";

// Igual que robots.ts: solo la landing y las páginas legales son contenido
// público real. El resto (login, admin, portal, t/*) no tiene nada que
// hacer en un sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://metricsfield.com/",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
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
