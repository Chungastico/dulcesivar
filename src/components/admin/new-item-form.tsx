"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createInventoryItem } from "@/lib/actions/inventory";

const UNITS = [
  { value: "unidad", label: "Unidad", hint: "Chocolates, tazas…" },
  { value: "libra", label: "Libra", hint: "Café, azúcar…" },
  { value: "paquete", label: "Paquete", hint: "Bolsas, cajas…" },
  { value: "metro", label: "Metro", hint: "Listón, tela…" },
  { value: "onza", label: "Onza", hint: "Productos pequeños" },
] as const;

/**
 * Alta de un insumo nuevo en la biblioteca.
 *
 * Sin esto, la única forma de agregar artículos era la migración SQL con los
 * 74 insumos iniciales: cualquier cosa que ella compre después no tenía dónde
 * entrar. El datalist de categorías reutiliza las que ya existen para que no
 * termine con "Comestibles" y "comestibles" como categorías distintas.
 */
export function NewItemForm({ categories }: { categories: string[] }) {
  const [state, action] = useActionState(createInventoryItem, {});
  const [key, setKey] = useState(0);
  const [unit, setUnit] = useState("unidad");

  return (
    <form
      key={key}
      action={async (fd) => {
        await action(fd);
        setKey((k) => k + 1);
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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">
          Nombre <span className="text-brand-orange">*</span>
        </span>
        <input
          name="label"
          required
          maxLength={200}
          placeholder="Vela aromática mediana"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Categoría</span>
        <input
          name="category"
          list="new-item-categories"
          placeholder="Otros"
          className={inputClass}
        />
        <datalist id="new-item-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          ¿Cómo se mide?
        </legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {UNITS.map((u) => (
            <label
              key={u.value}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 text-center transition ${
                unit === u.value
                  ? "border-brand-green bg-brand-green/10"
                  : "border-line bg-surface hover:border-brand-teal/50"
              }`}
            >
              <input
                type="radio"
                name="unit"
                value={u.value}
                checked={unit === u.value}
                onChange={() => setUnit(u.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-ink">{u.label}</span>
              <span className="text-[11px] leading-tight text-ink-muted">
                {u.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-base text-ink">
        <input type="checkbox" name="has_variants" className="size-4 accent-[var(--brand-green)]" />
        Viene en colores u otras variantes
      </label>

      <SubmitButton />
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-line bg-surface-raised px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg bg-brand-green px-5 py-2 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Agregar insumo"}
    </button>
  );
}
