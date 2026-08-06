"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/actions/products";
import { slugify } from "@/lib/slug";
import type { ProductLine } from "@/lib/supabase/types";

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  price_usd: string;
  is_active: boolean;
  is_featured: boolean;
  lineIds: string[];
  contents: { label: string; quantity: number }[];
};

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  price_usd: "",
  is_active: true,
  is_featured: false,
  lineIds: [],
  contents: [],
};

export function ProductForm({
  action,
  lines,
  initial = EMPTY,
  submitLabel = "Guardar producto",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  lines: Pick<ProductLine, "id" | "name">[];
  initial?: ProductFormValues;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  // Al crear, el slug sigue al nombre. En cuanto se edita a mano, deja de
  // hacerlo: cambiar el slug de un producto publicado rompe los links ya
  // compartidos, así que nunca se toca solo.
  const [slugLocked, setSlugLocked] = useState(initial.slug !== "");
  const [contents, setContents] = useState(initial.contents);

  const effectiveSlug = slugLocked ? slug : slugify(name);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Field label="Nombre" error={state.fieldErrors?.name}>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          placeholder="Caja sorpresa de chocolates"
          className={inputClass}
        />
      </Field>

      <Field
        label="Slug (URL)"
        error={state.fieldErrors?.slug}
        hint={`El producto vivirá en /catalogo/${effectiveSlug || "..."}`}
      >
        <input
          name="slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugLocked(true);
            setSlug(e.target.value);
          }}
          className={inputClass}
        />
      </Field>

      <Field label="Descripción" error={state.fieldErrors?.description}>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={4}
          maxLength={5000}
          placeholder="Describe el regalo, para quién es y qué lo hace especial."
          className={inputClass}
        />
      </Field>

      <Field
        label="Precio (USD)"
        error={state.fieldErrors?.price_usd}
        hint="Opcional. Déjalo vacío si prefieres cotizar por WhatsApp."
      >
        <input
          name="price_usd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial.price_usd}
          placeholder="25.00"
          className={inputClass}
        />
      </Field>

      <ContentsEditor contents={contents} onChange={setContents} />
      {/* El editor es dinámico: se serializa a JSON en un campo oculto. */}
      <input type="hidden" name="contents" value={JSON.stringify(contents)} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-900">
          Líneas de regalo
        </legend>
        <p className="text-xs text-neutral-500">
          Un producto puede estar en varias. Define en qué filtros aparece.
        </p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {lines.map((line) => (
            <label
              key={line.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="lineIds"
                value={line.id}
                defaultChecked={initial.lineIds.includes(line.id)}
                className="size-4"
              />
              {line.name}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Agregar imágenes"
        hint="JPG, PNG, WebP o AVIF. Máximo 8 MB cada una."
      >
        <input
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-700"
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial.is_active}
            className="size-4"
          />
          Publicado (visible en el catálogo)
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={initial.is_featured}
            className="size-4"
          />
          Destacado
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-200 pt-6">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/productos"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function ContentsEditor({
  contents,
  onChange,
}: {
  contents: { label: string; quantity: number }[];
  onChange: (next: { label: string; quantity: number }[]) => void;
}) {
  const update = (i: number, patch: Partial<{ label: string; quantity: number }>) =>
    onChange(contents.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-neutral-900">
        ¿Qué incluye?
      </legend>
      <p className="text-xs text-neutral-500">
        Los ítems que componen el regalo. Se mostrarán como lista en la ficha.
      </p>

      <div className="mt-1 flex flex-col gap-2">
        {contents.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={item.quantity}
              onChange={(e) =>
                update(i, { quantity: Number(e.target.value) || 1 })
              }
              className="w-20 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              aria-label={`Cantidad del ítem ${i + 1}`}
            />
            <input
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Chocolates artesanales"
              className={`flex-1 ${inputClass}`}
              aria-label={`Nombre del ítem ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => onChange(contents.filter((_, idx) => idx !== i))}
              className="rounded-md px-2 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-red-600"
              aria-label={`Quitar ítem ${i + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...contents, { label: "", quantity: 1 }])}
        className="self-start rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
      >
        + Agregar ítem
      </button>
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-900">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}
