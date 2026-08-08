"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { QuickItemModal } from "@/components/admin/quick-item-modal";
import { createVariant, registerPurchase } from "@/lib/actions/inventory";
import type { ContentPresetVariant, InventoryStatus } from "@/lib/supabase/types";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Registro de una compra de insumo.
 */
export function PurchaseForm({
  items,
  variantsByItem,
  variantsEnabled = true,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, ContentPresetVariant[]>;
  variantsEnabled?: boolean;
}) {
  const [state, action] = useActionState(registerPurchase, {});
  const [formKey, setFormKey] = useState(0);

  // --- Insumos locales creados en la misma sesión ---
  const [localItems, setLocalItems] = useState<InventoryStatus[]>([]);
  const allItems = useMemo(() => [...items, ...localItems], [items, localItems]);

  const categories = useMemo(() => {
    return Array.from(new Set(allItems.map((i) => i.category).filter(Boolean)));
  }, [allItems]);

  // --- Insumo: buscador ---
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedItem = allItems.find((i) => i.id === itemId);
  const variants = variantsByItem.get(itemId) ?? [];

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allItems.slice(0, 8);
    return allItems.filter(
      (i) =>
        normalize(i.label).includes(q) ||
        normalize(i.category).includes(q),
    ).slice(0, 8);
  }, [allItems, query]);

  function selectItem(item: InventoryStatus) {
    setItemId(item.id);
    setQuery(item.label);
    setShowDropdown(false);
  }

  function clearItem() {
    setItemId("");
    setQuery("");
  }

  // --- Precio ---
  // Solo costo unitario. El total se muestra como confirmación y lo recalcula
  // la server action antes de guardar; aquí no se manda.
  const [quantity, setQuantity] = useState("");
  const [priceValue, setPriceValue] = useState("");

  const q = Number(quantity);
  const p = Number(priceValue);

  const totalCost = q > 0 && p >= 0 ? p * q : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      key={formKey}
      action={async (fd) => {
        await action(fd);
        setQuantity("");
        setPriceValue("");
        setFormKey((k) => k + 1);
      }}
      className="flex flex-col gap-5"
    >
      {state.error ? (
        <p className="rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg border-2 border-brand-teal bg-brand-teal/10 px-3 py-2 text-sm text-brand-green">
          {state.ok}
        </p>
      ) : null}

      {/* --- Buscador de insumo --- */}
      <div className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink">Insumo</span>
        <div className="relative">
          {itemId ? (
            <div className="flex items-center gap-2 rounded-lg border-2 border-brand-green bg-brand-green/5 px-3.5 py-2.5">
              <span className="flex-1 text-base text-ink">
                {selectedItem?.label}
                <span className="ml-1.5 text-sm text-ink-muted">
                  ({selectedItem?.category})
                </span>
              </span>
              <button
                type="button"
                onClick={clearItem}
                className="rounded px-2 py-0.5 text-sm text-ink-muted transition hover:bg-red-50 hover:text-red-700"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Escribe para buscar o crear un insumo…"
                autoComplete="off"
                className={inputClass}
              />
              {showDropdown ? (
                <>
                  {/* Overlay para cerrar al tocar fuera */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowDropdown(false)}
                    className="fixed inset-0 z-10 cursor-default"
                    aria-hidden
                  />
                  <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-line bg-surface-raised shadow-xl">
                    {matches.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectItem(item)}
                          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-base text-ink transition hover:bg-brand-teal/15"
                        >
                          <span>{item.label}</span>
                          <span className="text-sm text-ink-muted">
                            {item.category}
                          </span>
                        </button>
                      </li>
                    ))}

                    <li className="border-t border-line-soft bg-surface">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          setCreating(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-brand-green hover:bg-brand-teal/15"
                      >
                        <span>
                          + Crear {query.trim() ? `"${query.trim()}"` : "nuevo insumo"}
                        </span>
                      </button>
                    </li>
                  </ul>
                </>
              ) : null}
            </>
          )}
          {/* Hidden input para el form */}
          <input type="hidden" name="item_id" value={itemId} />
        </div>
      </div>

      {/* --- Selector de color/variante --- */}
      {itemId && variantsEnabled && selectedItem?.has_variants ? (
        <VariantPicker itemId={itemId} variants={variants} />
      ) : null}

      {/* --- Cantidad --- */}
      <label className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink">Cantidad</span>
        <input
          name="quantity"
          type="number"
          // Entero: con step="0.001" las flechitas dejaban cantidades como
          // 19.999 en vez de 20.
          step="1"
          min="1"
          inputMode="numeric"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="24"
          className={inputClass}
        />
      </label>

      {/* --- Costo unitario --- */}
      <label className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink">
          Costo por unidad
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-ink-muted">$</span>
          <input
            name="unit_cost"
            type="number"
            step="0.01"
            min="0"
            required
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder="0.75"
            className={inputClass}
          />
          <span className="whitespace-nowrap text-base text-ink-muted">c/u</span>
        </div>

        {/* Confirmación de lo que se va a guardar. */}
        {totalCost != null && priceValue && !Number.isNaN(p) ? (
          <p className="rounded-lg bg-brand-cream/50 px-3.5 py-2 text-sm text-ink">
            {q} unidad{q === 1 ? "" : "es"} × ${p.toFixed(2)} ={" "}
            <strong className="text-brand-green">${totalCost.toFixed(2)}</strong>
          </p>
        ) : null}
      </label>

      {/* --- Fecha y proveedor --- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-base font-medium text-ink">Fecha</span>
          <input
            name="purchased_at"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-medium text-ink">
            Proveedor <span className="text-ink-muted">(opcional)</span>
          </span>
          <input
            name="supplier"
            maxLength={120}
            placeholder="Distribuidora…"
            className={inputClass}
          />
        </label>
      </div>

      {/* purchase_type ya no se expone: siempre "individual" */}
      <input type="hidden" name="purchase_type" value="individual" />

      <SubmitButton />

      {creating ? (
        <QuickItemModal
          open
          initialName={query.trim()}
          categories={categories}
          onClose={() => setCreating(false)}
          onCreated={(newItem) => {
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
            selectItem(itemObj);
          }}
        />
      ) : null}
    </form>
  );
}

