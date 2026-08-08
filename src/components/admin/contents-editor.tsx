"use client";

import { useMemo, useState } from "react";

import type { ContentPreset } from "@/lib/supabase/types";

export type ContentItem = {
  label: string;
  quantity: number;
  /** Insumo de la biblioteca al que está ligado el ítem. Es lo que permite
   *  calcular el costo del regalo en Inventario. Puede venir null en
   *  contenido cargado antes de exigir siempre un insumo real. */
  presetId?: string | null;
};

/**
 * Editor de "¿Qué incluye?".
 *
 * El buscador va arriba y se queda ahí: la lista crece hacia abajo, así que
 * agregar diez ítems no aleja el campo donde se agrega el once. Elegir de la
 * biblioteca además guarda el enlace al insumo, que es lo que después permite
 * costear la caja.
 *
 * Por eso todo ítem sale de la biblioteca: no se puede pegar una lista
 * completa, escribir uno libre, ni editar el nombre de uno ya puesto. Las
 * tres rutas dejaban texto suelto sin insumo asociado, y sin ese enlace no
 * hay forma de rastrear el gasto real de la caja en Inventario. Si el nombre
 * está mal, se quita el ítem y se agrega de nuevo bien buscado. Si el insumo
 * todavía no existe, se crea primero en Inventario.
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

  const update = (i: number, patch: Partial<ContentItem>) =>
    onChange(contents.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  // Siempre viene de la biblioteca: no hay ruta para agregar texto suelto,
  // porque un ítem sin insumo real no se puede costear en Inventario.
  const add = (label: string, presetId: string) => {
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

      {/* Buscador anclado arriba. El desplegable se superpone a la lista en vez
          de empujarla, para que la posición del campo no cambie nunca. */}
      <div className="relative z-10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = matches[0];
              if (first) add(first.label, first.id);
            }
          }}
          placeholder="Escribe para buscar un insumo…"
          className="w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20"
        />

        {query.trim() ? (
          <ul className="absolute mt-1 w-full overflow-hidden rounded-lg border-2 border-line bg-surface-raised shadow-xl">
            {matches.length > 0 ? (
              matches.map((m) => (
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
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-ink-muted">
                Ningún insumo coincide. Agrégalo primero en Inventario para
                poder incluirlo aquí.
              </li>
            )}
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
              {/* El nombre no se edita a mano: es lo que lo mantiene atado al
                  insumo elegido arriba, que es lo que luego calcula el gasto
                  real de la caja en Inventario. Si está mal, se quita y se
                  agrega de nuevo bien buscado. */}
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
    </fieldset>
  );
}
