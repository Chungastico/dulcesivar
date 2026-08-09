"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { ProductCost } from "@/lib/supabase/types";

const money = (n: number) =>
  n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

type SortKey =
  | "name"
  | "price"
  | "supplies"
  | "labor"
  | "decor"
  | "cost"
  | "margin"
  | "coverage";

type SortState = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Regalo", align: "left" },
  { key: "price", label: "Precio", align: "right" },
  { key: "supplies", label: "Insumos", align: "right" },
  { key: "labor", label: "Mano de obra", align: "right" },
  { key: "decor", label: "Materiales de decoración", align: "right" },
  { key: "cost", label: "Costo", align: "right" },
  { key: "margin", label: "Margen", align: "right" },
  { key: "coverage", label: "Cubierto", align: "right" },
];

/** Valor comparable de cada fila para una columna dada. Los "—" (dato
 *  incompleto) van al final ordenando ascendente, por eso usan -Infinity. */
function valueFor(c: ProductCost, key: SortKey): number | string {
  switch (key) {
    case "name":
      return c.name.toLocaleLowerCase("es-SV");
    case "price":
      return c.price_usd ?? -Infinity;
    case "supplies":
      return c.costed_items > 0 ? Number(c.supplies_cost) : -Infinity;
    case "labor":
      return Number(c.labor_cost);
    case "decor":
      return Number(c.decor_cost);
    case "cost":
      return c.costed_items > 0 ? Number(c.estimated_cost) : -Infinity;
    case "margin":
      return c.costed_items > 0 && c.estimated_margin != null
        ? Number(c.estimated_margin)
        : -Infinity;
    case "coverage":
      return c.total_items > 0 ? c.costed_items / c.total_items : -Infinity;
  }
}

export function CostMarginTable({ costs }: { costs: ProductCost[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState | null>(null);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) {
        // Nombre se ordena alfabético (A→Z) por defecto; los números,
        // de mayor a menor, que es lo que se suele querer revisar primero.
        return { key, dir: key === "name" ? "asc" : "desc" };
      }
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  const sorted = useMemo(() => {
    if (!sort) return costs;
    const copy = [...costs];
    copy.sort((a, b) => {
      const va = valueFor(a, sort.key);
      const vb = valueFor(b, sort.key);
      const cmp =
        typeof va === "string" || typeof vb === "string"
          ? String(va).localeCompare(String(vb), "es-SV")
          : va - vb;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [costs, sort]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[58rem] text-left text-base">
        <thead>
          <tr className="border-b-2 border-line text-sm text-ink-muted">
            {COLUMNS.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`py-2 pr-3 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 transition hover:text-brand-green ${
                      active ? "text-brand-green" : ""
                    }`}
                  >
                    {col.label}
                    <span aria-hidden className="text-xs">
                      {active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const completo =
              c.total_items > 0 && c.costed_items === c.total_items;
            const editHref = `/admin/catalogo/${c.product_id}`;
            return (
              <tr
                key={c.product_id}
                onClick={() => router.push(editHref)}
                className="cursor-pointer border-b border-line-soft transition hover:bg-brand-cream/40"
              >
                <td className="py-2 pr-3 text-ink">
                  <Link
                    href={editHref}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-brand-green hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right text-ink-muted">
                  {c.price_usd != null ? money(Number(c.price_usd)) : "—"}
                </td>
                <td className="py-2 pr-3 text-right text-ink-muted">
                  {c.costed_items > 0 ? money(Number(c.supplies_cost)) : "—"}
                </td>
                <td className="py-2 pr-3 text-right text-ink-muted">
                  {money(Number(c.labor_cost))}
                </td>
                <td className="py-2 pr-3 text-right text-ink-muted">
                  {money(Number(c.decor_cost))}
                </td>
                <td className="py-2 pr-3 text-right text-ink-muted">
                  {c.costed_items > 0 ? money(Number(c.estimated_cost)) : "—"}
                </td>
                <td
                  className={`py-2 pr-3 text-right font-medium ${
                    c.costed_items === 0
                      ? "text-ink-muted"
                      : Number(c.estimated_margin) < 0
                        ? "text-red-700"
                        : "text-brand-green"
                  }`}
                >
                  {c.costed_items > 0 && c.estimated_margin != null
                    ? money(Number(c.estimated_margin))
                    : "—"}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={`rounded px-2 py-0.5 text-sm font-medium ${
                      completo
                        ? "bg-brand-teal/20 text-brand-green"
                        : "bg-brand-cream text-ink-muted"
                    }`}
                  >
                    {c.costed_items} de {c.total_items}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
