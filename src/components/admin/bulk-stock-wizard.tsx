"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { StepIndicator, type Step } from "@/components/admin/form-steps";
import { QuickItemModal } from "@/components/admin/quick-item-modal";
import {
  bulkRegisterInventory,
  createVariant,
  type BulkRow,
} from "@/lib/actions/inventory";
import type { InventoryStatus } from "@/lib/supabase/types";

export type BulkVariant = { id: string; name: string; totalQuantity: number };

const STEPS: Step[] = [
  { id: 1, label: "Seleccionar", hint: "¿Qué compraste?" },
  { id: 2, label: "Cantidades", hint: "Cuánto y a qué precio" },
  { id: 3, label: "Confirmar", hint: "Revisar y guardar" },
];

const money = (n: number) =>
  n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Clave de fila: un insumo sin color, o un color específico de un insumo. */
function rowKey(itemId: string, variantId: string | null) {
  return `${itemId}::${variantId ?? ""}`;
}

type SelectedEntry = {
  itemId: string;
  variantId: string | null;
  label: string;
  parentLabel?: string;
  existing: number;
};

/**
 * Wizard de carga por lote, en 3 pasos.
 *
 * Paso 1: Buscar y seleccionar insumos (con colores). Se pueden agregar
 *         múltiples colores a la vez y crear insumos o colores nuevos inline.
 * Paso 2: Llenar cantidades y precios para los seleccionados.
 * Paso 3: Revisar resumen y guardar todo.
 */
