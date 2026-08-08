"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  createGroup,
  createValue,
  deleteGroup,
  deleteValue,
  renameGroup,
  renameValue,
  toggleGroupFilter,
  toggleValueActive,
} from "@/lib/actions/taxonomy";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

/**
 * Editor completo de la taxonomía: crear ejes, crear opciones dentro de cada
 * eje, renombrar, ocultar y borrar. Todo editable, que es el punto: las
 * categorías precargadas son un punto de partida, no algo fijo.
 */
export function TaxonomyManager({
  groups,
}: {
  groups: AttributeGroupWithValues[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
      <NewGroupForm />
    </div>
  );
}

function GroupCard({ group }: { group: AttributeGroupWithValues }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const values = [...group.attribute_values].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface-raised">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-cream/30 px-4 py-3">
        <EditableName
          value={group.name}
          onSave={(name) => renameGroup(group.id, name)}
          className="flex-1 text-base font-semibold text-brand-green"
        />
        <code className="rounded bg-brand-cream px-1.5 py-0.5 text-xs text-brand-green">
          ?{group.slug}=
        </code>

        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={group.show_in_filters}
            disabled={pending}
            onChange={(e) =>
              startTransition(() =>
                void toggleGroupFilter(group.id, e.target.checked),
              )
            }
            className="size-3.5"
          />
          Mostrar como filtro
        </label>

        {confirmDelete ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-red-800">¿Borrar la categoría entera?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => void deleteGroup(group.id))}
              className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-ink-muted hover:underline"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-ink-muted transition hover:text-red-700"
          >
            Borrar
          </button>
        )}
      </header>

      <ul className="flex flex-wrap gap-2 px-4 py-4">
        {values.map((value) => (
          <ValueChip key={value.id} value={value} />
        ))}
        {values.length === 0 ? (
          <li className="text-sm text-ink-muted">
            Sin opciones todavía. Agrega la primera abajo.
          </li>
        ) : null}
      </ul>

      <NewValueForm groupId={group.id} groupName={group.name} />
    </section>
  );
}

function ValueChip({
  value,
}: {
  value: { id: string; name: string; is_active: boolean };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        value.is_active
          ? "border-brand-teal/40 bg-brand-teal/10 text-brand-green"
          : "border-line bg-surface text-ink-muted line-through"
      } ${pending ? "opacity-50" : ""}`}
    >
      <EditableName
        value={value.name}
        onSave={(name) => renameValue(value.id, name)}
        className="bg-transparent"
      />
      <button
        type="button"
        disabled={pending}
        title={value.is_active ? "Ocultar del catálogo" : "Volver a mostrar"}
        onClick={() =>
          startTransition(() => void toggleValueActive(value.id, !value.is_active))
        }
        className="text-xs opacity-60 hover:opacity-100"
      >
        {value.is_active ? "◉" : "○"}
      </button>
      <button
        type="button"
        disabled={pending}
        title="Borrar opción"
        onClick={() => startTransition(() => void deleteValue(value.id))}
        className="text-xs opacity-60 hover:text-red-700 hover:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}

/** Texto que se vuelve input al hacer clic. Evita un modal para renombrar. */
function EditableName({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (name: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Clic para renombrar"
        className={`text-left ${className}`}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) {
      startTransition(() => void onSave(draft));
    }
  };

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className={`w-full min-w-24 rounded border border-brand-teal bg-surface-raised px-1.5 py-0.5 outline-none ${className}`}
    />
  );
}

function NewValueForm({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [state, action] = useActionState(createValue.bind(null, groupId), {});
  const [key, setKey] = useState(0);

  return (
    <form
      key={key}
      action={async (formData) => {
        await action(formData);
        setKey((k) => k + 1); // limpia el input tras guardar
      }}
      className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3"
    >
      <input
        name="name"
        required
        maxLength={80}
        placeholder={`Nueva opción en ${groupName}…`}
        className="min-w-48 flex-1 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-teal focus:outline-none"
      />
      <SubmitButton label="Agregar" />
      {state.error ? (
        <span className="text-xs text-red-700">{state.error}</span>
      ) : null}
    </form>
  );
}

function NewGroupForm() {
  const [state, action] = useActionState(createGroup, {});
  const [key, setKey] = useState(0);

  return (
    <form
      key={key}
      action={async (formData) => {
        await action(formData);
        setKey((k) => k + 1);
      }}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-4"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-brand-green">
          Nueva categoría de clasificación
        </p>
        <p className="text-xs text-ink-muted">
          Ej. Temporada, Color, Ocasión. Se vuelve un filtro nuevo.
        </p>
      </div>
      <input
        name="name"
        required
        maxLength={80}
        placeholder="Nombre de la categoría"
        className="min-w-48 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-teal focus:outline-none"
      />
      <SubmitButton label="Crear categoria" />
      {state.error ? (
        <span className="text-xs text-red-700">{state.error}</span>
      ) : null}
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
