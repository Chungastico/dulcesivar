import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
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

      {/* Gestión de fotos ya guardadas (portada / borrar). Va en su propia
          tarjeta, separada del asistente de pasos de abajo, para que no se
          confunda con "elegir fotos nuevas" del paso 1. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5">
        <h2 className="text-base font-semibold text-brand-green">
          Imágenes guardadas
        </h2>
        <ProductImages images={images} publicUrlBase={publicUrlBase} />
      </section>

      <ProductForm
        action={updateProduct.bind(null, product.id)}
        groups={groupsResult.data ?? []}
        presets={presetsResult.data ?? []}
        existingImages={images.length}
        existingImageUrls={images.map((i) => `${publicUrlBase}/${i.storage_path}`)}
        submitLabel="Guardar cambios"
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          price_usd: product.price_usd != null ? String(product.price_usd) : "",
          is_active: product.is_active,
          is_featured: product.is_featured,
          valueIds: product.product_attributes.map((a) => a.value_id),
          contents,
        }}
      />

      <section className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <h2 className="text-base font-semibold text-red-800">
          Eliminar producto
        </h2>
        <p className="text-sm text-red-800/80">
          Borra el producto, su contenido y sus imágenes. No se puede deshacer.
        </p>
        <div className="mt-1">
          <DeleteProductButton productId={product.id} productName={product.name} />
        </div>
      </section>
    </div>
  );
}
