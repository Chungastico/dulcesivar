"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ContentsEditor, type ContentItem } from "@/components/admin/contents-editor";
import { suggestDescription } from "@/lib/actions/describe-image";
import { downscaleToDataUrl } from "@/lib/downscale-image";
import type { ActionState } from "@/lib/actions/products";
import { slugify } from "@/lib/slug";
import type {
  AttributeGroupWithValues,
  ContentPreset,
} from "@/lib/supabase/types";

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  price_usd: string;
  is_active: boolean;
  is_featured: boolean;
  valueIds: string[];
  contents: ContentItem[];
};

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  price_usd: "",
  is_active: true,
  is_featured: false,
  valueIds: [],
  contents: [],
};

export function ProductForm({
  action,
  groups,
  presets,
  initial = EMPTY,
  submitLabel = "Guardar producto",
  existingImages = 0,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  groups: AttributeGroupWithValues[];
  presets: ContentPreset[];
  initial?: ProductFormValues;
  submitLabel?: string;
  /** Imágenes ya guardadas: si hay, subir una nueva deja de ser obligatorio. */
  existingImages?: number;
}) {
  const [state, formAction] = useActionState(action, {});

  const [name, setName] = useState(initial.name);
  const [contents, setContents] = useState(initial.contents);
  const [newImages, setNewImages] = useState(0);
  const [description, setDescription] = useState(initial.description);
  const [files, setFiles] = useState<FileList | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // El slug se deriva del nombre y nunca se muestra como campo editable: es
  // jerga técnica. En un producto ya publicado se congela, porque cambiarlo
  // rompería los links que ya se compartieron por WhatsApp.
  const slug = initial.slug || slugify(name);

  // Sugerir descripción a partir de la primera foto elegida. La respuesta
  // rellena el campo pero queda editable: es su catálogo y el tono lo pone ella.
  async function handleSuggest() {
    const file = files?.[0];
    if (!file) return;

    setSuggesting(true);
    setSuggestError(null);
    try {
      const dataUrl = await downscaleToDataUrl(file);
      const result = await suggestDescription(dataUrl);
      if (result.description) setDescription(result.description);
      else setSuggestError(result.error ?? "No se pudo generar la descripción.");
    } catch {
      setSuggestError("No se pudo leer la imagen.");
    } finally {
      setSuggesting(false);
    }
  }
  const needsImage = existingImages === 0 && newImages === 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      {/* Datos básicos, en dos columnas para no estirar la página */}
      <section className="grid gap-4 rounded-xl border border-line bg-surface-raised p-4 sm:grid-cols-2">
        <Field
          label="Nombre del regalo"
          required
          error={state.fieldErrors?.name}
          className="sm:col-span-2"
        >
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            placeholder="Morning Box Cumpleaños"
            className={inputClass}
          />
        </Field>

        <Field label="Precio" required error={state.fieldErrors?.price_usd}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-muted">$</span>
            <input
              name="price_usd"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initial.price_usd}
              placeholder="44.00"
              className={inputClass}
            />
          </div>
        </Field>

        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initial.is_active}
              className="size-4"
            />
            Publicado
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={initial.is_featured}
              className="size-4"
            />
            Destacado
          </label>
        </div>

        <Field
          label="Descripción"
          required
          error={state.fieldErrors?.description}
          className="sm:col-span-2"
        >
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            required
            maxLength={5000}
            placeholder="Una caja para empezar el día con dulce, ideal para sorprender en la mañana."
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!files?.length || suggesting}
              title={
                files?.length
                  ? "Genera una sugerencia a partir de la primera foto"
                  : "Elige una foto abajo para poder sugerir"
              }
              className="rounded-lg border border-brand-teal px-2.5 py-1 text-xs font-medium text-brand-green transition hover:bg-brand-teal/10 disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted"
            >
              {suggesting ? "Generando…" : "✨ Sugerir desde la foto"}
            </button>
            {suggestError ? (
              <span className="text-xs text-red-700">{suggestError}</span>
            ) : (
              <span className="text-xs text-ink-muted">
                La sugerencia es editable; revísala antes de guardar.
              </span>
            )}
          </div>
        </Field>

        {slug ? (
          <p className="text-xs text-ink-muted sm:col-span-2">
            Enlace público:{" "}
            <span className="text-brand-green">/catalogo/{slug}</span>
          </p>
        ) : null}
        <input type="hidden" name="slug" value={slug} />
      </section>

      <ContentsEditor
        contents={contents}
        onChange={setContents}
        presets={presets}
        error={state.fieldErrors?.contents}
      />

      {/* Imágenes */}
      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised p-4">
        <span className="text-sm font-medium text-brand-green">
          Fotos {existingImages === 0 ? <Req /> : null}
        </span>
        <input
          type="file"
          name="images"
          multiple
          required={needsImage}
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            setFiles(e.target.files);
            setNewImages(e.target.files?.length ?? 0);
          }}
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
        <p className="text-xs text-ink-muted">
          {existingImages > 0
            ? `Ya tiene ${existingImages} foto${existingImages === 1 ? "" : "s"}. Estas se agregan.`
            : "Al menos una. La primera será la portada."}
        </p>
        {state.fieldErrors?.images ? (
          <p className="text-xs text-red-700">{state.fieldErrors.images}</p>
        ) : null}
      </section>

      {/* Clasificación: chips compactos, un eje por bloque */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface-raised p-4">
        <span className="text-sm font-medium text-brand-green">
          Clasificación
        </span>
        {groups.map((group) => (
          <fieldset key={group.id} className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">{group.name}</legend>
            <span className="w-full text-xs font-medium text-ink-muted sm:w-32 sm:shrink-0">
              {group.name}
            </span>
            {group.attribute_values
              .filter((v) => v.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((value) => (
                <label
                  key={value.id}
                  className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-xs text-ink transition has-checked:border-brand-teal has-checked:bg-brand-teal/15 has-checked:font-medium has-checked:text-brand-green"
                >
                  <input
                    type="checkbox"
                    name="valueIds"
                    value={value.id}
                    defaultChecked={initial.valueIds.includes(value.id)}
                    className="sr-only"
                  />
                  {value.name}
                </label>
              ))}
          </fieldset>
        ))}
      </section>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface/95 py-3 backdrop-blur">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/catalogo"
          className="rounded-lg border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-brand-cream/40"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/25";

function Req() {
  return <span className="text-brand-orange">*</span>;
}

function Field({
  label,
  required,
  error,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-brand-green">
        {label} {required ? <Req /> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-green px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}
