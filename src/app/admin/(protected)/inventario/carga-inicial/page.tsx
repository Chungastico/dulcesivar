import Link from "next/link";
import type { Metadata } from "next";

import { BulkStockTable } from "@/components/admin/bulk-stock-table";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { InventoryStatus } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Carga inicial de inventario",
  robots: { index: false, follow: false },
};

export default async function CargaInicialPage() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin()
    .from("inventory_status")
    .select("*")
    .order("category")
    .order("label");

  const items = (data ?? []) as InventoryStatus[];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/inventario"
          className="text-base text-ink-muted transition hover:text-brand-green"
        >
          ← Inventario
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-green">
          Carga de stock por lote
        </h1>
        <p className="mt-1 max-w-2xl text-base text-ink-muted">
          Escribe cantidad y costo total en la fila de cada insumo que tengas y
          guarda todos de una vez, en vez de registrar uno por uno. Deja en
          blanco los que no apliquen.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          {error.message}
        </p>
      ) : (
        <BulkStockTable items={items} />
      )}
    </div>
  );
}
