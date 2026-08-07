"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  PRICE_MAX_PARAM,
  PRICE_MIN_PARAM,
  QUERY_PARAM,
  type Filters,
} from "@/lib/catalog-filters";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

/**
 * Panel de filtros del catálogo.
 *
 * Todo vive en la URL, no en estado local: es lo que permite que un enlace ya
 * filtrado se comparta por WhatsApp y abra exactamente la misma vista.
 */
export function FilterSidebar({
  groups,
  filters,
  counts,
  priceBounds,
  total,
}: {
  groups: AttributeGroupWithValues[];
  filters: Filters;
  counts: Map<string, number>;
  priceBounds: { min: number; max: number };
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [minDraft, setMinDraft] = useState(filters.min?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(filters.max?.toString() ?? "");

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(groupSlug: string, valueSlug: string) {
    const next = new URLSearchParams(params.toString());
    const current = (next.get(groupSlug) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = current.includes(valueSlug)
      ? current.filter((s) => s !== valueSlug)
      : [...current, valueSlug];

    if (updated.length) next.set(groupSlug, updated.join(","));
    else next.delete(groupSlug);
    push(next);
  }

  function applyPrice() {
    const next = new URLSearchParams(params.toString());
    if (minDraft.trim()) next.set(PRICE_MIN_PARAM, minDraft.trim());
    else next.delete(PRICE_MIN_PARAM);
    if (maxDraft.trim()) next.set(PRICE_MAX_PARAM, maxDraft.trim());
    else next.delete(PRICE_MAX_PARAM);
    push(next);
  }

  function clearAll() {
    const next = new URLSearchParams();
    // La búsqueda de texto no es un filtro de faceta: borrarla al limpiar
    // sorprendería a quien solo quería quitar las casillas.
    const q = params.get(QUERY_PARAM);
    if (q) next.set(QUERY_PARAM, q);
    push(next);
  }

  const hasFacets =
    Object.keys(filters.byGroup).length > 0 ||
    filters.min != null ||
    filters.max != null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-green">Filtros</h2>
        {hasFacets ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-ink-muted underline transition hover:text-brand-green"
          >
            Limpiar todo
          </button>
        ) : (
          <span className="text-sm text-ink-muted">{total} regalos</span>
        )}
      </div>

      <section className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <h3 className="text-sm font-semibold text-ink">Precio</h3>
        <p className="text-sm text-ink-muted">
          Entre ${priceBounds.min} y ${priceBounds.max}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            placeholder="Mín"
            aria-label="Precio mínimo"
            className={priceInput}
          />
          <span className="text-ink-muted">–</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            placeholder="Máx"
            aria-label="Precio máximo"
            className={priceInput}
          />
          <button
            type="button"
            onClick={applyPrice}
            className="rounded-lg border-2 border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-brand-teal hover:bg-brand-teal/10"
          >
            Ir
          </button>
        </div>
      </section>

      {groups.map((group) => {
        const values = group.attribute_values
          .filter((v) => v.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        const chosen = filters.byGroup[group.slug] ?? [];

        return (
          <section
            key={group.id}
            className="flex flex-col gap-2 border-t border-line-soft pt-4"
          >
            <h3 className="text-sm font-semibold text-ink">{group.name}</h3>
            <ul className="flex flex-col">
              {values.map((value) => {
                const count = counts.get(`${group.slug}:${value.slug}`) ?? 0;
                const on = chosen.includes(value.slug);
                // Una opción sin resultados se deja visible pero inerte: quitarla
                // haría que la lista bailara con cada clic.
                const dead = count === 0 && !on;

                return (
                  <li key={value.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-base transition ${
                        dead
                          ? "cursor-not-allowed text-ink-muted/60"
                          : "text-ink hover:bg-brand-cream/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={dead}
                        onChange={() => toggle(group.slug, value.slug)}
                        className="size-4 accent-[var(--brand-green)]"
                      />
                      <span className={`flex-1 ${on ? "font-medium" : ""}`}>
                        {value.name}
                      </span>
                      <span className="text-sm text-ink-muted">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const priceInput =
  "w-full min-w-0 rounded-lg border-2 border-line bg-surface-raised px-2.5 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";
