import type { Metadata } from "next";

import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { FilterSidebar } from "@/components/catalog/filter-sidebar";
import { ProductCard } from "@/components/catalog/product-card";
import {
  applyFilters,
  facetCounts,
  parseFilters,
  type CatalogProduct,
} from "@/lib/catalog-filters";
import { publicEnv } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/public";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora los regalos de Dulce Sivar por ocasión, tipo de caja, contenido y presupuesto.",
};

export default async function CatalogoPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const params = await searchParams;

  const [groupsResult, productsResult] = await Promise.all([
    supabasePublic
      .from("attribute_groups")
      .select("*, attribute_values(*)")
      .eq("is_active", true)
      .eq("show_in_filters", true)
      .order("sort_order"),
    supabasePublic
      .from("products")
      .select(
        "*, product_images(storage_path, is_cover, sort_order), product_contents(label, quantity, sort_order), product_attributes(value_id)",
      )
      .eq("is_active", true),
  ]);

  const groups = (groupsResult.data ?? []) as AttributeGroupWithValues[];
  const products = (productsResult.data ?? []) as CatalogProduct[];

  const slugToId = new Map<string, string>();
  for (const group of groups) {
    for (const value of group.attribute_values) {
      slugToId.set(`${group.slug}:${value.slug}`, value.id);
    }
  }

  const filters = parseFilters(params, groups);
  const visible = applyFilters(products, filters, slugToId);
  const counts = facetCounts(products, filters, groups, slugToId);

  const prices = products
    .map((p) => p.price_usd)
    .filter((p): p is number => p != null);
  const priceBounds = {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };

  const publicUrlBase = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-brand-green">Catálogo</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="lg:sticky lg:top-6">
          <FilterSidebar
            groups={groups}
            filters={filters}
            counts={counts}
            priceBounds={priceBounds}
            total={products.length}
            shown={visible.length}
          />
        </div>

        <div className="flex flex-col gap-5">
          <CatalogToolbar
            query={filters.query}
            sort={filters.sort}
            shown={visible.length}
            total={products.length}
          />

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-raised px-6 py-16 text-center">
              <p className="text-lg font-medium text-ink">
                Ningún regalo coincide con esos filtros.
              </p>
              <p className="text-base text-ink-muted">
                Prueba quitando alguno o ampliando el rango de precio.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  publicUrlBase={publicUrlBase}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
