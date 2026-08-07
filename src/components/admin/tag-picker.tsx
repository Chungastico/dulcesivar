"use client";

import { useEffect, useRef, useState } from "react";

import type { AttributeGroupWithValues } from "@/lib/supabase/types";

/**
 * Selección de etiquetas por eje.
 *
 * El diseño anterior usaba píldoras planas idénticas entre sí: no se veía cuál
 * estaba marcada sin fijarse mucho, ni se leía como algo clicable. Aquí cada
 * opción es un botón grande con casilla visible y marca de verificación, y
 * cada eje muestra cuántas lleva elegidas.
 */
export function TagPicker({
  groups,
  initialIds,
  suggestion,
}: {
  groups: AttributeGroupWithValues[];
  initialIds: string[];
  suggestion?: {
    /** Slugs propuestos por eje, o null si aún no se ha pedido. */
    picked: Record<string, string[]> | null;
    loading: boolean;
    error: string | null;
    available: boolean;
    onRequest: () => void;
  };
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));
  // Se recuerdan aparte para poder marcarlas visualmente: son propuestas del
  // modelo, no decisiones de ella, y conviene que se note cuáles revisar.
  const [suggested, setSuggested] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Tocarla es confirmarla o descartarla: en ambos casos deja de ser sugerencia.
    setSuggested((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const applied = useRef<Record<string, string[]> | null>(null);
  const picked = suggestion?.picked ?? null;

  useEffect(() => {
    if (!picked || picked === applied.current) return;
    applied.current = picked;

    const ids = new Set<string>();
    for (const group of groups) {
      for (const slug of picked[group.slug] ?? []) {
        const value = group.attribute_values.find((v) => v.slug === slug);
        if (value?.is_active) ids.add(value.id);
      }
    }
    // Se suman a lo ya marcado en vez de reemplazarlo: si ella eligió algo
    // antes de pedir la sugerencia, perderlo sería peor que no sugerir.
    setSelected((prev) => new Set([...prev, ...ids]));
    setSuggested(new Set([...ids].filter((id) => !selected.has(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, groups]);

  const pendientes = suggested.size;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-green">
            Clasificación
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Define en qué filtros aparece el regalo. Puedes marcar varias por
            categoría.
          </p>
        </div>

        {suggestion ? (
          <button
            type="button"
            onClick={suggestion.onRequest}
            disabled={!suggestion.available || suggestion.loading}
            title={
              suggestion.available
                ? "Vuelve a analizar la foto"
                : "Elige una foto en el paso 1"
            }
            className="rounded-lg border-2 border-brand-teal px-3.5 py-2 text-base font-medium text-brand-green transition hover:bg-brand-teal/10 disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted"
          >
            {suggestion.loading ? "Analizando…" : "✨ Volver a generar"}
          </button>
        ) : null}
      </div>

      {suggestion?.error ? (
        <p className="rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">
          {suggestion.error}
        </p>
      ) : pendientes > 0 ? (
        <p className="rounded-lg border-2 border-brand-teal bg-brand-teal/10 px-3 py-2 text-sm text-brand-green">
          {pendientes} etiqueta{pendientes === 1 ? "" : "s"} marcada
          {pendientes === 1 ? "" : "s"} automáticamente desde la foto (✨).
          Revísalas: quita las que no apliquen y agrega las que falten.
        </p>
      ) : null}

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
                const isSuggested = suggested.has(value.id);
                return (
                  <label
                    key={value.id}
                    className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 px-3 py-2 text-base transition ${
                      on
                        ? isSuggested
                          ? "border-dashed border-brand-teal bg-brand-teal/20 text-brand-green"
                          : "border-brand-green bg-brand-green text-white"
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
                        on
                          ? isSuggested
                            ? "border-brand-teal bg-white"
                            : "border-white bg-white"
                          : "border-line bg-white"
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
                    {isSuggested ? (
                      <span aria-label="sugerida" className="text-sm">
                        ✨
                      </span>
                    ) : null}
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
