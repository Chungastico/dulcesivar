"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  bulkRegisterInventory,
  createVariant,
  type BulkRow,
} from "@/lib/actions/inventory";
import type { InventoryStatus } from "@/lib/supabase/types";

const TYPE_LABELS = {
  inicial: "Carga inicial (stock que ya tienes)",
  mayoreo: "Compra a mayoreo",
  individual: "Compra individual",
} as const;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type BulkVariant = { id: string; name: string; totalQuantity: number };

/** Clave de fila: un insumo sin color, o un color específico de un insumo. */
function rowKey(itemId: string, variantId: string | null) {
  return `${itemId}::${variantId ?? ""}`;
}

/**
 * Tabla para registrar stock de muchos insumos a la vez.
 *
 * Llenar "Registrar compra" insumo por insumo no era viable para poblar
 * decenas de artículos de arranque. Aquí se escribe cantidad y costo en la
 * misma fila que cada insumo y se guarda todo junto.
 *
 * Solo cuentan las filas con cantidad Y costo: una fila con cantidad pero sin
 * costo se ignora en vez de guardarse en $0, que arrastraría el promedio
 * ponderado de ese insumo hacia abajo y mentiría en el margen de cada regalo.
 *
 * Un insumo con colores (una taza, un termo…) se expande en una fila por
 * color en vez de una sola: el stock se guarda por color, que es como ella
 * realmente lo tiene separado. El color se puede dar de alta aquí mismo, sin
 * salir a otra pantalla.
 */
