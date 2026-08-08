"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { bulkRegisterInventory, type BulkRow } from "@/lib/actions/inventory";
import type { InventoryStatus } from "@/lib/supabase/types";

const TYPE_LABELS = {
  inicial: "Carga inicial (stock que ya tienes)",
  mayoreo: "Compra a mayoreo",
  individual: "Compra individual",
} as const;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type BulkVariant = { id: string; name: string; totalQuantity: number };

/** Clave de fila: un insumo sin color, o un color específico de un insumo. */
function rowKey(itemId: string, variantId: string | null) {
  return `${itemId}::${variantId ?? ""}`;
}

/**
 * Tabla para registrar stock de muchos insumos a la vez.
 *
 * Llenar "Registrar compra" insumo por insumo no era viable para poblar
 * decenas de artículos de arranque. Aquí se escribe cantidad y costo en la
 * misma fila que cada insumo y se guarda todo junto.
 *
 * Solo cuentan las filas con cantidad Y costo: una fila con cantidad pero sin
 * costo se ignora en vez de guardarse en $0, que arrastraría el promedio
 * ponderado de ese insumo hacia abajo y mentiría en el margen de cada regalo.
 *
 * Un insumo con colores (una taza, un termo…) se expande en una fila por
 * color en vez de una sola: el stock se guarda por color, que es como ella
 * realmente lo tiene separado.
 */
