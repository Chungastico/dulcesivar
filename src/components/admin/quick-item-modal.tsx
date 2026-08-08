"use client";

import { useState, useTransition } from "react";

import { Modal } from "@/components/admin/modal";
import { quickCreateInventoryItem } from "@/lib/actions/inventory";

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
  const [category, setCategory] = useState("Otros");
  const [hasVariants, setHasVariants] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    startTransition(async () => {
      setError(null);
      const res = await quickCreateInventoryItem(label, category, hasVariants);
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        onCreated({
          id: res.id,
          label: res.label ?? label.trim(),
          category: res.category ?? (category.trim() || "Otros"),
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            placeholder="Taza térmica 12oz, Listón rojo…"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Categoría</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="quick-item-categories"
            placeholder="Otros"
            className={inputClass}
          />
          <datalist id="quick-item-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

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
            type="submit"
            disabled={pending || !label.trim()}
            className="rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear y seleccionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-line bg-surface-raised px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none";
