import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";

import { NewItemForm } from "@/components/admin/new-item-form";
import { PurchaseForm } from "@/components/admin/purchase-form";
import { VariantToggle } from "@/components/admin/variant-toggle";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ContentPresetVariant,
  InventoryStatus,
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
  const variantStatus = variantStatusResult.data ?? [];

  const invertido = items.reduce((sum, i) => sum + Number(i.total_invested), 0);
  const conCosto = items.filter((i) => i.avg_unit_cost != null).length;

  // Un insumo puede tener colores; se agrupan por preset_id para poder
  // ofrecerlos en el selector de compra y desglosar el stock por color en la
  // tabla, sin tocar el cálculo de costo del insumo (que sigue combinándolos).
  const variantsByItem = new Map<string, ContentPresetVariant[]>();
  for (const v of allVariants) {
    const list = variantsByItem.get(v.preset_id) ?? [];
    list.push(v);
    variantsByItem.set(v.preset_id, list);
  }
  const variantStatusByItem = new Map<string, typeof variantStatus>();
  for (const v of variantStatus) {
    const list = variantStatusByItem.get(v.preset_id) ?? [];
    list.push(v);
    variantStatusByItem.set(v.preset_id, list);
  }

  const byCategory = new Map<string, InventoryStatus[]>();
  const categories = new Set<string>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
    categories.add(item.category);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-green">Inventario</h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href="/admin/inventario/carga-inicial"
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-base font-semibold text-ink transition hover:brightness-95"
          >
            📦 Cargar stock por lote
          </Link>
        </div>
      </div>

      {variantsResult.error || variantStatusResult.error ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          Los colores de insumo no están disponibles todavía:{" "}
          {(variantsResult.error ?? variantStatusResult.error)!.message}. ¿Ya
          ejecutaste <code>supabase/migrations/006_variantes.sql</code> en
          Supabase?
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Insumos" value={String(items.length)} accent="bg-brand-green" />
        <Stat label="Con costo registrado" value={`${conCosto} de ${items.length}`} accent="bg-brand-teal" />
        <Stat label="Total invertido" value={money(invertido)} accent="bg-brand-lime" />
        <Stat
          label="Productos con costo"
          value={`${costs.filter((c) => c.costed_items > 0).length} de ${costs.length}`}
          accent="bg-brand-orange"
        />
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-[24rem_1fr]">
        <div className="flex flex-col gap-5">
          <PurchaseForm
            items={items}
            variantsByItem={variantsByItem}
            variantsEnabled={!variantsResult.error}
          />
          <NewItemForm categories={[...categories].sort()} />
        </div>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
            <h2 className="text-base font-semibold text-brand-green">
              Costo por insumo
            </h2>
            <p className="text-sm text-ink-muted">
              Marca «Colores» en los insumos que vienen en variantes (tazas,
              termos…). Solo esos ofrecen el selector de color al registrar una
              compra; el precio de venta del regalo no cambia por color, sí
              puede cambiar el costo de cada uno.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-base">
                <thead>
                  <tr className="border-b-2 border-line text-sm text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Insumo</th>
                    <th className="w-20 py-2 pr-3 text-center font-medium">
                      Colores
                    </th>
                    <th className="py-2 pr-3 text-right font-medium">Comprado</th>
                    <th className="py-2 pr-3 text-right font-medium">Invertido</th>
                    <th className="py-2 text-right font-medium">Costo unit.</th>
                  </tr>
                </thead>
                {[...byCategory.entries()].map(([category, list]) => (
                  <tbody key={category}>
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-brand-cream/40 px-2 py-1.5 text-sm font-medium text-brand-green"
                      >
                        {category}
                      </td>
                    </tr>
                    {list.map((item, itemIdx) => {
                      const variants = item.has_variants
                        ? (variantStatusByItem.get(item.id) ?? [])
                        : [];
                      return (
                        <Fragment key={item.id}>
                          <tr className="border-b border-line-soft">
                            <td className="py-2 pr-3 text-ink">
                              {item.has_variants ? `${itemIdx + 1}. ` : null}
                              {item.label}
                            </td>
                            <td className="py-2 pr-3 text-center">
                              <VariantToggle
                                itemId={item.id}
                                checked={item.has_variants}
                              />
                            </td>
                            <td className="py-2 pr-3 text-right text-ink-muted">
                              {Number(item.total_quantity) || "—"}
                            </td>
                            <td className="py-2 pr-3 text-right text-ink-muted">
                              {Number(item.total_invested) > 0
                                ? money(Number(item.total_invested))
                                : "—"}
                            </td>
                            <td className="py-2 text-right font-medium text-ink">
                              {item.avg_unit_cost != null
                                ? money(Number(item.avg_unit_cost))
                                : "sin costo"}
                            </td>
                          </tr>
                          {/* Lista numerada por color: no cambia el costo
                              combinado de arriba, solo desglosa cuánto hay de
                              cada uno. */}
                          {variants.map((v, vIdx) => (
                            <tr key={v.id} className="border-b border-line-soft">
                              <td className="py-1.5 pr-3 pl-6 text-sm text-ink-muted">
                                {vIdx + 1}. {v.variant_name}
                              </td>
                              <td className="py-1.5 pr-3" />
                              <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
                                {Number(v.total_quantity) || "—"}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
                                {Number(v.total_invested) > 0
                                  ? money(Number(v.total_invested))
                                  : "—"}
                              </td>
                              <td className="py-1.5 text-right text-sm text-ink-muted">
                                {v.avg_unit_cost != null
                                  ? money(Number(v.avg_unit_cost))
                                  : "sin costo"}
                              </td>
                            </tr>
                          ))}
                          {item.has_variants && variants.length === 0 ? (
                            <tr className="border-b border-line-soft">
                              <td
                                colSpan={5}
                                className="py-1.5 pl-6 text-sm text-ink-muted"
                              >
                                Sin colores registrados todavía.
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
            <h2 className="text-base font-semibold text-brand-green">
              Costo y margen por regalo
            </h2>
            <p className="text-sm text-ink-muted">
              Solo suma los ítems enlazados a un insumo con compras. La columna
              «cubierto» dice qué tan completa está la cuenta: un margen sobre 2
              de 7 ítems todavía no es confiable.
            </p>

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
      </div>
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
