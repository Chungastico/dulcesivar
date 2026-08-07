"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { registerPurchase } from "@/lib/actions/inventory";
import type { InventoryStatus } from "@/lib/supabase/types";

/**
 * Registro de una compra de insumo.
 *
 * Pide cantidad y precio total —no el unitario— porque es como viene la
 * factura. El unitario se muestra en vivo mientras escribe, para que note al
 * instante si tecleó un cero de más antes de guardar.
 */
export function PurchaseForm({ items }: { items: InventoryStatus[] }) {
  const [state, action] = useActionState(registerPurchase, {});
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [formKey, setFormKey] = useState(0);

  const q = Number(quantity);
  const t = Number(total);
  const unit = q > 0 && total !== "" && !Number.isNaN(t) ? t / q : null;

  const today = new Date().toISOString().slice(0, 10);

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
        <select name="item_id" required className={inputClass}>
          <option value="">Elige un insumo…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.category})
            </option>
          ))}
        </select>
      </label>

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
