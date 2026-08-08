import type { MetadataRoute } from "next";

import { site } from "@/lib/site";
import { supabasePublic } from "@/lib/supabase/public";

// El mapa se regenera cada hora, no en cada rastreo: los buscadores lo piden
// seguido y no hace falta pegarle a la base cada vez.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabasePublic
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const products = (data ?? []).map((product) => ({
    url: `${site.url}/catalogo/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // El producto más reciente marca cuándo cambió el catálogo por última vez.
  const catalogUpdated = data?.[0]
    ? new Date(data[0].updated_at)
    : new Date();

  return [
    {
      url: site.url,
      lastModified: catalogUpdated,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${site.url}/regalos-personalizados-el-salvador`,
      lastModified: catalogUpdated,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/grabado-laser-el-salvador`,
      lastModified: catalogUpdated,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/catalogo`,
      lastModified: catalogUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...products,
  ];
}
