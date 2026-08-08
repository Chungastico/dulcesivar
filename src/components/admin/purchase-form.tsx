"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

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
 *
 * Rediseñado para resolver tres problemas de UX:
 *
 * 1. El selector de insumo era un <select> nativo con 74+ opciones — ahora es
 *    un buscador con autocompletado, como ya se usa en ContentsEditor.
 *
 * 2. "Mayoreo/Individual" no aportaba nada al usuario — reemplazado por un
 *    toggle "Precio total" vs "Costo por unidad" que controla qué campo se
 *    llena. El otro se calcula y se muestra como texto informativo.
 *
 * 3. Los tres campos de precio (cantidad, total, unitario) todos editables a
 *    la vez confundían — ahora solo el campo del modo activo es editable.
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

  // --- Insumo: buscador ---
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedItem = items.find((i) => i.id === itemId);
  const variants = variantsByItem.get(itemId) ?? [];

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items.slice(0, 8);
    return items.filter(
      (i) =>
        normalize(i.label).includes(q) ||
        normalize(i.category).includes(q),
    ).slice(0, 8);
  }, [items, query]);

  function selectItem(item: InventoryStatus) {
    setItemId(item.id);
    setQuery(item.label);
    setShowDropdown(false);
  }

  function clearItem() {
    setItemId("");
    setQuery("");
  }

  // --- Precio: modo total vs unitario ---
  const [priceMode, setPriceMode] = useState<"total" | "unit">("total");
  const [quantity, setQuantity] = useState("");
  const [priceValue, setPriceValue] = useState("");

  const q = Number(quantity);
  const p = Number(priceValue);

  // Cálculos derivados según el modo
  const totalCost = priceMode === "total" ? p : q > 0 ? p * q : null;
  const unitCost = priceMode === "unit" ? p : q > 0 ? p / q : null;

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
                placeholder="Escribe para buscar un insumo…"
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
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border-2 border-line bg-surface-raised shadow-xl">
                    {matches.length > 0 ? (
                      matches.map((item) => (
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
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-ink-muted">
                        Ningún insumo coincide con «{query}».
                      </li>
                    )}
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
          step="0.001"
          min="0.001"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="24"
          className={inputClass}
        />
      </label>

      {/* --- Modo de precio --- */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-medium text-ink">
          ¿Cómo tenés el precio?
        </legend>
        <div className="flex gap-2">
          {(
            [
              ["total", "Precio total", "Lo que pagaste en total"],
              ["unit", "Costo por unidad", "Cuánto cuesta cada uno"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border-2 px-3 py-2.5 transition ${
                priceMode === value
                  ? "border-brand-green bg-brand-green/10"
                  : "border-line bg-surface hover:border-brand-teal/50"
              }`}
            >
              <input
                type="radio"
                name="_price_mode"
                value={value}
                checked={priceMode === value}
                onChange={() => {
                  setPriceMode(value);
                  setPriceValue("");
                }}
                className="mt-1 size-4 accent-[var(--brand-green)]"
              />
              <span className="flex flex-col">
                <span className="text-base text-ink">{label}</span>
                <span className="text-sm text-ink-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        {/* Campo de precio activo */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">
            {priceMode === "total"
              ? "Total pagado (como viene en la factura)"
              : "Precio por cada unidad"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-ink-muted">$</span>
            <input
              type="number"
              step={priceMode === "total" ? "0.01" : "0.0001"}
              min="0"
              required
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder={priceMode === "total" ? "18.00" : "0.75"}
              className={inputClass}
            />
          </div>
        </label>

        {/* Cálculo derivado — solo informativo */}
        {q > 0 && priceValue && !Number.isNaN(p) ? (
          <p className="rounded-lg bg-brand-cream/50 px-3.5 py-2 text-sm text-ink">
            {priceMode === "total" ? (
              <>
                Costo por unidad:{" "}
                <strong className="text-brand-green">
                  ${unitCost?.toFixed(4)}
                </strong>
              </>
            ) : (
              <>
                Total a pagar:{" "}
                <strong className="text-brand-green">
                  ${totalCost?.toFixed(2)}
                </strong>
              </>
            )}
          </p>
        ) : null}

        {/* Hidden: mandamos siempre total_cost a la base */}
        <input
          type="hidden"
          name="total_cost"
          value={totalCost != null && !Number.isNaN(totalCost) ? totalCost.toFixed(2) : ""}
        />
      </fieldset>

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
