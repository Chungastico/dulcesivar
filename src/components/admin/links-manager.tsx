"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";

import { reorderValues } from "@/lib/actions/taxonomy";

type LinkRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  count: number;
};

/**
 * Arrastrar y soltar para reordenar las ocasiones de /enlaces. El estado
 * local se mueve al soltar (respuesta inmediata) y el guardado real pasa por
 * detrás; si falla, se revierte a lo que había antes de arrastrar.
 */
export function LinksManager({
  groupId,
  values,
}: {
  groupId: string;
  values: LinkRow[];
}) {
  const [items, setItems] = useState(values);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;

    setItems(reordered);
    setError(null);

    startTransition(async () => {
      try {
        await reorderValues(
          groupId,
          reordered.map((i) => i.id),
        );
      } catch (e) {
        setItems(previous);
        setError(
          e instanceof Error ? e.message : "No se pudo guardar el orden.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            className={`flex flex-col gap-2 transition-opacity ${pending ? "opacity-70" : ""}`}
          >
            {items.map((value, i) => (
              <SortableRow key={value.id} value={value} position={i + 1} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  value,
  position,
}: {
  value: LinkRow;
  position: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm ${
        value.is_active
          ? "border-line bg-surface-raised"
          : "border-line-soft bg-surface text-ink-muted"
      } ${isDragging ? "z-10 shadow-lg ring-2 ring-brand-teal/50" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar «${value.name}» para reordenar`}
        className="touch-none cursor-grab rounded p-1 text-ink-muted transition hover:text-brand-green active:cursor-grabbing"
      >
        <GripVertical className="size-5" aria-hidden />
      </button>

      <span className="w-6 text-right text-sm text-ink-muted">{position}</span>

      <span className="flex-1 text-base font-medium text-ink">
        {value.name}
      </span>

      {!value.is_active ? (
        <span className="rounded-full bg-line-soft px-2 py-0.5 text-xs text-ink-muted">
          oculta en el catálogo
        </span>
      ) : null}

      <span className="text-sm text-ink-muted">
        {value.count} regalo{value.count === 1 ? "" : "s"}
      </span>
    </li>
  );
}
