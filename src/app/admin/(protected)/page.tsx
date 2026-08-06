import Link from "next/link";
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  // `head: true` => solo pide el conteo, no trae filas.
  const [products, activeProducts, lines, images] = await Promise.all([
    db.from("products").select("*", { count: "exact", head: true }),
    db
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    db.from("attribute_values").select("*", { count: "exact", head: true }),
    db.from("product_images").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Productos", value: products.count ?? 0, accent: "bg-brand-green" },
    {
      label: "Publicados",
      value: activeProducts.count ?? 0,
      accent: "bg-brand-teal",
    },
    { label: "Categorías", value: lines.count ?? 0, accent: "bg-brand-lime" },
    { label: "Imágenes", value: images.count ?? 0, accent: "bg-brand-orange" },
  ];

  const failed = [products, activeProducts, lines, images].find((r) => r.error);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-green">Panel</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Resumen del catálogo de Dulces Sivar.
        </p>
      </div>

      {failed?.error ? (
        <p className="rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink">
          No se pudo leer la base de datos: {failed.error.message}. ¿Ya
          ejecutaste <code>supabase/schema.sql</code> en el SQL Editor de
          Supabase?
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-xl border border-line bg-surface-raised px-4 py-4"
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1 ${s.accent}`}
              />
              <dt className="text-sm text-ink-muted">{s.label}</dt>
              <dd className="mt-1 text-3xl font-semibold text-brand-green">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/catalogo/nuevo"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-95"
        >
          + Nuevo producto
        </Link>
        <Link
          href="/admin/catalogo"
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Gestionar catálogo
        </Link>
        <Link
          href="/admin/categorias"
          className="rounded-lg border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-brand-green transition hover:bg-brand-cream/40"
        >
          Gestionar categorías
        </Link>
      </div>
    </div>
  );
}
