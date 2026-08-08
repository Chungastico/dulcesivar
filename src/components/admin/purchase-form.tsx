"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { createVariant, registerPurchase } from "@/lib/actions/inventory";
import type { ContentPresetVariant, InventoryStatus } from "@/lib/supabase/types";

/**
 * Registro de una compra de insumo.
 *
 * Pide cantidad y precio total —no el unitario— porque es como viene la
 * factura. El unitario se muestra en vivo mientras escribe, para que note al
 * instante si tecleó un cero de más antes de guardar.
 *
 * Si el insumo elegido tiene colores (una taza, un termo…), aparece un
 * segundo selector para decir cuál. Los insumos sin colores no lo ven nunca:
 * la mayoría de lo que compra (chocolates, cajas) no los tiene.
 */
export function PurchaseForm({
  items,
  variantsByItem,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, ContentPresetVariant[]>;
}) {
  const [state, action] = useActionState(registerPurchase, {});
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [itemId, setItemId] = useState("");
  const [formKey, setFormKey] = useState(0);

  const q = Number(quantity);
  const t = Number(total);
  const unit = q > 0 && total !== "" && !Number.isNaN(t) ? t / q : null;

  const today = new Date().toISOString().slice(0, 10);
  const variants = variantsByItem.get(itemId) ?? [];

  return (
    <form
      key={formKey}
      action={async (fd) => {
        await action(fd);
        setQuantity("");
        setTotal("");
        setFormKey((k) => k + 1);
      }}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <h2 className="text-base font-semibold text-brand-green">
        Registrar compra
      </h2>

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

      <label className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink">Insumo</span>
        <select
          name="item_id"
          required
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className={inputClass}
        >
          <option value="">Elige un insumo…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.category})
            </option>
          ))}
        </select>
      </label>

      {itemId ? (
        <VariantPicker itemId={itemId} variants={variants} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <label className="flex flex-col gap-2">
          <span className="text-base font-medium text-ink">
            Precio total pagado
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-ink-muted">$</span>
            <input
              name="total_cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="18.00"
              className={inputClass}
            />
          </div>
        </label>
      </div>

      <p
        className={`rounded-lg px-3 py-2 text-base ${
          unit !== null
            ? "bg-brand-cream/60 text-brand-green"
            : "bg-surface text-ink-muted"
        }`}
      >
        {unit !== null ? (
          <>
            Costo por unidad:{" "}
            <strong className="font-semibold">${unit.toFixed(4)}</strong>
          </>
        ) : (
          "Escribe cantidad y precio para ver el costo por unidad."
        )}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-medium text-ink">Tipo de compra</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["mayoreo", "Mayoreo", "Compra grande a menor precio unitario"],
              ["individual", "Individual", "Compra suelta o de reposición"],
            ] as const
          ).map(([value, label, hint], i) => (
            <label
              key={value}
              className="flex flex-1 cursor-pointer items-start gap-2 rounded-lg border-2 border-line bg-surface px-3 py-2 transition has-checked:border-brand-green has-checked:bg-brand-green/10"
            >
              <input
                type="radio"
                name="purchase_type"
                value={value}
                defaultChecked={i === 1}
                className="mt-1 size-4 accent-[var(--brand-green)]"
              />
              <span className="flex flex-col">
                <span className="text-base text-ink">{label}</span>
                <span className="text-sm text-ink-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

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

      <SubmitButton />
    </form>
  );
}

/**
 * Selector de color del insumo elegido, con alta rápida si falta uno.
 *
 * Vive fuera del <select> nativo del insumo para poder mostrarse u ocultarse
 * sin perder lo que ella ya escribió en cantidad/precio.
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
  // Colores creados en esta sesión, antes de que la página vuelva a cargar
  // los datos del servidor con la lista actualizada.
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
        + Este insumo tiene colores u otras variantes
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
