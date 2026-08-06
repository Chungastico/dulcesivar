import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Líneas de regalo",
  robots: { index: false, follow: false },
};

export default async function AdminLinesPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: lines, error } = await db
    .from("product_lines")
    .select("id, name, slug, is_active, sort_order")
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-green">
          Líneas de regalo
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cada línea genera un link compartible:{" "}
          <code className="rounded bg-brand-cream px-1.5 py-0.5 text-brand-green">/catalogo?linea=bodas</code>
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink">
          {error.message}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface-raised">
          {lines?.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex-1 text-sm font-medium text-ink">
                {l.name}
              </span>
              <code className="rounded bg-brand-cream px-1.5 py-0.5 text-xs text-brand-green">{l.slug}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
