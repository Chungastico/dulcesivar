/**
 * Consultas a Supabase que alimentan el catálogo público, cacheadas con el
 * Data Cache de Next.js.
 *
 * Sin esto, cada visita a /catalogo o a una ficha de producto le pegaba a
 * Supabase desde cero, sin importar cuántas visitas idénticas hubiera
 * ocurrido segundos antes. Todas comparten el tag "catalog": cualquier
 * cambio desde el panel admin lo invalida entero vía revalidateTag.
 */
import { unstable_cache } from "next/cache";

import type { CatalogProduct } from "@/lib/catalog-filters";
import { supabasePublic } from "@/lib/supabase/public";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

const REVALIDATE_SECONDS = 300;
const TAGS = ["catalog"];

const PRODUCT_SELECT =
  "*, product_images(storage_path, is_cover, sort_order), product_contents(label, quantity, sort_order), product_attributes(value_id)";

export const getCatalogData = unstable_cache(
  async () => {
    const [groupsResult, productsResult] = await Promise.all([
      supabasePublic
        .from("attribute_groups")
        .select("*, attribute_values(*)")
        .eq("is_active", true)
        .eq("show_in_filters", true)
        .order("sort_order"),
      supabasePublic.from("products").select(PRODUCT_SELECT).eq("is_active", true),
    ]);

    if (groupsResult.error || productsResult.error) {
      console.error(
        "Error cargando el catálogo:",
        groupsResult.error ?? productsResult.error,
      );
      throw new Error("No se pudo cargar el catálogo.");
    }

    return {
      groups: (groupsResult.data ?? []) as AttributeGroupWithValues[],
      products: (productsResult.data ?? []) as CatalogProduct[],
    };
  },
  ["catalog-data"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    const { data, error } = await supabasePublic
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error cargando el producto:", error);
      throw new Error("No se pudo cargar el producto.");
    }

    return data as CatalogProduct | null;
  },
  ["product-by-slug"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const getProductTags = unstable_cache(
  async (valueIds: string[]) => {
    if (valueIds.length === 0) return [];

    const { data, error } = await supabasePublic
      .from("attribute_values")
      .select("id, name, slug, is_active, attribute_groups(slug, show_in_filters)")
      .in("id", valueIds)
      .eq("is_active", true);

    if (error) {
      console.error("Error cargando las etiquetas del producto:", error);
      return [];
    }

    return data ?? [];
  },
  ["product-tags"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

/**
 * Otros regalos que comparten al menos una etiqueta con este, ordenados por
 * cuántas comparten. Sin eso, "recomendados" sería solo lo más reciente y no
 * tendría nada que ver con lo que se está viendo.
 */
export const getRelatedProducts = unstable_cache(
  async (productId: string, valueIds: string[]) => {
    if (valueIds.length === 0) return [];

    const { data: sharing } = await supabasePublic
      .from("product_attributes")
      .select("product_id")
      .in("value_id", valueIds)
      .neq("product_id", productId);

    const scores = new Map<string, number>();
    for (const row of sharing ?? []) {
      scores.set(row.product_id, (scores.get(row.product_id) ?? 0) + 1);
    }
    if (scores.size === 0) return [];

    const topIds = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    const { data: related } = await supabasePublic
      .from("products")
      .select(PRODUCT_SELECT)
      .in("id", topIds)
      .eq("is_active", true);

    // Supabase no promete el orden de un IN(); se reordena según el puntaje ya
    // calculado para que lo más parecido salga primero.
    return (related ?? []).sort(
      (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
    ) as CatalogProduct[];
  },
  ["related-products"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);
