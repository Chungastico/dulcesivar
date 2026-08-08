"use client";

import { useState, useTransition } from "react";

import { deleteProductImage, setCoverImage } from "@/lib/actions/products";

export type ExistingPhoto = {
  id: string;
  url: string;
  isCover: boolean;
};

type Item =
  | { kind: "preview"; url: string }
  | { kind: "existing"; url: string; id: string; isCover: boolean };

/**
 * Panel de fotos fijo a la derecha, visible durante todos los pasos.
 *
 * Existe porque la carga se hace mirando la foto: el nombre, la descripción y
 * sobre todo la lista de "qué incluye" se escriben viendo qué trae la caja. Si
 * la imagen solo apareciera en el paso 1, habría que ir y volver para cada
 * ítem.
 *
 * También es el único lugar donde se gestionan las fotos ya guardadas
 * (portada / borrar): antes había una segunda galería arriba de la página
 * mostrando la misma foto, lo que la duplicaba en pantalla sin necesidad.
 */
export function PhotoRail({
  previews,
  existingPhotos = [],
}: {
  /** Fotos recién elegidas, aún sin subir. */
  previews: string[];
  /** Fotos ya guardadas del producto, al editar. */
  existingPhotos?: ExistingPhoto[];
}) {
  const all: Item[] = [
    ...previews.map((url) => ({ kind: "preview" as const, url })),
    ...existingPhotos.map((p) => ({ kind: "existing" as const, ...p })),
  ];
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const current = all[Math.min(active, all.length - 1)];

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-green">
          Foto de referencia
        </h2>
        {all.length > 1 ? (
          <span className="text-sm text-ink-muted">
            {Math.min(active, all.length - 1) + 1} de {all.length}
          </span>
        ) : null}
      </div>

      {current ? (
        <>
          <div
            className={`overflow-hidden rounded-xl border border-line bg-surface ${pending ? "opacity-60" : ""}`}
          >
            {/* Vista previa local: next/image no aplica a object URLs, y las
                del bucket ya vienen dimensionadas. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt="Foto del regalo"
              className="max-h-[26rem] w-full object-contain"
            />
          </div>

          {current.kind === "existing" ? (
            <div className="flex items-center justify-between gap-2">
              {current.isCover ? (
                <span className="rounded bg-brand-green/10 px-2 py-1 text-sm font-medium text-brand-green">
                  Portada
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => void setCoverImage(current.id))
                  }
                  className="text-sm text-ink-muted transition hover:text-brand-green disabled:opacity-50"
                >
                  Hacer portada
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setActive(0);
                  startTransition(() => void deleteProductImage(current.id));
                }}
                className="text-sm text-ink-muted transition hover:text-red-700 disabled:opacity-50"
              >
                Borrar esta foto
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Nueva: se sube al guardar.
            </p>
          )}

          {all.length > 1 ? (
            <ul className="grid grid-cols-5 gap-2">
              {all.map((item, i) => (
                <li key={item.kind === "existing" ? item.id : item.url}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`relative block w-full overflow-hidden rounded-lg border-2 transition ${
                      i === active
                        ? "border-brand-green"
                        : "border-line hover:border-brand-teal"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    {item.kind === "existing" && item.isCover ? (
                      <span className="absolute left-1 top-1 rounded bg-brand-green/90 px-1 py-0.5 text-[10px] font-medium text-white">
                        Portada
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-10 text-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-ink-muted"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" />
          </svg>
          <p className="text-sm text-ink-muted">
            Aquí verás la foto del regalo mientras llenas el formulario.
          </p>
        </div>
      )}
    </aside>
  );
}