export function BulkStockWizard({
  items,
  variantsByItem,
  variantsEnabled = true,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, BulkVariant[]>;
  variantsEnabled?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Insumos creados localmente durante la sesión
  const [localItems, setLocalItems] = useState<InventoryStatus[]>([]);
  const allItems = useMemo(() => [...items, ...localItems], [items, localItems]);

  // --- Step 1: Selección ---
  const [selected, setSelected] = useState<Map<string, SelectedEntry>>(
    new Map(),
  );

  // Variantes creadas localmente antes de que el servidor refresque
  const [localVariants, setLocalVariants] = useState<
    Record<string, BulkVariant[]>
  >({});
  const variantsFor = (itemId: string) => [
    ...(variantsByItem.get(itemId) ?? []),
    ...(localVariants[itemId] ?? []),
  ];

  // --- Step 2: Cantidades y precios ---
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});

  // --- Step 3: Guardar ---
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    error?: string;
    ok?: string;
  } | null>(null);

  // Validación por paso
  function validate(target: number): string | null {
    if (target > 1 && selected.size === 0)
      return "Selecciona al menos un insumo.";
    if (target > 2) {
      const filled = [...selected.keys()].filter(
        (key) => quantities[key]?.trim() && prices[key]?.trim(),
      );
      if (filled.length === 0)
        return "Escribe cantidad y precio en al menos un insumo.";
    }
    return null;
  }

  function goNext() {
    const problem = validate(step + 1);
    if (problem) {
      setStepError(problem);
      return;
    }
    setStepError(null);
    setStep(step + 1);
  }

  function go(target: number) {
    setStepError(null);
    setStep(target);
  }

  // Toggle de selección
  function toggleEntry(entry: SelectedEntry) {
    const key = rowKey(entry.itemId, entry.variantId);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, entry);
      return next;
    });
  }

  function isSelected(itemId: string, variantId: string | null) {
    return selected.has(rowKey(itemId, variantId));
  }

  // El precio que se escribe YA es el unitario; el total lo calcula la
  // server action. Aquí solo se muestra como confirmación.
  function totalCostFor(key: string): number | null {
    const q = Number(quantities[key]);
    const p = Number(prices[key]);
    if (!q || !p || Number.isNaN(q) || Number.isNaN(p)) return null;
    return p * q;
  }

  // Submit
  async function handleSubmit() {
    const rows: BulkRow[] = [...selected.keys()]
      .filter((key) => quantities[key]?.trim() && prices[key]?.trim())
      .map((key) => {
        const [itemId, variantId] = key.split("::");
        return {
          itemId,
          variantId: variantId || null,
          quantity: quantities[key],
          unitCost: prices[key],
        };
      });

    if (rows.length === 0) {
      setResult({ error: "No hay filas completas para guardar." });
      return;
    }

    setSaving(true);
    setResult(null);
    try {
      const res = await bulkRegisterInventory(rows, {
        purchasedAt,
        purchaseType: "inicial",
        supplier: supplier.trim() || undefined,
      });
      setResult(res.error ? { error: res.error } : { ok: res.ok });
      if (!res.error && (res.saved ?? 0) > 0) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const isLast = step === STEPS.length;

  return (
    <div className="flex flex-col gap-4">
      <StepIndicator steps={STEPS} current={step} onGo={go} />

      {stepError ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          {stepError}
        </p>
      ) : null}

      {result?.error ? (
        <p className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-base text-red-800">
          {result.error}
        </p>
      ) : result?.ok ? (
        <p className="rounded-lg border-2 border-brand-teal bg-brand-teal/10 px-4 py-3 text-base text-brand-green">
          {result.ok}
        </p>
      ) : null}

      {/* --- PASO 1: Seleccionar insumos --- */}
      {step === 1 ? (
        <StepSelectItems
          items={allItems}
          variantsFor={variantsFor}
          variantsEnabled={variantsEnabled}
          selected={selected}
          isSelected={isSelected}
          toggleEntry={toggleEntry}
          onItemCreated={(newItem) => {
            const itemObj: InventoryStatus = {
              id: newItem.id,
              label: newItem.label,
              category: newItem.category,
              unit: "unidad",
              has_variants: newItem.has_variants,
              total_quantity: 0,
              total_invested: 0,
              avg_unit_cost: null,
              is_active: true,
              purchase_count: 0,
              last_purchase_at: null,
            };
            setLocalItems((prev) => [...prev, itemObj]);
            if (!newItem.has_variants) {
              toggleEntry({
                itemId: newItem.id,
                variantId: null,
                label: newItem.label,
                existing: 0,
              });
            }
          }}
          onVariantCreated={(itemId, variant) =>
            setLocalVariants((prev) => ({
              ...prev,
              [itemId]: [...(prev[itemId] ?? []), variant],
            }))
          }
        />
      ) : null}

      {/* --- PASO 2: Cantidades y precios --- */}
      {step === 2 ? (
        <StepQuantities
          selected={selected}
          quantities={quantities}
          setQuantities={setQuantities}
          prices={prices}
          setPrices={setPrices}
          totalCostFor={totalCostFor}
        />
      ) : null}

      {/* --- PASO 3: Confirmar --- */}
      {step === 3 ? (
        <StepConfirm
          selected={selected}
          quantities={quantities}
          prices={prices}
          totalCostFor={totalCostFor}
          purchasedAt={purchasedAt}
          setPurchasedAt={setPurchasedAt}
          supplier={supplier}
          setSupplier={setSupplier}
        />
      ) : null}

      {/* --- Barra inferior --- */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3">
        <span className="text-sm text-ink-muted">
          {selected.size} insumo{selected.size === 1 ? "" : "s"} seleccionado
          {selected.size === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="rounded-lg border-2 border-line px-5 py-2.5 text-base font-medium text-ink transition hover:bg-brand-cream/50"
            >
              ← Atrás
            </button>
          ) : null}
          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar todo"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PASO 1 — Seleccionar insumos
   ========================================================================= */

function StepSelectItems({
  items,
  variantsFor,
  variantsEnabled,
  selected,
  isSelected,
  toggleEntry,
  onItemCreated,
  onVariantCreated,
}: {
  items: InventoryStatus[];
  variantsFor: (id: string) => BulkVariant[];
  variantsEnabled: boolean;
  selected: Map<string, SelectedEntry>;
  isSelected: (itemId: string, variantId: string | null) => boolean;
  toggleEntry: (entry: SelectedEntry) => void;
  onItemCreated: (item: {
    id: string;
    label: string;
    category: string;
    has_variants: boolean;
  }) => void;
  onVariantCreated: (itemId: string, variant: BulkVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  }, [items]);

  const byCategory = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, InventoryStatus[]>();
    for (const item of items) {
      const variants = variantsFor(item.id);
      const matchesItem = !q || normalize(item.label).includes(q);
      const matchesVariant = variants.some((v) =>
        normalize(v.name).includes(q),
      );
      if (q && !matchesItem && !matchesVariant) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-green">
            ¿Qué compraste?
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Marca los insumos que quieras registrar. Para insumos con colores,
            elige cuáles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o agregar insumo…"
            aria-label="Buscar insumo"
            className="w-full rounded-lg border-2 border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none sm:w-64"
          />
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="shrink-0 rounded-lg bg-brand-green px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Nuevo insumo
          </button>
        </div>
      </div>

      {byCategory.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center">
          <p className="text-base text-ink-muted">
            Ningún insumo coincide con "{query}".
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            + Crear "{query.trim() || "nuevo insumo"}"
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {byCategory.map(([category, list]) => (
            <CategoryGroup
              key={category}
              category={category}
              items={list}
              variantsFor={variantsFor}
              variantsEnabled={variantsEnabled}
              isSelected={isSelected}
              toggleEntry={toggleEntry}
              onVariantCreated={onVariantCreated}
              defaultOpen={query.trim().length > 0}
            />
          ))}
        </ul>
      )}

      {selected.size > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
          {[...selected.values()].map((entry) => (
            <span
              key={rowKey(entry.itemId, entry.variantId)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-sm text-brand-green"
            >
              {entry.parentLabel
                ? `${entry.parentLabel} → ${entry.label}`
                : entry.label}
              <button
                type="button"
                onClick={() => toggleEntry(entry)}
                className="ml-0.5 text-ink-muted hover:text-red-700"
                aria-label={`Quitar ${entry.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {creating ? (
        <QuickItemModal
          open
          initialName={query.trim()}
          categories={categories}
          onClose={() => setCreating(false)}
          onCreated={(newItem) => {
            onItemCreated(newItem);
            setQuery("");
          }}
        />
      ) : null}
    </section>
  );
}

function CategoryGroup({
  category,
  items,
  variantsFor,
  variantsEnabled,
  isSelected,
  toggleEntry,
  onVariantCreated,
  defaultOpen,
}: {
  category: string;
  items: InventoryStatus[];
  variantsFor: (id: string) => BulkVariant[];
  variantsEnabled: boolean;
  isSelected: (itemId: string, variantId: string | null) => boolean;
  toggleEntry: (entry: SelectedEntry) => void;
  onVariantCreated: (itemId: string, variant: BulkVariant) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 bg-brand-cream/40 px-4 py-2.5 text-left transition hover:bg-brand-cream/70"
      >
        <span
          aria-hidden
          className={`text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span className="flex-1 text-base font-medium text-brand-green">
          {category}
        </span>
        <span className="text-sm text-ink-muted">
          {items.length} insumo{items.length === 1 ? "" : "s"}
        </span>
      </button>

      {open ? (
        <ul className="divide-y divide-line-soft">
          {items.map((item) => {
            const variants = variantsFor(item.id);
            const hasVariants = item.has_variants;

            if (hasVariants) {
              return (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-base font-medium text-ink">
                    {item.label}
                    <span className="ml-2 inline-block rounded-full bg-brand-teal/15 px-2 py-0.5 text-xs font-medium text-brand-green">
                      Colores
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const checked = isSelected(item.id, v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm transition ${
                            checked
                              ? "border-brand-green bg-brand-green/10 text-ink"
                              : "border-line bg-surface text-ink-muted hover:border-brand-teal/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleEntry({
                                itemId: item.id,
                                variantId: v.id,
                                label: v.name,
                                parentLabel: item.label,
                                existing: v.totalQuantity,
                              })
                            }
                            className="size-3.5 accent-[var(--brand-green)]"
                          />
                          {v.name}
                          {v.totalQuantity > 0 ? (
                            <span className="text-xs text-ink-muted">
                              ({v.totalQuantity})
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                    {variantsEnabled ? (
                      <AddColorInline
                        itemId={item.id}
                        onCreated={(variant) => {
                          onVariantCreated(item.id, variant);
                          toggleEntry({
                            itemId: item.id,
                            variantId: variant.id,
                            label: variant.name,
                            parentLabel: item.label,
                            existing: 0,
                          });
                        }}
                      />
                    ) : null}
                  </div>
                  {variants.length === 0 && !variantsEnabled ? (
                    <p className="mt-1.5 text-sm text-ink-muted">
                      Sin colores registrados.
                    </p>
                  ) : null}
                </li>
              );
            }

            // Insumo sin colores: checkbox simple
            const checked = isSelected(item.id, null);
            return (
              <li key={item.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition ${
                    checked ? "bg-brand-green/5" : "hover:bg-brand-cream/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleEntry({
                        itemId: item.id,
                        variantId: null,
                        label: item.label,
                        existing: Number(item.total_quantity) || 0,
                      })
                    }
                    className="size-4 accent-[var(--brand-green)]"
                  />
                  <span className="flex-1 text-base text-ink">
                    {item.label}
                  </span>
                  {Number(item.total_quantity) > 0 ? (
                    <span className="text-sm text-ink-muted">
                      Ya tiene: {Number(item.total_quantity)}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/** Alta de color en línea */
function AddColorInline({
  itemId,
  onCreated,
}: {
  itemId: string;
  onCreated: (variant: BulkVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm text-brand-green transition hover:border-brand-teal hover:bg-brand-teal/10"
      >
        + Nuevo color
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            if (name.trim()) {
              startTransition(async () => {
                setError(null);
                const res = await createVariant(itemId, name);
                if (res.error) setError(res.error);
                else if (res.id) {
                  onCreated({
                    id: res.id,
                    name: name.trim(),
                    totalQuantity: 0,
                  });
                  setName("");
                  setOpen(false);
                }
              });
            }
          }
        }}
        placeholder="Nombre del color…"
        className="w-32 rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm text-ink focus:border-brand-teal focus:outline-none"
      />
      <button
        type="button"
        disabled={pending || !name.trim()}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await createVariant(itemId, name);
            if (res.error) setError(res.error);
            else if (res.id) {
              onCreated({
                id: res.id,
                name: name.trim(),
                totalQuantity: 0,
              });
              setName("");
              setOpen(false);
            }
          })
        }
        className="rounded bg-brand-green px-2 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-ink-muted hover:underline"
      >
        ✕
      </button>
      {error ? (
        <span className="text-sm text-red-700">{error}</span>
      ) : null}
    </span>
  );
}

/* =========================================================================
   PASO 2 — Cantidades y precios
   ========================================================================= */

function StepQuantities({
  selected,
  quantities,
  setQuantities,
  prices,
  setPrices,
  totalCostFor,
}: {
  selected: Map<string, SelectedEntry>;
  quantities: Record<string, string>;
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  prices: Record<string, string>;
  setPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  totalCostFor: (key: string) => number | null;
}) {
  const entries = [...selected.entries()];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5">
      <div>
        <h2 className="text-base font-semibold text-brand-green">
          Cantidades y precios
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Escribe cuántas unidades compraste y cuánto costó cada una. Deja en
          blanco los que no apliquen.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b-2 border-line bg-brand-cream/30 text-sm text-ink-muted">
              <th className="py-2 pl-4 pr-3 font-medium">Insumo</th>
              <th className="w-28 py-2 pr-3 text-right font-medium">
                Ya tiene
              </th>
              <th className="w-28 py-2 pr-3 font-medium">Cantidad</th>
              <th className="w-32 py-2 pr-3 font-medium">Costo unitario</th>
              <th className="w-28 py-2 pr-4 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, entry]) => {
              const qty = quantities[key] ?? "";
              const price = prices[key] ?? "";
              const q = Number(qty);
              const p = Number(price);
              const derivedTotal = q > 0 && p > 0 ? p * q : null;

              return (
                <tr key={key} className="border-b border-line-soft">
                  <td className="py-2 pl-4 pr-3 text-ink">
                    {entry.parentLabel ? (
                      <>
                        <span className="text-sm text-ink-muted">
                          {entry.parentLabel} →{" "}
                        </span>
                        {entry.label}
                      </>
                    ) : (
                      entry.label
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-sm text-ink-muted">
                    {entry.existing > 0 ? entry.existing : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min="0"
                      // Entero: con step="0.001" las flechitas del spinner
                      // dejaban cantidades como 19.999 en vez de 20.
                      step="1"
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      aria-label={`Cantidad de ${entry.label}`}
                      className={cellInput}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-muted">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={price}
                        onChange={(e) =>
                          setPrices((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        aria-label={`Precio de ${entry.label}`}
                        className={cellInput}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right text-sm text-ink-muted">
                    {derivedTotal != null ? `$${derivedTotal.toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================================
   PASO 3 — Confirmar y guardar
   ========================================================================= */

function StepConfirm({
  selected,
  quantities,
  prices,
  totalCostFor,
  purchasedAt,
  setPurchasedAt,
  supplier,
  setSupplier,
}: {
  selected: Map<string, SelectedEntry>;
  quantities: Record<string, string>;
  prices: Record<string, string>;
  totalCostFor: (key: string) => number | null;
  purchasedAt: string;
  setPurchasedAt: (v: string) => void;
  supplier: string;
  setSupplier: (v: string) => void;
}) {
  const entries = [...selected.entries()].filter(
    ([key]) => quantities[key]?.trim() && prices[key]?.trim(),
  );

  const grandTotal = entries.reduce((sum, [key]) => {
    const tc = totalCostFor(key);
    return sum + (tc ?? 0);
  }, 0);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5">
      <div>
        <h2 className="text-base font-semibold text-brand-green">
          Confirmar registro
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Revisa el resumen antes de guardar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Fecha</span>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="rounded-lg border-2 border-line bg-surface px-3 py-2 text-base text-ink focus:border-brand-teal focus:outline-none"
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
            className="rounded-lg border-2 border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b-2 border-line bg-brand-cream/30 text-sm text-ink-muted">
              <th className="py-2 pl-4 pr-3 font-medium">Insumo</th>
              <th className="w-24 py-2 pr-3 text-right font-medium">
                Cantidad
              </th>
              <th className="w-28 py-2 pr-3 text-right font-medium">
                Costo total
              </th>
              <th className="w-28 py-2 pr-4 text-right font-medium">
                Costo unit.
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, entry]) => {
              const q = Number(quantities[key]);
              const tc = totalCostFor(key);
              const uc = tc != null && q > 0 ? tc / q : null;

              return (
                <tr key={key} className="border-b border-line-soft">
                  <td className="py-2 pl-4 pr-3 text-ink">
                    {entry.parentLabel ? (
                      <>
                        <span className="text-sm text-ink-muted">
                          {entry.parentLabel} →{" "}
                        </span>
                        {entry.label}
                      </>
                    ) : (
                      entry.label
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-ink-muted">{q}</td>
                  <td className="py-2 pr-3 text-right text-ink-muted">
                    {tc != null ? money(tc) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-ink">
                    {uc != null ? money(uc) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-brand-cream/30">
              <td className="py-2 pl-4 pr-3 font-semibold text-brand-green">
                Total
              </td>
              <td className="py-2 pr-3 text-right text-sm text-ink-muted">
                {entries.length} artículo{entries.length === 1 ? "" : "s"}
              </td>
              <td className="py-2 pr-3 text-right font-semibold text-brand-green">
                {money(grandTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-base text-ink-muted">
          No hay filas con cantidad y precio. Vuelve al paso 2.
        </p>
      ) : null}
    </section>
  );
}

const cellInput =
  "w-full min-w-0 rounded-md border-2 border-line bg-surface px-2 py-1.5 text-base text-ink focus:border-brand-teal focus:outline-none";
