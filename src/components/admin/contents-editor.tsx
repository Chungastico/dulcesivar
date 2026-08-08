"use client";

import { useMemo, useState } from "react";

import { QuickItemModal } from "@/components/admin/quick-item-modal";
import type { ContentPreset } from "@/lib/supabase/types";

export type ContentItem = {
  label: string;
  quantity: number;
  /** Insumo de la biblioteca al que está ligado el ítem. Es lo que permite
   *  calcular el costo del regalo en Inventario. */
  presetId?: string | null;
};

/**
 * Editor de "¿Qué incluye?".
 *
 * El buscador permite elegir insumos de la biblioteca o crear uno nuevo
 * en el momento si aún no existe, sin tener que abandonar el formulario.
 */
export function ContentsEditor({
  contents,
  onChange,
  presets,
  error,
}: {
  contents: ContentItem[];
  onChange: (next: ContentItem[]) => void;
  presets: ContentPreset[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [localPresets, setLocalPresets] = useState<ContentPreset[]>([]);

  const allPresets = useMemo(() => [...presets, ...localPresets], [presets, localPresets]);

  const categories = useMemo(() => {
    return Array.from(new Set(allPresets.map((p) => p.category).filter(Boolean)));
  }, [allPresets]);

  const update = (i: number, patch: Partial<ContentItem>) =>
    onChange(contents.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const add = (label: string, presetId: string) => {
    onChange([...contents, { label, quantity: 1, presetId }]);
    setQuery("");
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(contents.map((c) => c.label.toLowerCase()));
    return allPresets
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) && !used.has(p.label.toLowerCase()),
      )
      .slice(0, 6);
  }, [query, allPresets, contents]);

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-base font-semibold text-brand-green">
          ¿Qué incluye? <span className="text-brand-orange">*</span>
        </legend>
        <span className="text-sm text-ink-muted">
          {contents.length} ítem{contents.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Buscador anclado arriba */}
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const first = matches[0];
                if (first) add(first.label, first.id);
                else if (query.trim()) setCreating(true);
              }
            }}
            placeholder="Escribe para buscar o agregar un insumo…"
            className="w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20"
          />
        </div>

        {query.trim() ? (
          <ul className="absolute mt-1 w-full overflow-hidden rounded-lg border-2 border-line bg-surface-raised shadow-xl">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => add(m.label, m.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base text-ink hover:bg-brand-teal/15"
                >
                  <span>{m.label}</span>
                  <span className="text-sm text-ink-muted">{m.category}</span>
                </button>
              </li>
            ))}

            <li className="border-t border-line-soft bg-surface">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-brand-green hover:bg-brand-teal/15"
              >
                <span>+ Crear "{query.trim()}" como nuevo insumo</span>
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      {contents.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
          {contents.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={item.quantity}
                onChange={(e) =>
                  update(i, { quantity: Number(e.target.value) || 1 })
                }
                aria-label={`Cantidad del ítem ${i + 1}`}
                className="w-20 rounded-lg border-2 border-line bg-surface-raised px-2 py-2.5 text-center text-base font-medium text-ink"
              />
              <span
                aria-label={`Nombre del ítem ${i + 1}`}
                className="flex-1 truncate rounded-lg border-2 border-line-soft bg-brand-cream/40 px-3.5 py-2.5 text-base text-ink"
                title={item.label}
              >
                {item.label}
              </span>
              <button
                type="button"
                onClick={() => onChange(contents.filter((_, x) => x !== i))}
                aria-label={`Quitar ítem ${i + 1}`}
                className="rounded-lg border-2 border-transparent px-3 py-2 text-base text-ink-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-line-soft pt-3 text-sm text-ink-muted">
          Busca arriba para agregar lo que trae la caja.
        </p>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input type="hidden" name="contents" value={JSON.stringify(contents)} />

      {creating ? (
        <QuickItemModal
          open
          initialName={query.trim()}
          categories={categories}
          onClose={() => setCreating(false)}
          onCreated={(newItem) => {
            setLocalPresets((prev) => [
              ...prev,
              {
                id: newItem.id,
                label: newItem.label,
                category: newItem.category,
                unit: "unidad",
                has_variants: newItem.has_variants,
                sort_order: 999,
                is_active: true,
                created_at: "",
                updated_at: "",
              },
            ]);
            add(newItem.label, newItem.id);
          }}
        />
      ) : null}
    </fieldset>
  );
}
