"use client";

import { useRef, useState } from "react";

/**
 * Zona de carga de fotos.
 *
 * Solo elige archivos: la vista previa vive en PhotoRail, que queda fija a la
 * derecha durante todos los pasos. Duplicar las miniaturas aquí solo repetiría
 * lo que ya se ve al lado.
 */
export function ImagePicker({
  onFilesChange,
  selectedCount,
  existingImages = 0,
  error,
}: {
  onFilesChange: (files: FileList | null) => void;
  selectedCount: number;
  existingImages?: number;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-brand-green">
          Fotos del regalo{" "}
          {existingImages === 0 ? (
            <span className="text-brand-orange">*</span>
          ) : null}
        </h2>
        {selectedCount > 0 ? (
          <span className="text-sm text-ink-muted">
            {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}
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
            onFilesChange(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-brand-teal bg-brand-teal/10" : "border-line bg-surface"
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
          {selectedCount > 0 ? "Cambiar fotos" : "Elegir fotos"}
        </button>

        <input
          ref={inputRef}
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => onFilesChange(e.target.files)}
          className="sr-only"
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
