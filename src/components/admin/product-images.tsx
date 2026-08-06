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
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
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
          className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
        >
          <div className="relative aspect-square bg-neutral-100">
            <Image
              src={`${publicUrlBase}/${image.storage_path}`}
              alt={image.alt_text ?? ""}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />
            {image.is_cover ? (
              <span className="absolute left-2 top-2 rounded bg-neutral-900/80 px-1.5 py-0.5 text-xs font-medium text-white">
                Portada
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            {image.is_cover ? (
              <span className="text-xs text-neutral-400">Principal</span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => void setCoverImage(image.id))
                }
                className="text-xs text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
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
              className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
