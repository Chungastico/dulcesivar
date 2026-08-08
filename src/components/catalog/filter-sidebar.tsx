"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  activeFilterCount,
  BUDGET_PARAM,
  BUDGET_TIERS,
  QUERY_PARAM,
  type BudgetTierId,
  type Filters,
} from "@/lib/catalog-filters";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

/**
 * Panel de filtros del catálogo.
 *
 * Todo vive en la URL, no en estado local: es lo que permite que un enlace ya
 * filtrado se comparta por WhatsApp y abra exactamente la misma vista.
 */
function FilterControls({
  groups,
  filters,
  counts,
  budgetCounts,
  total,
}: {
  groups: AttributeGroupWithValues[];
  filters: Filters;
  counts: Map<string, number>;
  budgetCounts: Map<BudgetTierId, number>;
  total: number;
  shown?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

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

  function toggleBudget(tierId: BudgetTierId) {
    const next = new URLSearchParams(params.toString());
    const current = (next.get(BUDGET_PARAM) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = current.includes(tierId)
      ? current.filter((s) => s !== tierId)
      : [...current, tierId];

    if (updated.length) next.set(BUDGET_PARAM, updated.join(","));
    else next.delete(BUDGET_PARAM);
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
    filters.budget.length > 0 ||
    filters.min != null ||
    filters.max != null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-2">
        {/* En móvil el título ya lo pone la cabecera del panel. */}
        <h2 className="hidden text-base font-semibold text-brand-green lg:block">
          Filtros
        </h2>
        {hasFacets ? (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto text-sm text-ink-muted underline transition hover:text-brand-green"
          >
            Limpiar todo
          </button>
        ) : (
          <span className="ml-auto text-sm text-ink-muted">{total} regalos</span>
        )}
      </div>

      {/* Filtro automático de Presupuesto calculado a partir del precio */}
      <section className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <h3 className="text-sm font-semibold text-ink">Presupuesto</h3>
        <ul className="flex flex-col">
          {BUDGET_TIERS.map((tier) => {
            const count = budgetCounts.get(tier.id) ?? 0;
            const on = filters.budget.includes(tier.id);
            const dead = count === 0 && !on;

            return (
              <li key={tier.id}>
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
                    onChange={() => toggleBudget(tier.id)}
                    className="size-4 accent-[var(--brand-green)]"
                  />
                  <span className="flex flex-1 items-baseline justify-between gap-1">
                    <span className={on ? "font-medium text-ink" : "text-ink"}>
                      {tier.name}
                      <span className="ml-1.5 text-xs text-ink-muted">
                        ({tier.priceLabel})
                      </span>
                    </span>
                    <span className="text-sm text-ink-muted">{count}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
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

/**
 * Presentación responsiva de los filtros.
 */
export function FilterSidebar(props: {
  groups: AttributeGroupWithValues[];
  filters: Filters;
  counts: Map<string, number>;
  budgetCounts: Map<BudgetTierId, number>;
  total: number;
  shown: number;
}) {
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(props.filters);

  return (
    <>
      {/* Barra de acceso, solo en móvil */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-line bg-surface-raised px-4 py-3 text-base font-medium text-ink transition hover:border-brand-teal"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M3 6h18M7 12h10M11 18h2" />
          </svg>
          Filtros
          {active > 0 ? (
            <span className="rounded-full bg-brand-green px-2 py-0.5 text-sm font-semibold text-white">
              {active}
            </span>
          ) : null}
        </button>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Cerrar filtros"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
        />
      ) : null}

      <aside
        className={`${
          open ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-50 w-[88%] max-w-sm flex-col bg-surface-raised shadow-2xl lg:flex lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-3rem)] lg:w-full lg:max-w-none lg:rounded-2xl lg:border lg:border-line lg:shadow-none`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <span className="text-base font-semibold text-brand-green">
            Filtros
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar filtros"
            className="rounded-lg px-2 py-1 text-lg text-ink-muted hover:bg-brand-cream/50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
          <FilterControls {...props} />
        </div>

        <div className="border-t border-line p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-xl bg-brand-green px-4 py-3 text-base font-semibold text-white"
          >
            Ver {props.shown} resultado{props.shown === 1 ? "" : "s"}
          </button>
        </div>
      </aside>
    </>
  );
}
