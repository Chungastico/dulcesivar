"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Selector de fotos con vista previa.
 *
 * Va primero en el formulario porque es lo primero que se tiene a mano al
 * cargar un producto: se saca la foto y desde ahí se escribe todo lo demás
 * (de hecho, la descripción se sugiere a partir de ella).
 */
export function ImagePicker({
  onFilesChange,
  existingImages = 0,
  error,
}: {
  onFilesChange: (files: FileList | null) => void;
  existingImages?: number;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  // Las object URLs no se liberan solas; sin esto cada cambio de selección
  // deja memoria colgada.
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function handleFiles(files: FileList | null) {
    setPreviews((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return files ? Array.from(files).map((f) => URL.createObjectURL(f)) : [];
    });
    onFilesChange(files);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-brand-green">
          Fotos del regalo{" "}
          {existingImages === 0 ? (
            <span className="text-brand-orange">*</span>
          ) : null}
        </h2>
        {previews.length > 0 ? (
          <span className="text-sm text-ink-muted">
            {previews.length} seleccionada{previews.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length && inputRef.current) {
            inputRef.current.files = e.dataTransfer.files;
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition ${
          dragging
            ? "border-brand-teal bg-brand-teal/10"
            : "border-line bg-surface"
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-brand-green"
          aria-hidden
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" />
          <path d="m14 15 1.5-1.5a2 2 0 0 1 2.8 0L20 15" />
        </svg>

        <div>
          <p className="text-base font-medium text-ink">
            Arrastra las fotos aquí
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {existingImages > 0
              ? `Este regalo ya tiene ${existingImages} foto${existingImages === 1 ? "" : "s"}. Las nuevas se agregan.`
              : "La primera será la portada del catálogo."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 rounded-lg bg-brand-green px-4 py-2 text-base font-medium text-white transition hover:opacity-90"
        >
          Elegir fotos
        </button>

        <input
          ref={inputRef}
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </div>

      {previews.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {previews.map((url, i) => (
            <li key={url} className="relative">
              {/* Vista previa local; next/image no aplica a object URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="aspect-square w-full rounded-lg border border-line object-cover"
              />
              {i === 0 && existingImages === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded bg-brand-green px-1.5 py-0.5 text-xs font-medium text-white">
                  Portada
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
