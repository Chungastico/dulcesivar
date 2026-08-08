import Link from "next/link";
import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Nuevo producto",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  await requireAdmin();

  const db = supabaseAdmin();
  const [groupsResult, presetsResult] = await Promise.all([
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

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <div>
        <Link
          href="/admin/catalogo"
          className="text-sm text-ink-muted transition hover:text-brand-green"
        >
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Nuevo producto
        </h1>
      </div>

      <ProductForm
        action={createProduct}
        groups={groupsResult.data ?? []}
        presets={presetsResult.data ?? []}
      />
    </div>
  );
}
