"use client";

import Image from "next/image";
import { useTransition } from "react";

import { deleteProductImage, setCoverImage } from "@/lib/actions/products";
import type { ProductImage } from "@/lib/supabase/types";

/**
 * Galería de imágenes ya guardadas de un producto.
 * Las imágenes nuevas se suben desde el formulario; aquí solo se borran o se
 * elige cuál es la portada.
 */
export function ProductImages({
  images,
  publicUrlBase,
}: {
  images: ProductImage[];
  publicUrlBase: string;
}) {
  const [pending, startTransition] = useTransition();

  if (!images.length) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface-raised px-4 py-8 text-center text-sm text-ink-muted">
        Este producto aún no tiene imágenes. Agrégalas con el campo de abajo.
      </p>
    );
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${pending ? "opacity-60" : ""}`}
    >
      {images.map((image) => (
        <li
          key={image.id}
          className="overflow-hidden rounded-xl border border-line bg-surface-raised"
        >
          <div className="relative aspect-square bg-brand-cream/50">
            <Image
              src={`${publicUrlBase}/${image.storage_path}`}
              alt={image.alt_text ?? ""}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />
            {image.is_cover ? (
              <span className="absolute left-2 top-2 rounded bg-brand-green/90 px-1.5 py-0.5 text-xs font-medium text-white">
                Portada
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            {image.is_cover ? (
              <span className="text-xs text-ink-muted">Principal</span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => void setCoverImage(image.id))
                }
                className="text-xs text-ink-muted transition hover:text-brand-green disabled:opacity-50"
              >
                Hacer portada
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => void deleteProductImage(image.id))
              }
              className="text-xs text-ink-muted transition hover:text-red-700 disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
