import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Productos",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: products, error } = await db
    .from("products")
    .select(
      "id, name, slug, price_usd, is_active, created_at, product_images(storage_path, is_cover), product_line_map(line_id)",
    )
    .order("created_at", { ascending: false });

  const publicUrlBase = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Nuevo producto
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error.message}
        </p>
      ) : products?.length ? (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {products.map((product) => {
            const cover =
              product.product_images.find((i) => i.is_cover) ??
              product.product_images[0];

            return (
              <li key={product.id} className="flex items-center gap-4 px-4 py-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
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
                    href={`/admin/productos/${product.id}`}
                    className="truncate text-sm font-medium text-neutral-900 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="text-xs text-neutral-500">
                    {product.product_line_map.length} línea
                    {product.product_line_map.length === 1 ? "" : "s"}
                    {product.product_images.length
                      ? ` · ${product.product_images.length} imagen${product.product_images.length === 1 ? "" : "es"}`
                      : " · sin imágenes"}
                  </span>
                </div>

                <span className="hidden text-sm text-neutral-500 sm:block">
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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 px-4 py-12 text-center">
          <p className="text-sm text-neutral-500">Aún no hay productos.</p>
          <Link
            href="/admin/productos/nuevo"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Crear el primero
          </Link>
        </div>
      )}
    </div>
  );
}