export function BulkStockTable({
  items,
  variantsByItem,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, BulkVariant[]>;
}) {
  const router = useRouter();

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [purchaseType, setPurchaseType] =
    useState<keyof typeof TYPE_LABELS>("inicial");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [supplier, setSupplier] = useState("");

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: string; ok?: string } | null>(
    null,
  );

  const byCategory = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, InventoryStatus[]>();
    for (const item of items) {
      const variants = variantsByItem.get(item.id) ?? [];
      const matchesItem = !q || normalize(item.label).includes(q);
      const matchesVariant = variants.some((v) => normalize(v.name).includes(q));
      if (q && !matchesItem && !matchesVariant) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [items, query, variantsByItem]);

  const filledCount = Object.keys(quantities).filter(
    (key) => quantities[key]?.trim() && costs[key]?.trim(),
  ).length;

  async function handleSubmit() {
    const rows: BulkRow[] = Object.keys(quantities)
      .filter((key) => quantities[key]?.trim())
      .map((key) => {
        const [itemId, variantId] = key.split("::");
        return {
          itemId,
          variantId: variantId || null,
          quantity: quantities[key],
          totalCost: costs[key] ?? "",
        };
      });

    if (rows.length === 0) {
      setResult({ error: "Escribe cantidad y costo en al menos un insumo." });
      return;
    }

    setSaving(true);
    setResult(null);
    try {
      const res = await bulkRegisterInventory(rows, {
        purchasedAt,
        purchaseType,
        supplier: supplier.trim() || undefined,
      });
      setResult(res.error ? { error: res.error } : { ok: res.ok });
      if (!res.error && (res.saved ?? 0) > 0) {
        setQuantities({});
        setCosts({});
        router.refresh(); // refleja el stock nuevo en "ya tiene X" y en los totales
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-surface-raised p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Tipo</span>
          <select
            value={purchaseType}
            onChange={(e) =>
              setPurchaseType(e.target.value as keyof typeof TYPE_LABELS)
            }
            className={inputClass}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Fecha</span>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            Proveedor <span className="text-ink-muted">(opcional)</span>
          </span>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Distribuidora…"
            className={inputClass}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Buscar insumo</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe para filtrar la lista…"
            className={inputClass}
          />
        </label>
      </section>

      {result?.error ? (
        <p className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-base text-red-800">
          {result.error}
        </p>
      ) : result?.ok ? (
        <p className="rounded-lg border-2 border-brand-teal bg-brand-teal/10 px-4 py-3 text-base text-brand-green">
          {result.ok}
        </p>
      ) : null}

      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised/95 px-4 py-3 backdrop-blur">
        <span className="text-base text-ink-muted">
          {filledCount} fila{filledCount === 1 ? "" : "s"} lista
          {filledCount === 1 ? "" : "s"} para guardar
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || filledCount === 0}
          className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : `Guardar ${filledCount || ""}`.trim()}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b-2 border-line bg-brand-cream/30 text-sm text-ink-muted">
              <th className="py-2 pl-4 pr-3 font-medium">Insumo</th>
              <th className="w-32 py-2 pr-3 text-right font-medium">
                Ya registrado
              </th>
              <th className="w-28 py-2 pr-3 font-medium">Cantidad</th>
              <th className="w-36 py-2 pr-3 font-medium">Costo total</th>
              <th className="w-24 py-2 pr-4 text-right font-medium">Unit.</th>
            </tr>
          </thead>
          {byCategory.map(([category, list]) => (
            <tbody key={category}>
              <tr>
                <td
                  colSpan={5}
                  className="bg-brand-cream/50 px-4 py-1.5 text-sm font-medium text-brand-green"
                >
                  {category}
                </td>
              </tr>
              {list.map((item) => {
                const variants = variantsByItem.get(item.id) ?? [];

                // Insumo con colores: una fila por color, no una fila del
                // insumo entero — el stock se guarda separado por color.
                if (variants.length > 0) {
                  return (
                    <Row
                      key={item.id}
                      groupLabel={`${item.label} (${item.unit})`}
                      sub
                      rows={variants.map((v) => ({
                        key: rowKey(item.id, v.id),
                        label: v.name,
                        existing: v.totalQuantity,
                      }))}
                      quantities={quantities}
                      costs={costs}
                      setQuantities={setQuantities}
                      setCosts={setCosts}
                    />
                  );
                }

                return (
                  <Row
                    key={item.id}
                    rows={[
                      {
                        key: rowKey(item.id, null),
                        label: `${item.label} (${item.unit})`,
                        existing: Number(item.total_quantity) || 0,
                      },
                    ]}
                    quantities={quantities}
                    costs={costs}
                    setQuantities={setQuantities}
                    setCosts={setCosts}
                  />
                );
              })}
            </tbody>
          ))}
        </table>

        {byCategory.length === 0 ? (
          <p className="px-4 py-10 text-center text-base text-ink-muted">
            Ningún insumo coincide con «{query}».
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  groupLabel,
  sub = false,
  rows,
  quantities,
  costs,
  setQuantities,
  setCosts,
}: {
  groupLabel?: string;
  sub?: boolean;
  rows: { key: string; label: string; existing: number }[];
  quantities: Record<string, string>;
  costs: Record<string, string>;
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCosts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <>
      {groupLabel ? (
        <tr>
          <td colSpan={5} className="py-1 pl-4 pr-3 text-sm font-medium text-ink">
            {groupLabel}
          </td>
        </tr>
      ) : null}
      {rows.map((row) => {
        const qty = quantities[row.key] ?? "";
        const cost = costs[row.key] ?? "";
        const q = Number(qty);
        const c = Number(cost);
        const unit = qty && cost && q > 0 ? c / q : null;

        return (
          <tr key={row.key} className="border-b border-line-soft">
            <td className={`py-1.5 pr-3 text-ink ${sub ? "pl-8 text-sm" : "pl-4"}`}>
              {sub ? "↳ " : ""}
              {row.label}
            </td>
            <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
              {row.existing > 0 ? row.existing : "—"}
            </td>
            <td className="py-1.5 pr-3">
              <input
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={qty}
                onChange={(e) =>
                  setQuantities((prev) => ({ ...prev, [row.key]: e.target.value }))
                }
                aria-label={`Cantidad de ${row.label}`}
                className={cellInput}
              />
            </td>
            <td className="py-1.5 pr-3">
              <div className="flex items-center gap-1">
                <span className="text-ink-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) =>
                    setCosts((prev) => ({ ...prev, [row.key]: e.target.value }))
                  }
                  aria-label={`Costo total de ${row.label}`}
                  className={cellInput}
                />
              </div>
            </td>
            <td className="py-1.5 pr-4 text-right text-sm text-ink-muted">
              {unit != null ? `$${unit.toFixed(3)}` : "—"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

const inputClass =
  "rounded-lg border-2 border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";

const cellInput =
  "w-full min-w-0 rounded-md border-2 border-line bg-surface px-2 py-1.5 text-base text-ink focus:border-brand-teal focus:outline-none";
