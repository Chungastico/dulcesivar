import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Catálogo",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: products, error } = await db
    .from("products")
    .select(
      "id, name, slug, price_usd, is_active, created_at, product_images(storage_path, is_cover), product_attributes(value_id)",
    )
    .order("created_at", { ascending: false });

  const publicUrlBase = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-brand-green">Catálogo</h1>
        <Link
          href="/admin/catalogo/nuevo"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-95"
        >
          + Nuevo producto
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink">
          {error.message}
        </p>
      ) : products?.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface-raised">
          {products.map((product) => {
            const cover =
              product.product_images.find((i) => i.is_cover) ??
              product.product_images[0];

            return (
              <li key={product.id} className="flex items-center gap-4 px-4 py-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-brand-cream/50">
                  {cover ? (
                    <Image
                      src={`${publicUrlBase}/${cover.storage_path}`}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/admin/catalogo/${product.id}`}
                    className="truncate text-sm font-medium text-ink hover:text-brand-green hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="text-xs text-ink-muted">
                    {product.product_attributes.length} etiqueta
                    {product.product_attributes.length === 1 ? "" : "s"}
                    {product.product_images.length
                      ? ` · ${product.product_images.length} imagen${product.product_images.length === 1 ? "" : "es"}`
                      : " · sin imágenes"}
                  </span>
                </div>

                <span className="hidden text-sm text-ink-muted sm:block">
                  {product.price_usd != null ? `$${product.price_usd}` : "—"}
                </span>

                <ToggleActiveButton
                  productId={product.id}
                  isActive={product.is_active}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-12 text-center">
          <p className="text-sm text-ink-muted">Aún no hay productos en el catálogo.</p>
          <Link
            href="/admin/catalogo/nuevo"
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Crear el primero
          </Link>
        </div>
      )}
    </div>
  );
}
