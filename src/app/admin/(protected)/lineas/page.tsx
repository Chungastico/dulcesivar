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
        <h1 className="text-2xl font-semibold text-neutral-900">
          Líneas de regalo
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cada línea genera un link compartible:{" "}
          <code className="text-neutral-700">/catalogo?linea=bodas</code>
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error.message}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {lines?.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex-1 text-sm font-medium text-neutral-900">
                {l.name}
              </span>
              <code className="text-xs text-neutral-500">{l.slug}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