/**
 * Selector de color del insumo elegido, con alta rápida si falta uno.
 */
function VariantPicker({
  itemId,
  variants,
}: {
  itemId: string;
  variants: ContentPresetVariant[];
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<ContentPresetVariant[]>([]);

  const all = [...variants, ...justAdded];
  const hasAny = all.length > 0;

  if (!hasAny && !adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="self-start text-sm text-brand-green underline decoration-dotted transition hover:text-brand-teal"
      >
        + Agregar el primer color de este insumo
      </button>
    );
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-base font-medium text-ink">
        Color / variante <span className="text-ink-muted">(opcional)</span>
      </span>

      {hasAny ? (
        <select name="variant_id" defaultValue="" className={inputClass}>
          <option value="">Sin color específico</option>
          {all
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>
      ) : null}

      {adding ? (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Negro, blanco, rojo…"
            className={inputClass}
          />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await createVariant(itemId, newName);
                if (res.error) setError(res.error);
                else if (res.id) {
                  setJustAdded((prev) => [
                    ...prev,
                    {
                      id: res.id!,
                      preset_id: itemId,
                      name: newName.trim(),
                      sort_order: 999,
                      is_active: true,
                      created_at: "",
                      updated_at: "",
                    },
                  ]);
                  setNewName("");
                  setAdding(false);
                }
              })
            }
            className="shrink-0 rounded-lg bg-brand-green px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "…" : "Agregar"}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="shrink-0 text-sm text-ink-muted hover:underline"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start text-sm text-brand-green underline decoration-dotted transition hover:text-brand-teal"
        >
          + Agregar otro color
        </button>
      )}

      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Registrar compra"}
    </button>
  );
}
