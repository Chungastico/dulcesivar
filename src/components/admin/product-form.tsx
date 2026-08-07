"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  ContentsEditor,
  type ContentItem,
} from "@/components/admin/contents-editor";
import { StepIndicator, type Step } from "@/components/admin/form-steps";
import { ImagePicker } from "@/components/admin/image-picker";
import { PhotoRail } from "@/components/admin/photo-rail";
import { TagPicker } from "@/components/admin/tag-picker";
import { suggestDescription } from "@/lib/actions/describe-image";
import { suggestTags } from "@/lib/actions/suggest-tags";
import type { ActionState } from "@/lib/actions/products";
import { downscaleToDataUrl } from "@/lib/downscale-image";
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

const STEPS: Step[] = [
  { id: 1, label: "Foto", hint: "Cómo se ve el regalo" },
  { id: 2, label: "Datos", hint: "Nombre y precio" },
  { id: 3, label: "Qué incluye", hint: "Los ítems de la caja" },
  { id: 4, label: "Etiquetas", hint: "Dónde aparece" },
];

export function ProductForm({
  action,
  groups,
  presets,
  initial = EMPTY,
  submitLabel = "Guardar producto",
  existingImages = 0,
  existingImageUrls = [],
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  groups: AttributeGroupWithValues[];
  presets: ContentPreset[];
  initial?: ProductFormValues;
  submitLabel?: string;
  existingImages?: number;
  /** URLs de las fotos ya guardadas, para mostrarlas en el panel lateral. */
  existingImageUrls?: string[];
}) {
  const [state, formAction] = useActionState(action, {});

  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);

  const [name, setName] = useState(initial.name);
  const [price, setPrice] = useState(initial.price_usd);
  const [description, setDescription] = useState(initial.description);
  const [contents, setContents] = useState(initial.contents);
  const [files, setFiles] = useState<FileList | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tagPicks, setTagPicks] = useState<Record<string, string[]> | null>(null);
  const [taggingBusy, setTaggingBusy] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Las object URLs viven aquí y no en el selector, porque el panel lateral
  // también las usa. Se liberan al cambiar de selección o al desmontar; si no,
  // cada cambio de fotos dejaría memoria colgada.
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function pickFiles(list: FileList | null) {
    setPreviews((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return list ? Array.from(list).map((f) => URL.createObjectURL(f)) : [];
    });
    setFiles(list);
    setStepError(null);
  }

  const slug = initial.slug || slugify(name);
  const hasPhoto = existingImages > 0 || (files?.length ?? 0) > 0;

  // Validación por paso. Se hace aquí y no con el atributo `required` del HTML
  // porque los pasos ocultos siguen montados (desmontarlos perdería sus
  // valores al enviar) y un campo required invisible bloquea el submit con un
  // error del navegador que el usuario no puede ver ni corregir.
  function validate(target: number): string | null {
    if (target > 1 && !hasPhoto) return "Agrega al menos una foto del regalo.";
    if (target > 2) {
      if (name.trim().length < 2) return "Escribe el nombre del regalo.";
      if (!price.trim() || Number(price) < 0) return "Escribe el precio.";
      if (description.trim().length < 10)
        return "Escribe una descripción de al menos 10 caracteres.";
    }
    if (target > 3 && contents.length === 0)
      return "Agrega al menos un ítem de lo que incluye.";
    return null;
  }

  function go(target: number) {
    if (target > step) {
      const problem = validate(target);
      if (problem) {
        setStepError(problem);
        return;
      }
    }
    setStepError(null);
    setStep(target);
    setFurthest((f) => Math.max(f, target));
  }

  async function handleSuggest() {
    const file = files?.[0];
    if (!file) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const dataUrl = await downscaleToDataUrl(file);
      const result = await suggestDescription(dataUrl);
      if (result.description) setDescription(result.description);
      else
        setSuggestError(result.error ?? "No se pudo generar la descripción.");
    } catch {
      setSuggestError("No se pudo leer la imagen.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSuggestTags() {
    const file = files?.[0];
    if (!file) return;
    setTaggingBusy(true);
    setTagError(null);
    try {
      const dataUrl = await downscaleToDataUrl(file);
      // Se manda solo lo que el modelo necesita para elegir; el resto de la
      // taxonomía (ids, orden, fechas) no le aporta y encarece la llamada.
      const result = await suggestTags(
        dataUrl,
        groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          values: g.attribute_values
            .filter((v) => v.is_active)
            .map((v) => ({ slug: v.slug, name: v.name })),
        })),
      );
      if (result.error) setTagError(result.error);
      else setTagPicks(result.picked ?? {});
    } catch {
      setTagError("No se pudo leer la imagen.");
    } finally {
      setTaggingBusy(false);
    }
  }

  const isLast = step === STEPS.length;

  return (
    <form action={formAction} className="flex flex-col gap-4 pb-24">
      <StepIndicator
        steps={STEPS}
        current={step}
        furthest={furthest}
        onGo={go}
      />

      {state.error ? (
        <p className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-base text-red-800">
          {state.error}
        </p>
      ) : null}
      {stepError ? (
        <p className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 px-4 py-3 text-base text-ink">
          {stepError}
        </p>
      ) : null}

      {/* La foto queda fija a la derecha durante los cuatro pasos: la carga se
          hace mirándola, sobre todo al listar qué incluye la caja. */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          {/* Todos los pasos quedan montados: ocultarlos con `hidden` conserva sus
          valores en el envío, cosa que desmontarlos perdería. */}
          <div className={step === 1 ? "" : "hidden"}>
            <ImagePicker
              onFilesChange={pickFiles}
              selectedCount={previews.length}
              existingImages={existingImages}
              error={state.fieldErrors?.images}
            />
          </div>

          <div className={step === 2 ? "" : "hidden"}>
            <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5">
              <h2 className="text-base font-semibold text-brand-green">
                Datos del regalo
              </h2>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Nombre" required error={state.fieldErrors?.name}>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    placeholder="Morning Box Cumpleaños"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Precio"
                  required
                  error={state.fieldErrors?.price_usd}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-ink-muted">
                      $
                    </span>
                    <input
                      name="price_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="44.00"
                      className={inputClass}
                    />
                  </div>
                </Field>
              </div>

              <Field
                label="Descripción"
                required
                error={state.fieldErrors?.description}
              >
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Una caja para empezar el día con dulce, ideal para sorprender en la mañana."
                  className={inputClass}
                />
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={!files?.length || suggesting}
                    className="rounded-lg border-2 border-brand-teal px-3.5 py-2 text-base font-medium text-brand-green transition hover:bg-brand-teal/10 disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted"
                  >
                    {suggesting ? "Generando…" : "✨ Sugerir desde la foto"}
                  </button>
                  <span
                    className={`text-sm ${suggestError ? "text-red-700" : "text-ink-muted"}`}
                  >
                    {suggestError ??
                      (files?.length
                        ? "La sugerencia es editable; revísala antes de guardar."
                        : "Vuelve al paso 1 y elige una foto para poder sugerir.")}
                  </span>
                </div>
              </Field>

              <div className="flex flex-wrap gap-6 border-t border-line-soft pt-4">
                <Toggle
                  name="is_active"
                  defaultChecked={initial.is_active}
                  label="Publicado"
                  hint="Visible en el catálogo"
                />
                <Toggle
                  name="is_featured"
                  defaultChecked={initial.is_featured}
                  label="Destacado"
                  hint="Aparece primero"
                />
              </div>

              {slug ? (
                <p className="text-sm text-ink-muted">
                  Enlace público:{" "}
                  <span className="font-medium text-brand-green">
                    /catalogo/{slug}
                  </span>
                </p>
              ) : null}
            </section>
          </div>

          <div className={step === 3 ? "" : "hidden"}>
            <ContentsEditor
              contents={contents}
              onChange={(c) => {
                setContents(c);
                setStepError(null);
              }}
              presets={presets}
              error={state.fieldErrors?.contents}
            />
          </div>

          <div className={step === 4 ? "" : "hidden"}>
            <TagPicker
          groups={groups}
          initialIds={initial.valueIds}
          suggestion={{
            picked: tagPicks,
            loading: taggingBusy,
            error: tagError,
            available: (files?.length ?? 0) > 0,
            onRequest: handleSuggestTags,
          }}
        />
          </div>
        </div>

        <PhotoRail previews={previews} existingUrls={existingImageUrls} />
      </div>

      <input type="hidden" name="slug" value={slug} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="rounded-lg border-2 border-line px-5 py-2.5 text-base font-medium text-ink transition hover:bg-brand-cream/50"
            >
              ← Atrás
            </button>
          ) : null}

          {isLast ? (
            <SubmitButton label={submitLabel} />
          ) : (
            <button
              type="button"
              onClick={() => go(step + 1)}
              className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90"
            >
              Siguiente →
            </button>
          )}

          <span className="ml-auto hidden text-sm text-ink-muted sm:block">
            Paso {step} de {STEPS.length}
          </span>

          <Link
            href="/admin/catalogo"
            className="text-base text-ink-muted transition hover:text-ink hover:underline"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/20";

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-5 accent-[var(--brand-green)]"
      />
      <span className="flex flex-col">
        <span className="text-base text-ink">{label}</span>
        <span className="text-sm text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-base font-medium text-ink">
        {label} {required ? <span className="text-brand-orange">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-green px-6 py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}
