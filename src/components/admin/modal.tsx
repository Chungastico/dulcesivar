"use client";

import { useEffect } from "react";

/**
 * Ventana modal para acciones puntuales.
 *
 * Registrar una compra es algo que se hace y se cierra, no algo que deba estar
 * siempre en pantalla: metido en una columna fija de la página obligaba a
 * apretar 8 campos en 24rem de ancho. Aquí el formulario respira y la página
 * de atrás queda limpia.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Sin esto la página de atrás sigue haciendo scroll debajo del modal.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4 sm:p-8">
      {/* Capa de fondo: cerrar tocando fuera es lo que espera cualquiera. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative mx-auto w-full ${
          wide ? "max-w-4xl" : "max-w-2xl"
        } rounded-2xl border border-line bg-surface shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-green">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-xl leading-none text-ink-muted transition hover:bg-brand-cream/60 hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
