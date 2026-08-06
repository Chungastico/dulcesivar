import type { Metadata } from "next";

import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Categorías",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const { data: groups, error } = await supabaseAdmin()
    .from("attribute_groups")
    .select("*, attribute_values(*)")
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-green">Categorías</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Cada categoría es una forma distinta de clasificar un regalo, y se
          combinan entre sí: una misma caja puede ser de{" "}
          <em>cumpleaños</em>, tipo <em>Morning Box</em>, para <em>mamá</em> y{" "}
          <em>con globos</em>. Haz clic en cualquier nombre para editarlo.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink">
          {error.message}. ¿Ya ejecutaste{" "}
          <code>supabase/migrations/002_taxonomia.sql</code> en Supabase?
        </p>
      ) : (
        <TaxonomyManager groups={groups ?? []} />
      )}
    </div>
  );
}
