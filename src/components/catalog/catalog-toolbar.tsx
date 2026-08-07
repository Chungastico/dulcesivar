"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { QUERY_PARAM, SORT_PARAM, type SortKey } from "@/lib/catalog-filters";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevancia", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nuevos", label: "Más recientes" },
];

export function CatalogToolbar({
  query,
  sort,
  shown,
  total,
}: {
  query: string;
  sort: SortKey;
  shown: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [draft, setDraft] = useState(query);

  function update(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update((p) => {
            if (draft.trim()) p.set(QUERY_PARAM, draft.trim());
            else p.delete(QUERY_PARAM);
          });
        }}
        className="flex w-full items-center gap-2 sm:min-w-64 sm:flex-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Buscar por nombre o por lo que incluye…"
          aria-label="Buscar en el catálogo"
          className="w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-green px-4 py-2.5 text-base font-medium text-white transition hover:opacity-90"
        >
          Buscar
        </button>
      </form>

      <div className="flex items-center justify-between gap-3 sm:contents">
      <p className="text-base text-ink-muted">
        {shown === total ? (
          <>
            <strong className="font-semibold text-ink">{total}</strong> regalos
          </>
        ) : (
          <>
            <strong className="font-semibold text-ink">{shown}</strong> de {total}
          </>
        )}
      </p>

      <label className="flex items-center gap-2 text-base text-ink-muted">
        <span className="hidden sm:inline">Ordenar por</span>
        <select
          value={sort}
          onChange={(e) =>
            update((p) => {
              if (e.target.value === "relevancia") p.delete(SORT_PARAM);
              else p.set(SORT_PARAM, e.target.value);
            })
          }
          className="rounded-lg border-2 border-line bg-surface-raised px-2.5 py-2 text-base text-ink focus:border-brand-teal focus:outline-none"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      </div>
    </div>
  );
}
