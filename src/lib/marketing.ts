/**
 * Consultas que solo usan las páginas de aterrizaje (/, regalos
 * personalizados, grabado láser).
 *
 * El catálogo trae todos los productos y filtra en memoria porque ahí el
 * usuario cambia de filtro a cada rato. Aquí es al revés: cada página muestra
 * una selección fija y pequeña, así que se pide ya filtrado a Postgres y no se
 * arrastra el catálogo entero en cada visita de alguien que llegó de Google.
 */

import "server-only";

import type { CatalogProduct } from "@/lib/catalog-filters";
import { publicEnv } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/public";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

const PRODUCT_SELECT =
  "*, product_images(storage_path, is_cover, sort_order), product_contents(label, quantity, sort_order), product_attributes(value_id)";

export const publicImageBase = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;

/** Lo destacado primero y, dentro de eso, lo más nuevo. */
export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const { data } = await supabasePublic
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as CatalogProduct[];
}

/**
 * Productos que llevan alguno de los valores indicados de un eje.
 * Ej.: contenido = ["grabado-laser"] para la página de grabado.
 *
 * Son tres viajes y no un join porque el cliente público de Supabase no puede
 * filtrar por una tabla anidada sin traerse todo lo demás igual.
 */
export async function getProductsByAttribute(
  groupSlug: string,
  valueSlugs: string[],
  limit = 8,
): Promise<CatalogProduct[]> {
  const { data: group } = await supabasePublic
    .from("attribute_groups")
    .select("id, attribute_values(id, slug)")
    .eq("slug", groupSlug)
    .maybeSingle();

  const values = (group?.attribute_values ?? []) as { id: string; slug: string }[];
  const valueIds = values
    .filter((v) => valueSlugs.includes(v.slug))
    .map((v) => v.id);
  if (valueIds.length === 0) return [];

  const { data: matches } = await supabasePublic
    .from("product_attributes")
    .select("product_id")
    .in("value_id", valueIds);

  const productIds = [...new Set((matches ?? []).map((m) => m.product_id))];
  if (productIds.length === 0) return [];

  const { data } = await supabasePublic
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as CatalogProduct[];
}

export type TaxonomyValue = { slug: string; name: string; count: number };

/**
 * Los valores activos de un eje, con cuántos regalos tiene cada uno. El conteo
 * es lo que evita enlazar a un catálogo vacío desde una página de aterrizaje:
 * los que están en cero no se pintan.
 */
export async function getTaxonomy(groupSlug: string): Promise<TaxonomyValue[]> {
  const [groupResult, productsResult] = await Promise.all([
    supabasePublic
      .from("attribute_groups")
      .select("*, attribute_values(*)")
      .eq("slug", groupSlug)
      .maybeSingle(),
    supabasePublic
      .from("products")
      .select("id, product_attributes(value_id)")
      .eq("is_active", true),
  ]);

  const group = groupResult.data as AttributeGroupWithValues | null;
  const products =
    (productsResult.data as { product_attributes: { value_id: string }[] }[]) ??
    [];

  const counts = new Map<string, number>();
  for (const product of products) {
    for (const attr of product.product_attributes) {
      counts.set(attr.value_id, (counts.get(attr.value_id) ?? 0) + 1);
    }
  }

  return (group?.attribute_values ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      slug: v.slug,
      name: v.name,
      count: counts.get(v.id) ?? 0,
    }))
    .filter((v) => v.count > 0);
}

/**
 * Versión ligera de getTaxonomy para el pie: no cuenta productos y por tanto
 * no se trae el catálogo entero. El pie aparece en todas las páginas, incluida
 * la del catálogo, que es dinámica; ahí una consulta de más se paga en cada
 * visita. A cambio, un enlace puede caer en un listado vacío si el panel deja
 * activa una ocasión sin regalos.
 */
export async function getOccasionLinks(
  limit: number,
): Promise<{ slug: string; name: string }[]> {
  const { data } = await supabasePublic
    .from("attribute_groups")
    .select("attribute_values(slug, name, sort_order, is_active)")
    .eq("slug", "ocasion")
    .maybeSingle();

  return (data?.attribute_values ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, limit)
    .map((v) => ({ slug: v.slug, name: v.name }));
}

export type PresetGroup = { category: string; items: string[] };

/**
 * La biblioteca de insumos, agrupada por categoría. Es el inventario real de
 * lo que puede entrar en una caja, así que sirve de contenido: nombra cosas
 * concretas ("Vaso vinero 12 onz personalizado a láser") en vez del "amplia
 * variedad de productos" que no busca nadie.
 */
export async function getContentPresets(
  perCategory = 10,
): Promise<PresetGroup[]> {
  const { data } = await supabasePublic
    .from("content_presets")
    .select("label, category, sort_order")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  const rows = (data ?? []) as { label: string; category: string }[];

  const byCategory = new Map<string, string[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    if (list.length < perCategory) list.push(row.label);
    byCategory.set(row.category, list);
  }

  return [...byCategory.entries()].map(([category, items]) => ({
    category,
    items,
  }));
}
