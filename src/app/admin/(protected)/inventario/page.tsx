import type { Metadata } from "next";

import { InventoryActions } from "@/components/admin/inventory-actions";
import { InventoryBrowser } from "@/components/admin/inventory-browser";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ContentPresetVariant,
  InventoryStatus,
  InventoryVariantStatus,
  ProductCost,
} from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Inventario",
  robots: { index: false, follow: false },
};

const money = (n: number) =>
  n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

export default async function InventarioPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const [statusResult, costsResult, variantsResult, variantStatusResult] =
    await Promise.all([
      db.from("inventory_status").select("*").order("category").order("label"),
      db.from("product_costs").select("*").order("name"),
      db
        .from("content_preset_variants")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      db.from("inventory_variant_status").select("*").order("sort_order"),
    ]);

  if (statusResult.error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-brand-green">Inventario</h1>
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          {statusResult.error.message}. ¿Ya ejecutaste{" "}
          <code>supabase/migrations/004_inventario.sql</code> en Supabase?
        </p>
      </div>
    );
  }

  const items = (statusResult.data ?? []) as InventoryStatus[];
  const costs = (costsResult.data ?? []) as ProductCost[];
  const allVariants = (variantsResult.data ?? []) as ContentPresetVariant[];
  const variantStatus = (variantStatusResult.data ?? []) as InventoryVariantStatus[];

  const variantsError = variantsResult.error ?? variantStatusResult.error;
  const variantsEnabled = !variantsError;

  const invertido = items.reduce((sum, i) => sum + Number(i.total_invested), 0);
  const conCosto = items.filter((i) => i.avg_unit_cost != null).length;
  const conCostoProductos = costs.filter((c) => c.costed_items > 0).length;

  // Dos agrupaciones distintas del mismo dato: el formulario de compra necesita
  // la variante cruda (para el <select>), y la tabla necesita su stock y costo.
  const variantsByItem = new Map<string, ContentPresetVariant[]>();
  for (const v of allVariants) {
    const list = variantsByItem.get(v.preset_id) ?? [];
    list.push(v);
    variantsByItem.set(v.preset_id, list);
  }

  const variantStatusByItem = new Map<string, InventoryVariantStatus[]>();
  for (const v of variantStatus) {
    const list = variantStatusByItem.get(v.preset_id) ?? [];
    list.push(v);
    variantStatusByItem.set(v.preset_id, list);
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-green">Inventario</h1>
          <p className="mt-1 max-w-xl text-base text-ink-muted">
            Lo que compras y a qué precio. De aquí sale el costo de armar cada
            regalo.
          </p>
        </div>

        <InventoryActions
          items={items}
          variantsByItem={variantsByItem}
          variantsEnabled={variantsEnabled}
          categories={categories}
        />
      </div>

      {variantsError ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          Los colores de insumo no están disponibles todavía:{" "}
          {variantsError.message}. ¿Ya ejecutaste{" "}
          <code>supabase/migrations/007_marca_variantes.sql</code> en Supabase?
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Insumos"
          value={String(items.length)}
          accent="bg-brand-green"
        />
        <Stat
          label="Con costo registrado"
          value={`${conCosto} de ${items.length}`}
          accent="bg-brand-teal"
        />
        <Stat
          label="Total invertido"
          value={money(invertido)}
          accent="bg-brand-lime"
        />
        <Stat
          label="Regalos con costo"
          value={`${conCostoProductos} de ${costs.length}`}
          accent="bg-brand-orange"
        />
      </dl>

      <InventoryBrowser
        items={items}
        variantsByItem={variantStatusByItem}
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
        <div>
          <h2 className="text-base font-semibold text-brand-green">
            Costo y margen por regalo
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            «Cubierto» dice qué tan completa está la cuenta: un margen calculado
            sobre 2 de 7 ítems todavía no es confiable.
          </p>
        </div>

        {costs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-base text-ink-muted">
            Aún no hay productos en el catálogo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-base">
              <thead>
                <tr className="border-b-2 border-line text-sm text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Regalo</th>
                  <th className="py-2 pr-3 text-right font-medium">Precio</th>
                  <th className="py-2 pr-3 text-right font-medium">Costo</th>
                  <th className="py-2 pr-3 text-right font-medium">Margen</th>
                  <th className="py-2 text-right font-medium">Cubierto</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => {
                  const completo =
                    c.total_items > 0 && c.costed_items === c.total_items;
                  return (
                    <tr key={c.product_id} className="border-b border-line-soft">
                      <td className="py-2 pr-3 text-ink">{c.name}</td>
                      <td className="py-2 pr-3 text-right text-ink-muted">
                        {c.price_usd != null ? money(Number(c.price_usd)) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-muted">
                        {c.costed_items > 0
                          ? money(Number(c.estimated_cost))
                          : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right font-medium ${
                          c.costed_items === 0
                            ? "text-ink-muted"
                            : Number(c.estimated_margin) < 0
                              ? "text-red-700"
                              : "text-brand-green"
                        }`}
                      >
                        {c.costed_items > 0 && c.estimated_margin != null
                          ? money(Number(c.estimated_margin))
                          : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-sm font-medium ${
                            completo
                              ? "bg-brand-teal/20 text-brand-green"
                              : "bg-brand-cream text-ink-muted"
                          }`}
                        >
                          {c.costed_items} de {c.total_items}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-raised px-4 py-4">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-brand-green">{value}</dd>
    </div>
  );
}
