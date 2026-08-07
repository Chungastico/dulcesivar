"use client";

import { useState } from "react";

import type { AttributeGroupWithValues } from "@/lib/supabase/types";

/**
 * Selección de etiquetas por eje.
 *
 * El diseño anterior usaba píldoras planas idénticas entre sí: no se veía cuál
 * estaba marcada sin fijarse mucho, ni se leía como algo clicable. Aquí cada
 * opción es un botón grande con casilla visible y marca de verificación, y
 * cada eje muestra cuántas lleva elegidas.
 */
export function TagPicker({ groups, initialIds }: {
  groups: AttributeGroupWithValues[];
  initialIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-4">
      <div>
        <h2 className="text-base font-semibold text-brand-green">Clasificación</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Define en qué filtros aparece el regalo. Puedes marcar varias por
          categoría.
        </p>
      </div>

      {groups.map((group) => {
        const values = group.attribute_values
          .filter((v) => v.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        const count = values.filter((v) => selected.has(v.id)).length;

        return (
          <fieldset key={group.id} className="flex flex-col gap-2.5">
            <legend className="flex w-full items-baseline gap-2 pb-1">
              <span className="text-base font-medium text-ink">
                {group.name}
              </span>
              {count > 0 ? (
                <span className="rounded-full bg-brand-green px-2 py-0.5 text-xs font-semibold text-white">
                  {count}
                </span>
              ) : (
                <span className="text-sm text-ink-muted">ninguna</span>
              )}
            </legend>

            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const on = selected.has(value.id);
                return (
                  <label
                    key={value.id}
                    className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 px-3 py-2 text-base transition ${
                      on
                        ? "border-brand-green bg-brand-green text-white"
                        : "border-line bg-surface text-ink hover:border-brand-teal hover:bg-brand-teal/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="valueIds"
                      value={value.id}
                      checked={on}
                      onChange={() => toggle(value.id)}
                      className="sr-only"
                    />
                    {/* Casilla visible: el color de fondo por sí solo no basta
                        para quien distingue mal los tonos. */}
                    <span
                      aria-hidden
                      className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${
                        on ? "border-white bg-white" : "border-line bg-white"
                      }`}
                    >
                      {on ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className="text-brand-green"
                        >
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      ) : null}
                    </span>
                    {value.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </section>
  );
}
