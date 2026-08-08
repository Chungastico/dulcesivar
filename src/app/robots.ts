import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel está detrás de Clerk, pero además no tiene por qué aparecer
      // en resultados de búsqueda.
      disallow: ["/admin", "/admin/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
