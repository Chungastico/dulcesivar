"use client";

import { useMemo, useState } from "react";

import { parseContentList } from "@/lib/parse-contents";
import type { ContentPreset } from "@/lib/supabase/types";

export type ContentItem = {
  label: string;
  quantity: number;
  /** Insumo de la biblioteca, si vino de ahí. Null si se escribió libre.
   *  Es lo que permite calcular el costo del regalo en Inventario. */
  presetId?: string | null;
};

/**
 * Editor de "¿Qué incluye?".
 *
 * Los ítems se repiten entre productos casi siempre, así que el camino rápido
 * es elegir de la biblioteca; escribir libre queda para lo excepcional. Eso
 * además evita que el mismo artículo entre como "Ferrero", "ferrero" y
 * "Chocolate Ferrero", que luego rompe cualquier conteo.
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
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const update = (i: number, patch: Partial<ContentItem>) =>
    onChange(contents.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const add = (label: string, presetId: string | null = null) => {
    onChange([...contents, { label, quantity: 1, presetId }]);
    setQuery("");
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(contents.map((c) => c.label.toLowerCase()));
    return presets
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) && !used.has(p.label.toLowerCase()),
      )
      .slice(0, 6);
  }, [query, presets, contents]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ContentPreset[]>();
    for (const p of presets) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [presets]);

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

      {contents.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
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
              <input
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
                aria-label={`Nombre del ítem ${i + 1}`}
                className="flex-1 rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink"
              />
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
      ) : null}

      {/* Buscador con autocompletado sobre la biblioteca */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = matches[0];
              if (first) add(first.label, first.id);
              else if (query.trim()) add(query.trim());
            }
          }}
          placeholder="Escribe para buscar un insumo, o agrega uno nuevo…"
          className="w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20"
        />

        {query.trim() ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border-2 border-line bg-surface-raised shadow-xl">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => add(m.label, m.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base text-ink hover:bg-brand-teal/15"
                >
                  {m.label}
                  <span className="text-sm text-ink-muted">{m.category}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => add(query.trim())}
                className="w-full px-4 py-3 text-left text-base font-medium text-brand-green hover:bg-brand-cream/60"
              >
                + Agregar «{query.trim()}» como ítem libre
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPasting((v) => !v)}
          className="rounded-lg border-2 border-dashed border-brand-teal px-3.5 py-2 text-base font-medium text-brand-green transition hover:bg-brand-teal/10"
        >
          {pasting ? "Cerrar" : "Pegar lista completa"}
        </button>
      </div>

      {pasting ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand-teal/40 bg-brand-teal/5 p-3">
          <p className="text-sm text-ink-muted">
            Pega la lista tal como la tienes, una línea por ítem. Las viñetas se
            quitan solas y el número inicial se toma como cantidad.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder={"• 1 Vaso vinero personalizado\n• 3 chocolates Ferrero"}
            className="w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 font-mono text-sm text-ink focus:border-brand-teal focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                onChange([...contents, ...parseContentList(draft)]);
                setDraft("");
                setPasting(false);
              }}
              className="rounded-lg bg-brand-green px-4 py-2 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Agregar {parseContentList(draft).length || ""} ítems
            </button>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                onChange(parseContentList(draft));
                setDraft("");
                setPasting(false);
              }}
              className="rounded-lg border-2 border-line px-4 py-2 text-base text-ink transition hover:bg-brand-cream/50 disabled:opacity-40"
            >
              Reemplazar todo
            </button>
          </div>
        </div>
      ) : null}

      {/* Los más usados, a un clic, sin tener que escribir nada. */}
      {contents.length === 0 && byCategory.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
          <p className="text-sm font-medium text-ink">O elige de los más comunes:</p>
          {byCategory.slice(0, 3).map(([category, items]) => (
            <div key={category} className="flex flex-wrap items-center gap-1.5">
              <span className="w-full text-sm text-ink-muted sm:w-28 sm:shrink-0">{category}</span>
              {items.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => add(item.label, item.id)}
                  className="rounded-lg border-2 border-line bg-surface-raised px-3 py-1.5 text-base text-ink transition hover:border-brand-teal hover:bg-brand-teal/15"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input type="hidden" name="contents" value={JSON.stringify(contents)} />
    </fieldset>
  );
}
