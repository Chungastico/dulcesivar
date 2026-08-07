"use client";

import { useState } from "react";

/**
 * Panel de fotos fijo a la derecha, visible durante todos los pasos.
 *
 * Existe porque la carga se hace mirando la foto: el nombre, la descripción y
 * sobre todo la lista de "qué incluye" se escriben viendo qué trae la caja. Si
 * la imagen solo apareciera en el paso 1, habría que ir y volver para cada
 * ítem.
 */
export function PhotoRail({
  previews,
  existingUrls = [],
}: {
  /** Fotos recién elegidas, aún sin subir. */
  previews: string[];
  /** Fotos ya guardadas del producto, al editar. */
  existingUrls?: string[];
}) {
  const all = [...previews, ...existingUrls];
  const [active, setActive] = useState(0);
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
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {/* Vista previa local: next/image no aplica a object URLs, y las
                del bucket ya vienen dimensionadas. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt="Foto del regalo"
              className="max-h-[26rem] w-full object-contain"
            />
          </div>

          {all.length > 1 ? (
            <ul className="grid grid-cols-5 gap-2">
              {all.map((url, i) => (
                <li key={url}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`block w-full overflow-hidden rounded-lg border-2 transition ${
                      i === active
                        ? "border-brand-green"
                        : "border-line hover:border-brand-teal"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-sm text-ink-muted">
            Queda a la vista mientras llenas los demás pasos.
          </p>
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
