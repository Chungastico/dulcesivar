import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
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
    .select("id, name, slug, price_usd, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Productos</h1>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error.message}
        </p>
      ) : products?.length ? (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <span className="flex-1 text-sm font-medium text-neutral-900">
                {p.name}
              </span>
              <span className="text-sm text-neutral-500">
                {p.price_usd != null ? `$${p.price_usd}` : "—"}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  p.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {p.is_active ? "Publicado" : "Borrador"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
          Aún no hay productos. El formulario para crearlos llega en el
          siguiente paso.
        </p>
      )}
    </div>
  );
}
