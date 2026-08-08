"use client";

import { useMemo, useState, useTransition } from "react";

import { Modal } from "@/components/admin/modal";
import {
  createVariant,
  deleteVariant,
  renameVariant,
  setHasVariants,
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
  const [query, setQuery] = useState("");
  const [manuallyOpen, setManuallyOpen] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<InventoryStatus | null>(null);

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
              Toca un insumo para configurar colores. El costo unitario es el
              promedio ponderado.
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
            Ningún insumo coincide con "{query}".
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
                              Comprado
                            </th>
                            <th className="w-28 py-2 pr-3 text-right font-medium">
                              Invertido
                            </th>
                            <th className="w-28 py-2 pr-4 text-right font-medium">
                              Costo unit.
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
                                onEdit={() => setEditingItem(item)}
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
          item={editingItem}
          variants={variantsByItem.get(editingItem.id) ?? []}
          onClose={() => setEditingItem(null)}
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
   Modal de gestión de insumo: colores, renombrar, eliminar y has_variants
   ========================================================================= */

function ItemEditModal({
  item,
  variants,
  onClose,
}: {
  item: InventoryStatus;
  variants: InventoryVariantStatus[];
  onClose: () => void;
}) {
  const [hasVariants, setHasVariantsLocal] = useState(item.has_variants);
  const [toggling, startToggle] = useTransition();

  // Estado único y unificado de colores para evitar duplicados
  const [colors, setColors] = useState<{ id: string; name: string }[]>(() =>
    variants.map((v) => ({ id: v.id, name: v.variant_name })),
  );

  function handleToggleVariants(checked: boolean) {
    setHasVariantsLocal(checked);
    startToggle(async () => {
      await setHasVariants(item.id, checked);
    });
  }

  function handleColorCreated(newColor: { id: string; name: string }) {
    setColors((prev) => {
      if (prev.some((c) => c.id === newColor.id)) return prev;
      return [...prev, newColor];
    });
  }

  function handleColorRenamed(id: string, newName: string) {
    setColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    );
  }

  function handleColorDeleted(id: string) {
    setColors((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.label}
      description={item.category}
    >
      <div className="flex flex-col gap-5">
        {/* Toggle de colores */}
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={hasVariants}
              disabled={toggling}
              onChange={(e) => handleToggleVariants(e.target.checked)}
              className="size-5 accent-[var(--brand-green)] disabled:opacity-50"
            />
            <span className="flex flex-col">
              <span className="text-base font-medium text-ink">
                Este insumo viene en colores
              </span>
              <span className="text-sm text-ink-muted">
                Activa esto si comprás este insumo en distintos colores
                (ej: taza roja, taza negra). Si no aplica, déjalo apagado.
              </span>
            </span>
          </label>
        </div>

        {/* Lista de colores y agregar nuevos */}
        {hasVariants ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Colores / variantes ({colors.length})
              </h3>
              <span className="text-xs text-ink-muted">
                Toca un nombre para editarlo o la ✕ para borrarlo
              </span>
            </div>

            {colors.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <ColorChip
                    key={c.id}
                    color={c}
                    onRenamed={(newName) => handleColorRenamed(c.id, newName)}
                    onDeleted={() => handleColorDeleted(c.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">
                Aún no hay colores. Agrega los que existen abajo.
              </p>
            )}

            <AddColorForm
              itemId={item.id}
              onCreated={handleColorCreated}
            />
          </div>
        ) : null}

        {/* Info adicional */}
        <div className="grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
          <div>
            <p className="text-sm text-ink-muted">Comprado</p>
            <p className="text-lg font-semibold text-ink">
              {Number(item.total_quantity) || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Invertido</p>
            <p className="text-lg font-semibold text-ink">
              {Number(item.total_invested) > 0
                ? money(Number(item.total_invested))
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Costo unit.</p>
            <p className="text-lg font-semibold text-brand-green">
              {item.avg_unit_cost != null
                ? money(Number(item.avg_unit_cost))
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
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

function AddColorForm({
  itemId,
  onCreated,
}: {
  itemId: string;
  onCreated: (color: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await createVariant(itemId, name);
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        onCreated({ id: res.id, name: name.trim() });
        setSuccess(`Color "${name.trim()}" agregado`);
        setName("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSuccess(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Nombre del color (ej: Negro, Rojo…)"
          className="flex-1 rounded-lg border-2 border-line bg-surface-raised px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none"
        />
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={handleAdd}
          className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "…" : "+ Agregar"}
        </button>
      </div>
      {error ? (
        <span className="text-sm text-red-700">{error}</span>
      ) : null}
      {success ? (
        <span className="text-sm text-brand-green">{success}</span>
      ) : null}
      <p className="text-xs text-ink-muted">
        Tip: escribe un color y presiona Enter para agregar rápido varios seguidos.
      </p>
    </div>
  );
}
