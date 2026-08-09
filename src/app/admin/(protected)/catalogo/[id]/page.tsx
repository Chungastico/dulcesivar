import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { updateProduct } from "@/lib/actions/products";
import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Editar producto",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: PageProps<"/admin/catalogo/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const db = supabaseAdmin();
  const [productResult, groupsResult, presetsResult] = await Promise.all([
    db
      .from("products")
      .select("*, product_contents(*), product_images(*), product_attributes(value_id)")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("attribute_groups")
      .select("*, attribute_values(*)")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("content_presets")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order"),
  ]);

  const product = productResult.data;
  if (!product) notFound();

  const images = [...product.product_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const contents = [...product.product_contents]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ label: c.label, quantity: c.quantity, presetId: c.preset_id }));

  const publicUrlBase = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;

  return (
    <div className="flex max-w-6xl flex-col gap-5 pb-10">
      <div>
        <Link
          href="/admin/catalogo"
          className="text-sm text-ink-muted transition hover:text-brand-green"
        >
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          {product.name}
        </h1>
      </div>

      {/* La gestión de fotos ya guardadas (portada / borrar) vive dentro del
          panel "Foto de referencia" del formulario: antes había una galería
          aparte arriba que mostraba la misma foto dos veces en pantalla. */}
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        groups={groupsResult.data ?? []}
        presets={presetsResult.data ?? []}
        existingImages={images.length}
        existingPhotos={images.map((i) => ({
          id: i.id,
          url: `${publicUrlBase}/${i.storage_path}`,
          isCover: i.is_cover,
        }))}
        submitLabel="Guardar cambios"
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          price_usd: product.price_usd != null ? String(product.price_usd) : "",
          is_active: product.is_active,
          is_featured: product.is_featured,
          has_laser_engraving: product.has_laser_engraving,
          labor_size: product.labor_size,
          decor_materials_cost: String(product.decor_materials_cost ?? 0),
          valueIds: product.product_attributes.map((a) => a.value_id),
          contents,
        }}
      />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-red-900">
            Zona de peligro
          </h2>
          <p className="text-sm text-ink-muted">
            Elimina este producto, sus fotos y su configuración permanentemente.
          </p>
        </div>
        <DeleteProductButton productId={product.id} productName={product.name} />
      </section>
    </div>
  );
}
