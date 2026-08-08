import type { Metadata } from "next";
import Link from "next/link";

import { LinksManager } from "@/components/admin/links-manager";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Links",
  robots: { index: false, follow: false },
};

export default async function AdminLinksPage() {
  await requireAdmin();

  const db = supabaseAdmin();
  const [{ data: group, error }, { data: products }] = await Promise.all([
    db
      .from("attribute_groups")
      .select("*, attribute_values(*)")
      .eq("slug", "ocasion")
      .maybeSingle(),
    db.from("products").select("id, product_attributes(value_id)").eq("is_active", true),
  ]);

  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    for (const attr of product.product_attributes) {
      counts.set(attr.value_id, (counts.get(attr.value_id) ?? 0) + 1);
    }
  }

  const values = (group?.attribute_values ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      is_active: v.is_active,
      count: counts.get(v.id) ?? 0,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-green">Links</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          El orden en que aparecen las ocasiones en{" "}
          <a
            href="/enlaces"
            target="_blank"
            className="underline hover:text-brand-green"
          >
            /enlaces
          </a>
          , la página que compartes en Instagram. Es el mismo campo que usa el
          filtro «Ocasión» del catálogo, así que moverlas aquí también cambia
          su orden ahí. Para agregar, ocultar o renombrar una ocasión, ve a{" "}
          <Link href="/admin/categorias" className="underline hover:text-brand-green">
            Categorías
          </Link>
          .
        </p>
      </div>

      {error || !group ? (
        <p className="rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink">
          {error?.message ?? "No se encontró la categoría «Ocasión»."} ¿Ya
          ejecutaste <code>supabase/migrations/002_taxonomia.sql</code> en
          Supabase?
        </p>
      ) : values.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface-raised px-4 py-3 text-sm text-ink-muted">
          Todavía no hay ocasiones. Créalas desde{" "}
          <Link href="/admin/categorias" className="underline hover:text-brand-green">
            Categorías
          </Link>
          .
        </p>
      ) : (
        <LinksManager groupId={group.id} values={values} />
      )}
    </div>
  );
}
