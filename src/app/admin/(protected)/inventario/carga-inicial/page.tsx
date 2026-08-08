import Link from "next/link";
import type { Metadata } from "next";

import { BulkStockTable, type BulkVariant } from "@/components/admin/bulk-stock-table";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { InventoryStatus, InventoryVariantStatus } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Carga inicial de inventario",
  robots: { index: false, follow: false },
};

export default async function CargaInicialPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const [statusResult, variantResult] = await Promise.all([
    db.from("inventory_status").select("*").order("category").order("label"),
    db.from("inventory_variant_status").select("*").order("sort_order"),
  ]);

  const items = (statusResult.data ?? []) as InventoryStatus[];
  const variantStatus = (variantResult.data ?? []) as InventoryVariantStatus[];

  const variantsByItem = new Map<string, BulkVariant[]>();
  for (const v of variantStatus) {
    if (!v.is_active) continue;
    const list = variantsByItem.get(v.preset_id) ?? [];
    list.push({
      id: v.id,
      name: v.variant_name,
      totalQuantity: Number(v.total_quantity) || 0,
    });
    variantsByItem.set(v.preset_id, list);
  }

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
          guarda todos de una vez, en vez de registrar uno por uno. Los
          insumos con colores (tazas, termos…) aparecen con una fila por
          color. Deja en blanco los que no apliquen.
        </p>
      </div>

      {statusResult.error ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          {statusResult.error.message}
        </p>
      ) : (
        <>
          {variantResult.error ? (
            <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
              Los colores no están disponibles todavía: {variantResult.error.message}.
              ¿Ya ejecutaste <code>supabase/migrations/006_variantes.sql</code> en
              Supabase? Mientras tanto puedes seguir cargando el stock normal.
            </p>
          ) : null}
          <BulkStockTable
            items={items}
            variantsByItem={variantsByItem}
            variantsEnabled={!variantResult.error}
          />
        </>
      )}
    </div>
  );
}