export function BulkStockTable({
  items,
  variantsByItem,
  variantsEnabled = true,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, BulkVariant[]>;
  /** false si la migración 006 no se ha corrido: oculta "+ agregar color". */
  variantsEnabled?: boolean;
}) {
  const router = useRouter();

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  // Texto tal cual se escribió en "costo por unidad", por fila. Separado del
  // valor derivado (costo total / cantidad): si el campo mostrara el
  // derivado y a la vez se pudiera editar, el cursor saltaría y el número se
  // reformatearía a cada tecla mientras escribe.
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [purchaseType, setPurchaseType] =
    useState<keyof typeof TYPE_LABELS>("inicial");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [supplier, setSupplier] = useState("");

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: string; ok?: string } | null>(
    null,
  );

  // Colores creados desde esta tabla en lo que va de la sesión, antes de que
  // la página recargue los datos del servidor con la lista actualizada.
  const [localVariants, setLocalVariants] = useState<Record<string, BulkVariant[]>>(
    {},
  );
  const variantsFor = (itemId: string) => [
    ...(variantsByItem.get(itemId) ?? []),
    ...(localVariants[itemId] ?? []),
  ];

  const byCategory = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, InventoryStatus[]>();
    for (const item of items) {
      const variants = variantsFor(item.id);
      const matchesItem = !q || normalize(item.label).includes(q);
      const matchesVariant = variants.some((v) => normalize(v.name).includes(q));
      if (q && !matchesItem && !matchesVariant) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, variantsByItem, localVariants]);

  const filledCount = Object.keys(quantities).filter(
    (key) => quantities[key]?.trim() && costs[key]?.trim(),
  ).length;

  async function handleSubmit() {
    const rows: BulkRow[] = Object.keys(quantities)
      .filter((key) => quantities[key]?.trim())
      .map((key) => {
        const [itemId, variantId] = key.split("::");
        return {
          itemId,
          variantId: variantId || null,
          quantity: quantities[key],
          totalCost: costs[key] ?? "",
        };
      });

    if (rows.length === 0) {
      setResult({ error: "Escribe cantidad y costo en al menos un insumo." });
      return;
    }

    setSaving(true);
    setResult(null);
    try {
      const res = await bulkRegisterInventory(rows, {
        purchasedAt,
        purchaseType,
        supplier: supplier.trim() || undefined,
      });
      setResult(res.error ? { error: res.error } : { ok: res.ok });
      if (!res.error && (res.saved ?? 0) > 0) {
        setQuantities({});
        setCosts({});
        router.refresh(); // refleja el stock nuevo en "ya tiene X" y en los totales
      }
    } finally {
      setSaving(false);
    }
  }

  function handleVariantCreated(itemId: string, variant: BulkVariant) {
    setLocalVariants((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), variant],
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-surface-raised p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Tipo</span>
          <select
            value={purchaseType}
            onChange={(e) =>
              setPurchaseType(e.target.value as keyof typeof TYPE_LABELS)
            }
            className={inputClass}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Fecha</span>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            Proveedor <span className="text-ink-muted">(opcional)</span>
          </span>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Distribuidora…"
            className={inputClass}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Buscar insumo</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe para filtrar la lista…"
            className={inputClass}
          />
        </label>
      </section>

      {result?.error ? (
        <p className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-base text-red-800">
          {result.error}
        </p>
      ) : result?.ok ? (
        <p className="rounded-lg border-2 border-brand-teal bg-brand-teal/10 px-4 py-3 text-base text-brand-green">
          {result.ok}
        </p>
      ) : null}

      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised/95 px-4 py-3 backdrop-blur">
        <span className="text-base text-ink-muted">
          {filledCount} fila{filledCount === 1 ? "" : "s"} lista
          {filledCount === 1 ? "" : "s"} para guardar
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || filledCount === 0}
          className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : `Guardar ${filledCount || ""}`.trim()}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b-2 border-line bg-brand-cream/30 text-sm text-ink-muted">
              <th className="py-2 pl-4 pr-3 font-medium">Insumo</th>
              <th className="w-32 py-2 pr-3 text-right font-medium">
                Ya registrado
              </th>
              <th className="w-28 py-2 pr-3 font-medium">Cantidad</th>
              <th className="w-32 py-2 pr-3 font-medium">Costo total</th>
              <th className="w-32 py-2 pr-4 font-medium">Costo unit.</th>
            </tr>
          </thead>
          {byCategory.map(([category, list]) => (
            <tbody key={category}>
              <tr>
                <td
                  colSpan={5}
                  className="bg-brand-cream/50 px-4 py-1.5 text-sm font-medium text-brand-green"
                >
                  {category}
                </td>
              </tr>
              {list.map((item) => {
                const variants = variantsFor(item.id);

                if (variants.length > 0) {
                  return (
                    <Row
                      key={item.id}
                      groupLabel={`${item.label} (${item.unit})`}
                      sub
                      rows={variants.map((v) => ({
                        key: rowKey(item.id, v.id),
                        label: v.name,
                        existing: v.totalQuantity,
                      }))}
                      quantities={quantities}
                      costs={costs}
                      unitDrafts={unitDrafts}
                      setQuantities={setQuantities}
                      setCosts={setCosts}
                      setUnitDrafts={setUnitDrafts}
                      addColor={
                        variantsEnabled ? (
                          <AddColor
                            itemId={item.id}
                            onCreated={(v) => handleVariantCreated(item.id, v)}
                          />
                        ) : null
                      }
                    />
                  );
                }

                return (
                  <Row
                    key={item.id}
                    rows={[
                      {
                        key: rowKey(item.id, null),
                        label: `${item.label} (${item.unit})`,
                        existing: Number(item.total_quantity) || 0,
                      },
                    ]}
                    quantities={quantities}
                    costs={costs}
                    unitDrafts={unitDrafts}
                    setQuantities={setQuantities}
                    setCosts={setCosts}
                    setUnitDrafts={setUnitDrafts}
                    addColor={
                      variantsEnabled ? (
                        <AddColor
                          itemId={item.id}
                          label="+ Este insumo tiene colores"
                          onCreated={(v) => handleVariantCreated(item.id, v)}
                        />
                      ) : null
                    }
                  />
                );
              })}
            </tbody>
          ))}
        </table>

        {byCategory.length === 0 ? (
          <p className="px-4 py-10 text-center text-base text-ink-muted">
            Ningún insumo coincide con «{query}».
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  groupLabel,
  sub = false,
  rows,
  quantities,
  costs,
  unitDrafts,
  setQuantities,
  setCosts,
  setUnitDrafts,
  addColor,
}: {
  groupLabel?: string;
  sub?: boolean;
  rows: { key: string; label: string; existing: number }[];
  quantities: Record<string, string>;
  costs: Record<string, string>;
  unitDrafts: Record<string, string>;
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCosts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setUnitDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addColor?: React.ReactNode;
}) {
  return (
    <>
      {groupLabel ? (
        <tr>
          <td colSpan={5} className="py-1 pl-4 pr-3 text-sm font-medium text-ink">
            {groupLabel}
          </td>
        </tr>
      ) : null}
      {rows.map((row, i) => {
        const qty = quantities[row.key] ?? "";
        const cost = costs[row.key] ?? "";
        const q = Number(qty);
        const c = Number(cost);
        const derivedUnit = qty && cost && q > 0 ? c / q : null;
        // Mientras escribe en "costo por unidad" se muestra tal cual lo tecleó,
        // no el valor recalculado: si mostrara el derivado, el número se
        // reformatearía a cada tecla y el cursor saltaría.
        const unitDisplay =
          unitDrafts[row.key] ?? (derivedUnit != null ? derivedUnit.toFixed(4) : "");
        const isLast = i === rows.length - 1;

        return (
          <tr key={row.key} className="border-b border-line-soft">
            <td className={`py-1.5 pr-3 text-ink ${sub ? "pl-8 text-sm" : "pl-4"}`}>
              {sub ? "↳ " : ""}
              {row.label}
              {isLast && addColor ? <span className="ml-2">{addColor}</span> : null}
            </td>
            <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
              {row.existing > 0 ? row.existing : "—"}
            </td>
            <td className="py-1.5 pr-3">
              <input
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={qty}
                onChange={(e) => {
                  const newQty = e.target.value;
                  setQuantities((prev) => ({ ...prev, [row.key]: newQty }));
                  // Si ya había un costo unitario escrito, cambiar la cantidad
                  // debe recalcular el total con ese unitario, no dejarlo fijo.
                  const draft = unitDrafts[row.key];
                  const u = Number(draft);
                  const nq = Number(newQty);
                  if (draft && nq > 0 && !Number.isNaN(u)) {
                    setCosts((prev) => ({ ...prev, [row.key]: (u * nq).toFixed(2) }));
                  }
                }}
                aria-label={`Cantidad de ${row.label}`}
                className={cellInput}
              />
            </td>
            <td className="py-1.5 pr-3">
              <div className="flex items-center gap-1">
                <span className="text-ink-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => {
                    setCosts((prev) => ({ ...prev, [row.key]: e.target.value }));
                    // El total escrito a mano manda sobre cualquier unitario
                    // que hubiera quedado de antes.
                    setUnitDrafts((prev) => ({ ...prev, [row.key]: "" }));
                  }}
                  aria-label={`Costo total de ${row.label}`}
                  className={cellInput}
                />
              </div>
            </td>
            <td className="py-1.5 pr-4">
              <div className="flex items-center gap-1">
                <span className="text-ink-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  disabled={!(q > 0)}
                  value={unitDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUnitDrafts((prev) => ({ ...prev, [row.key]: value }));
                    const u = Number(value);
                    if (q > 0 && value !== "" && !Number.isNaN(u)) {
                      setCosts((prev) => ({ ...prev, [row.key]: (u * q).toFixed(2) }));
                    }
                  }}
                  title={q > 0 ? undefined : "Escribe la cantidad primero"}
                  aria-label={`Costo por unidad de ${row.label}`}
                  className={`${cellInput} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

/**
 * Alta de color en línea: sin esto, para agregar "Taza — Rojo" habría que
 * salir a "Registrar compra", crearlo ahí, y volver. La nueva fila aparece de
 * inmediato con los campos vacíos listos para llenar.
 */
function AddColor({
  itemId,
  label = "+ Agregar color",
  onCreated,
}: {
  itemId: string;
  label?: string;
  onCreated: (variant: BulkVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-brand-green underline decoration-dotted transition hover:text-brand-teal"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Negro, blanco…"
        className="w-32 rounded border-2 border-line bg-surface px-1.5 py-0.5 text-sm text-ink focus:border-brand-teal focus:outline-none"
      />
      <button
        type="button"
        disabled={pending || !name.trim()}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await createVariant(itemId, name);
            if (res.error) setError(res.error);
            else if (res.id) {
              onCreated({ id: res.id, name: name.trim(), totalQuantity: 0 });
              setName("");
              setOpen(false);
            }
          })
        }
        className="rounded bg-brand-green px-2 py-0.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-ink-muted hover:underline"
      >
        ✕
      </button>
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </span>
  );
}

const inputClass =
  "rounded-lg border-2 border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";

const cellInput =
  "w-full min-w-0 rounded-md border-2 border-line bg-surface px-2 py-1.5 text-base text-ink focus:border-brand-teal focus:outline-none";
