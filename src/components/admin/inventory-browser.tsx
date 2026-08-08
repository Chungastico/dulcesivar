"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Modal } from "@/components/admin/modal";
import {
  createVariant,
  deleteInventoryItem,
  deleteVariant,
  renameInventoryItem,
  renameVariant,
  setHasVariants,
  setInventoryLevels,
  type BulkRow,
} from "@/lib/actions/inventory";
import type { InventoryStatus, InventoryVariantStatus } from "@/lib/supabase/types";

const money = (n: number) =>
  n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Lista de insumos con búsqueda, categorías plegables y modal de gestión.
 *
 * Cada fila es clickeable: abre un modal donde se puede marcar si el insumo
 * tiene colores y agregar, editar o eliminar los nombres de esos colores.
 */
export function InventoryBrowser({
  items,
  variantsByItem,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, InventoryVariantStatus[]>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [manuallyOpen, setManuallyOpen] = useState<Set<string>>(new Set());

  // Se guarda el id, no el objeto: así, cada vez que router.refresh() trae los
  // costos recalculados, el modal muestra el dato nuevo en vez de la foto que
  // tenía la fila al momento del clic. Si el insumo se borra, desaparece de
  // `items` y el modal se cierra solo.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = editingId
    ? (items.find((i) => i.id === editingId) ?? null)
    : null;

  const searching = query.trim().length > 0;

  const categories = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, InventoryStatus[]>();

    for (const item of items) {
      if (q) {
        const variants = variantsByItem.get(item.id) ?? [];
        const hit =
          normalize(item.label).includes(q) ||
          variants.some((v) => normalize(v.variant_name).includes(q));
        if (!hit) continue;
      }
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }

    return [...map.entries()].map(([name, list]) => ({
      name,
      list,
      invested: list.reduce((sum, i) => sum + Number(i.total_invested), 0),
      withCost: list.filter((i) => i.avg_unit_cost != null).length,
    }));
  }, [items, query, variantsByItem]);

  function toggle(category: string) {
    setManuallyOpen((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <>
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-brand-green">
              Insumos y costos
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Toca un insumo para ponerle precio, colores o borrarlo. El costo
              unitario es el promedio de todo lo comprado.
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar insumo o color…"
            aria-label="Buscar insumo"
            className="w-full rounded-lg border-2 border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none sm:w-64"
          />
        </div>

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-base text-ink-muted">
            Ningún insumo coincide con &laquo;{query}&raquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categories.map((category) => {
              const isOpen = searching || manuallyOpen.has(category.name);

              return (
                <li
                  key={category.name}
                  className="overflow-hidden rounded-xl border border-line"
                >
                  <button
                    type="button"
                    onClick={() => toggle(category.name)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 bg-brand-cream/40 px-4 py-3 text-left transition hover:bg-brand-cream/70"
                  >
                    <span
                      aria-hidden
                      className={`text-ink-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                    >
                      ▸
                    </span>
                    <span className="flex-1 text-base font-medium text-brand-green">
                      {category.name}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {category.list.length} insumo
                      {category.list.length === 1 ? "" : "s"} ·{" "}
                      {category.withCost} con costo
                    </span>
                    <span className="w-24 text-right text-base font-medium text-ink">
                      {category.invested > 0 ? money(category.invested) : "—"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[36rem] text-left text-base">
                        <thead>
                          <tr className="border-b border-line text-sm text-ink-muted">
                            <th className="py-2 pl-4 pr-3 font-medium">Insumo</th>
                            <th className="w-20 py-2 pr-3 text-center font-medium">
                              Tipo
                            </th>
                            <th className="w-24 py-2 pr-3 text-right font-medium">
                              Unidades
                            </th>
                            <th className="w-28 py-2 pr-3 text-right font-medium">
                              Invertido
                            </th>
                            <th className="w-28 py-2 pr-4 text-right font-medium">
                              Costo unitario
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.list.map((item) => {
                            const variants = item.has_variants
                              ? (variantsByItem.get(item.id) ?? [])
                              : [];

                            return (
                              <ItemRows
                                key={item.id}
                                item={item}
                                variants={variants}
                                onEdit={() => setEditingId(item.id)}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Modal de gestión del insumo */}
      {editingItem ? (
        <ItemEditModal
          key={editingItem.id}
          item={editingItem}
          variants={variantsByItem.get(editingItem.id) ?? []}
          onClose={() => setEditingId(null)}
          onChanged={() => router.refresh()}
          onDeleted={() => setEditingId(null)}
        />
      ) : null}
    </>
  );
}

function ItemRows({
  item,
  variants,
  onEdit,
}: {
  item: InventoryStatus;
  variants: InventoryVariantStatus[];
  onEdit: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-line-soft transition hover:bg-brand-cream/30"
        onClick={onEdit}
        title="Toca para configurar colores"
      >
        <td className="py-2 pl-4 pr-3 font-medium text-ink">
          {item.label}
        </td>
        <td className="py-2 pr-3 text-center">
          {item.has_variants ? (
            <span className="inline-block rounded-full bg-brand-teal/15 px-2 py-0.5 text-xs font-medium text-brand-green">
              Colores
            </span>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          )}
        </td>
        <td className="py-2 pr-3 text-right text-ink-muted">
          {Number(item.total_quantity) || "—"}
        </td>
        <td className="py-2 pr-3 text-right text-ink-muted">
          {Number(item.total_invested) > 0
            ? money(Number(item.total_invested))
            : "—"}
        </td>
        <td className="py-2 pr-4 text-right font-medium text-ink">
          {item.avg_unit_cost != null
            ? money(Number(item.avg_unit_cost))
            : "sin costo"}
        </td>
      </tr>

      {variants.map((v) => (
        <tr key={v.id} className="border-b border-line-soft bg-surface/40">
          <td className="py-1.5 pl-10 pr-3 text-sm text-ink-muted">
            ↳ {v.variant_name}
          </td>
          <td />
          <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
            {Number(v.total_quantity) || "—"}
          </td>
          <td className="py-1.5 pr-3 text-right text-sm text-ink-muted">
            {Number(v.total_invested) > 0
              ? money(Number(v.total_invested))
              : "—"}
          </td>
          <td className="py-1.5 pr-4 text-right text-sm text-ink-muted">
            {v.avg_unit_cost != null ? money(Number(v.avg_unit_cost)) : "sin costo"}
          </td>
        </tr>
      ))}

      {item.has_variants && variants.length === 0 ? (
        <tr className="border-b border-line-soft bg-surface/40">
          <td colSpan={5} className="py-1.5 pl-10 pr-4 text-sm text-ink-muted">
            Sin colores registrados. Toca la fila para agregarlos.
          </td>
        </tr>
      ) : null}
    </>
  );
}

/* =========================================================================
   Modal de gestión de insumo: nombre, precio, colores y eliminar
   ========================================================================= */

/**
 * Una fila de cantidad: el insumo entero, o uno de sus colores. No lleva
 * precio propio — ese es único para el insumo.
 */
type PriceTarget = {
  key: string;
  variantId: string | null;
  label: string;
  /** Lo que ya hay registrado, para no escribirlo dos veces por error. */
  quantity: number;
};

const BASE_KEY = "__base__";

function ItemEditModal({
  item,
  variants,
  onClose,
  onChanged,
  onDeleted,
}: {
  item: InventoryStatus;
  variants: InventoryVariantStatus[];
  onClose: () => void;
  /** Algo cambió en el servidor: hay que recargar los datos de la página. */
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [hasVariants, setHasVariantsLocal] = useState(item.has_variants);
  const [toggling, startToggle] = useTransition();

  // --- Nombre -------------------------------------------------------------
  const [nameDraft, setNameDraft] = useState(item.label);
  const [nameError, setNameError] = useState<string | null>(null);
  const [renaming, startRename] = useTransition();
  const nameDirty = nameDraft.trim() !== item.label && nameDraft.trim() !== "";

  function saveName() {
    if (!nameDirty) return;
    startRename(async () => {
      setNameError(null);
      const res = await renameInventoryItem(item.id, nameDraft.trim());
      if (res.error) setNameError(res.error);
      else onChanged();
    });
  }

  // --- Colores ------------------------------------------------------------
  const [colors, setColors] = useState<{ id: string; name: string }[]>(() =>
    variants.map((v) => ({ id: v.id, name: v.variant_name })),
  );

  function handleToggleVariants(checked: boolean) {
    setHasVariantsLocal(checked);
    startToggle(async () => {
      await setHasVariants(item.id, checked);
      onChanged();
    });
  }

  // --- Precio y stock -----------------------------------------------------
  // UN precio para el insumo entero: el color no cambia lo que cuesta. Una
  // caja negra y una rosada salen igual, así que pedir el precio por color
  // era pedir el mismo número varias veces (y abría la puerta a que se
  // contradijeran). Lo que sí cambia por color es CUÁNTAS hay, y eso se
  // escribe fila por fila.
  const statusById = useMemo(
    () => new Map(variants.map((v) => [v.id, v])),
    [variants],
  );

  const targets: PriceTarget[] = useMemo(() => {
    if (hasVariants && colors.length > 0) {
      return colors.map((c) => {
        const s = statusById.get(c.id);
        return {
          key: c.id,
          variantId: c.id,
          label: c.name,
          quantity: Number(s?.total_quantity ?? 0),
        };
      });
    }
    return [
      {
        key: BASE_KEY,
        variantId: null,
        label: "Cantidad",
        quantity: Number(item.total_quantity),
      },
    ];
  }, [hasVariants, colors, statusById, item]);

  // Los campos arrancan con lo que el insumo tiene HOY: son para corregir un
  // valor, no para sumarle una compra. Lo que quede escrito es lo que queda
  // guardado.
  // 0.6 se muestra como "0.60", pero un costo con más decimales (2.505) se
  // deja tal cual: redondearlo a dos para que se vea bonito lo cambiaría de
  // verdad en cuanto ella guarde cualquier otra cosa.
  const savedPrice = (() => {
    if (item.avg_unit_cost == null) return "";
    const raw = Number(item.avg_unit_cost);
    return Number(raw.toFixed(2)) === raw ? raw.toFixed(2) : String(raw);
  })();
  const savedQty = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of targets) map[t.key] = t.quantity > 0 ? String(t.quantity) : "";
    return map;
  }, [targets]);

  const [priceDraft, setPriceDraft] = useState(savedPrice);
  const [qty, setQty] = useState<Record<string, string>>(savedQty);
  const [purchasedAt, setPurchasedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [saving, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok?: string; error?: string } | null>(
    null,
  );

  // Un color agregado después de abrir el modal no está en savedQty; se le
  // pone "" para que su input exista igual.
  const qtyFor = (key: string) => qty[key] ?? savedQty[key] ?? "";

  const rowsWithStock = targets.filter((t) => Number(qtyFor(t.key)) > 0);
  const totalQty = rowsWithStock.reduce(
    (sum, t) => sum + Number(qtyFor(t.key)),
    0,
  );
  const priceValue = Number(priceDraft);
  const priceOk = priceDraft.trim() !== "" && priceValue > 0;

  // Un solo costo unitario para todas las filas: el color no cambia el precio.
  const unitPrice = priceOk && totalQty > 0 ? priceValue : null;
  const grandTotal = unitPrice != null ? unitPrice * totalQty : null;

  const dirty =
    priceDraft.trim() !== savedPrice ||
    targets.some((t) => qtyFor(t.key).trim() !== (savedQty[t.key] ?? ""));
  // Poner todo en cero es válido ("no me queda ninguna"); pedir precio solo
  // tiene sentido si va a quedar algo de stock.
  const canSave = dirty && (totalQty === 0 || priceOk);

  function saveLevels() {
    if (!canSave) return;

    const rows: BulkRow[] = targets.map((t) => ({
      itemId: item.id,
      variantId: t.variantId,
      quantity: String(Number(qtyFor(t.key)) || 0),
      unitCost: priceDraft.trim() || "0",
    }));

    startSave(async () => {
      setSaveMsg(null);
      const res = await setInventoryLevels(item.id, rows, { purchasedAt });
      if (res.error) setSaveMsg({ error: res.error });
      else {
        setSaveMsg({ ok: res.ok });
        onChanged();
      }
    });
  }

  // --- Eliminar -----------------------------------------------------------
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDeleteItem() {
    startDelete(async () => {
      setDeleteError(null);
      const res = await deleteInventoryItem(item.id);
      if (res.error) {
        setDeleteError(res.error);
      } else {
        onDeleted();
        onChanged();
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={item.label} description={item.category}>
      <div className="flex flex-col divide-y divide-line-soft">
        {/* ---------------- Nombre ---------------- */}
        <Section title="Nombre">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={nameDraft}
              disabled={renaming}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveName();
                }
                if (e.key === "Escape") setNameDraft(item.label);
              }}
              className="min-w-0 flex-1 rounded-lg border-2 border-line bg-surface-raised px-3 py-2 text-base text-ink transition focus:border-brand-teal focus:outline-none disabled:opacity-50"
            />
            {nameDirty ? (
              <>
                <button
                  type="button"
                  disabled={renaming}
                  onClick={saveName}
                  className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {renaming ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  disabled={renaming}
                  onClick={() => setNameDraft(item.label)}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:text-ink disabled:opacity-50"
                >
                  Cancelar
                </button>
              </>
            ) : null}
          </div>
          {nameError ? <FieldError>{nameError}</FieldError> : null}
        </Section>

        {/* ---------------- Precio y stock ---------------- */}
        <Section title="Precio y stock">
          <div className="flex flex-col gap-4">
            {/* Precio: uno solo, porque el color no cambia lo que cuesta. */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">
                  ¿Cuánto cuesta cada una?
                </span>
                <div className="flex items-center gap-1.5 rounded-lg border-2 border-line bg-surface-raised px-3 py-2 transition focus-within:border-brand-teal">
                  <span className="text-base text-ink-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={priceDraft}
                    onChange={(e) => {
                      setPriceDraft(e.target.value);
                      setSaveMsg(null);
                    }}
                    placeholder="0.00"
                    aria-label="Costo unitario"
                    className="w-24 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none"
                  />
                  <span className="whitespace-nowrap text-sm text-ink-muted">
                    c/u
                  </span>
                </div>
              </label>
            </div>

            {/* Cantidades: una por color, o una sola si no tiene colores. */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">
                {targets.length > 1
                  ? "¿Cuántas tienes de cada color?"
                  : "¿Cuántas tienes?"}
              </span>

              <ul className="flex flex-col gap-1.5">
                {targets.map((t) => (
                  <li
                    key={t.key}
                    className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-base text-ink">
                      {t.label}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={qtyFor(t.key)}
                      onChange={(e) => {
                        setQty((prev) => ({
                          ...savedQty,
                          ...prev,
                          [t.key]: e.target.value,
                        }));
                        setSaveMsg(null);
                      }}
                      placeholder="0"
                      aria-label={`Cantidad de ${t.label}`}
                      className="w-20 shrink-0 rounded-lg border-2 border-line bg-surface px-2.5 py-1.5 text-right text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none"
                    />
                  </li>
                ))}
              </ul>

              {hasVariants && colors.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Marcaste que viene en colores pero todavía no agregaste
                  ninguno. Agrégalos abajo y podrás anotar cuántas hay de cada
                  uno.
                </p>
              ) : null}
            </div>

            {/* Resumen: qué se va a guardar exactamente. */}
            {unitPrice != null && grandTotal != null ? (
              <p className="rounded-lg bg-brand-cream/50 px-3 py-2 text-sm text-ink">
                {totalQty} unidad{totalQty === 1 ? "" : "es"} ×{" "}
                <strong className="font-semibold">{money(unitPrice)}</strong> c/u
                = <strong className="font-semibold">{money(grandTotal)}</strong>
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={saveLevels}
                className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>

              <label className="flex items-center gap-2 text-sm text-ink-muted">
                Fecha
                <input
                  type="date"
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                  className="rounded-lg border-2 border-line bg-surface-raised px-2.5 py-1.5 text-sm text-ink focus:border-brand-teal focus:outline-none"
                />
              </label>

              {saveMsg?.ok ? (
                <span className="text-sm font-medium text-brand-green">
                  {saveMsg.ok}
                </span>
              ) : null}
            </div>

            {saveMsg?.error ? <FieldError>{saveMsg.error}</FieldError> : null}

            <p className="text-xs text-ink-muted">
              Estos campos muestran lo que el insumo tiene ahora. Al guardar,
              reemplazan el valor anterior — no se le suman.
            </p>
          </div>
        </Section>

        {/* ---------------- Colores ---------------- */}
        <Section
          title="Colores"
          action={
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={hasVariants}
                disabled={toggling}
                onChange={(e) => handleToggleVariants(e.target.checked)}
                className="size-4 accent-[var(--brand-green)] disabled:opacity-50"
              />
              Tiene colores
            </label>
          }
        >
          {hasVariants ? (
            <ul className="flex flex-wrap items-center gap-2">
              {colors.map((c) => (
                <ColorChip
                  key={c.id}
                  color={c}
                  onRenamed={(newName) => {
                    setColors((prev) =>
                      prev.map((x) =>
                        x.id === c.id ? { ...x, name: newName } : x,
                      ),
                    );
                    onChanged();
                  }}
                  onDeleted={() => {
                    setColors((prev) => prev.filter((x) => x.id !== c.id));
                    onChanged();
                  }}
                />
              ))}

              <AddColorChip
                itemId={item.id}
                onCreated={(newColor) => {
                  setColors((prev) =>
                    prev.some((c) => c.id === newColor.id)
                      ? prev
                      : [...prev, newColor],
                  );
                  onChanged();
                }}
              />
            </ul>
          ) : null}
        </Section>

        {/* ---------------- Eliminar ---------------- */}
        <Section title="Eliminar">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <p className="text-sm text-red-900">
                Se borrará <strong>{item.label}</strong>
                {colors.length > 0
                  ? `, sus ${colors.length} color${colors.length === 1 ? "" : "es"}`
                  : ""}
                {Number(item.total_invested) > 0
                  ? ` y su historial de compras (${money(Number(item.total_invested))} registrados)`
                  : ""}
                . No se puede deshacer.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteItem}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Eliminando…" : "Sí, eliminar insumo"}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-lg border-2 border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-cream/50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
              {deleteError ? <FieldError>{deleteError}</FieldError> : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg border-2 border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50"
            >
              Eliminar este insumo
            </button>
          )}
        </Section>
      </div>
    </Modal>
  );
}

/** Bloque del modal: título chico y contenido, separados por una línea. */
function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  /** Control compacto alineado a la derecha del título. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {title}
          </h3>
          {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {children}
    </p>
  );
}


/** Chip de color con edición en línea y botón para borrar */
function ColorChip({
  color,
  onRenamed,
  onDeleted,
}: {
  color: { id: string; name: string };
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(color.name);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === color.name) {
      setDraft(color.name);
      setEditing(false);
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await renameVariant(color.id, trimmed);
      if (res.error) {
        setError(res.error);
        setDraft(color.name);
      } else {
        onRenamed(trimmed);
      }
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      setError(null);
      const res = await deleteVariant(color.id);
      if (res.error) {
        setError(res.error);
      } else {
        onDeleted();
      }
    });
  }

  if (editing) {
    return (
      <li className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") {
              setDraft(color.name);
              setEditing(false);
            }
          }}
          className="rounded-full border-2 border-brand-teal bg-surface px-3 py-1 text-sm text-ink focus:outline-none"
        />
        {error ? <span className="text-xs text-red-700">{error}</span> : null}
      </li>
    );
  }

  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-full border border-brand-teal/40 bg-brand-cream/60 py-1 pl-3 pr-2 text-sm text-ink transition hover:bg-brand-cream ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Clic para renombrar"
        className="text-left font-medium hover:text-brand-green"
      >
        {color.name}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        title="Eliminar este color"
        className="rounded-full p-0.5 text-xs text-ink-muted transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
      >
        ✕
      </button>
    </li>
  );
}

/**
 * Campo para agregar un color, con la forma de un chip más de la fila.
 *
 * Antes era un input ancho con botón "+ Agregar" y dos líneas de ayuda debajo.
 * Ocupaba más espacio que la lista de colores que estaba administrando, para
 * una acción que se explica sola. Se confirma con Enter o saliendo del campo.
 */
function AddColorChip({
  itemId,
  onCreated,
}: {
  itemId: string;
  onCreated: (color: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    startTransition(async () => {
      setError(null);
      const res = await createVariant(itemId, trimmed);
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        onCreated({ id: res.id, name: trimmed });
        setName("");
      }
    });
  }

  return (
    <li className="inline-flex flex-col gap-1">
      <input
        value={name}
        disabled={pending}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onBlur={handleAdd}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
          if (e.key === "Escape") {
            setName("");
            setError(null);
          }
        }}
        placeholder="+ color"
        aria-label="Agregar color"
        className="w-28 rounded-full border-2 border-dashed border-line bg-transparent px-3 py-1 text-sm text-ink placeholder:text-ink-muted focus:border-solid focus:border-brand-teal focus:outline-none disabled:opacity-50"
      />
      {error ? (
        <span className="text-xs font-medium text-red-700">{error}</span>
      ) : null}
    </li>
  );
}
