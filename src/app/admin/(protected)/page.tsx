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
    db.from("product_lines").select("*", { count: "exact", head: true }),
    db.from("product_images").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Productos", value: products.count ?? 0 },
    { label: "Publicados", value: activeProducts.count ?? 0 },
    { label: "Líneas de regalo", value: lines.count ?? 0 },
    { label: "Imágenes", value: images.count ?? 0 },
  ];

  const failed = [products, activeProducts, lines, images].find((r) => r.error);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Resumen del catálogo de Dulces Sivar.
        </p>
      </div>

      {failed?.error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo leer la base de datos: {failed.error.message}. ¿Ya
          ejecutaste <code>supabase/schema.sql</code> en el SQL Editor de
          Supabase?
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-4"
            >
              <dt className="text-sm text-neutral-500">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-neutral-900">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/productos"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Gestionar productos
        </Link>
        <Link
          href="/admin/lineas"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Gestionar líneas
        </Link>
      </div>
    </div>
  );
}
