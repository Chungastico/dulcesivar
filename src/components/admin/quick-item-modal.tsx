"use client";

import { useMemo, useState, useTransition } from "react";

import { Modal } from "@/components/admin/modal";
import { quickCreateInventoryItem } from "@/lib/actions/inventory";

const DEFAULT_CATEGORIES = [
  "Comestibles",
  "Vasos y tazas",
  "Peluches y globos",
  "Bebidas",
  "Cajas y empaques",
  "Accesorios y detalles",
  "Otros",
];

export function QuickItemModal({
  open,
  initialName = "",
  categories = [],
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName?: string;
  categories?: string[];
  onClose: () => void;
  onCreated: (item: {
    id: string;
    label: string;
    category: string;
    has_variants: boolean;
  }) => void;
}) {
  const [label, setLabel] = useState(initialName);
  const [selectedCategory, setSelectedCategory] = useState("Otros");
  const [customCategory, setCustomCategory] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...categories.filter(Boolean)]);
    return Array.from(set);
  }, [categories]);

  const effectiveCategory =
    selectedCategory === "__custom__"
      ? customCategory.trim() || "Otros"
      : selectedCategory;

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!label.trim()) return;

    startTransition(async () => {
      setError(null);
      const res = await quickCreateInventoryItem(
        label,
        effectiveCategory,
        hasVariants,
      );
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        onCreated({
          id: res.id,
          label: res.label ?? label.trim(),
          category: res.category ?? effectiveCategory,
          has_variants: hasVariants,
        });
        onClose();
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear nuevo insumo"
      description="Agrega el insumo para seleccionarlo inmediatamente."
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <p className="rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            Nombre del insumo <span className="text-brand-orange">*</span>
          </span>
          <input
            autoFocus
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Panini, Taza térmica, Listón rojo…"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Categoría</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={inputClass}
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom__">+ Otra categoría…</option>
          </select>
        </label>

        {selectedCategory === "__custom__" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">
              Nombre de la nueva categoría
            </span>
            <input
              autoFocus
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Ej. Desayunos, Panadería…"
              className={inputClass}
            />
          </label>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => setHasVariants(e.target.checked)}
            className="size-4 accent-[var(--brand-green)]"
          />
          Viene en colores u otras variantes
        </label>

        <div className="mt-2 flex items-center justify-end gap-3 border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-cream/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !label.trim()}
            onClick={() => handleSubmit()}
            className="rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear y seleccionar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-line bg-surface-raised px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";
