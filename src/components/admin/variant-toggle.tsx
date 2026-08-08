"use client";

import { useTransition } from "react";

import { setHasVariants } from "@/lib/actions/inventory";

/**
 * La casilla "Colores" de la tabla de costos: dice si ese insumo viene en
 * variantes. Reemplaza tener que adivinarlo mirando si ya existen filas de
 * color, que era lo que antes hacía aparecer "+ agregar color" en insumos que
 * nunca lo iban a necesitar.
 */
export function VariantToggle({
  itemId,
  checked,
}: {
  itemId: string;
  checked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => void setHasVariants(itemId, e.target.checked))
      }
      aria-label="Este insumo viene en colores u otras variantes"
      className="size-4 accent-[var(--brand-green)] disabled:opacity-50"
    />
  );
}
