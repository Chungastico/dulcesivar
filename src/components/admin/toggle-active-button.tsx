"use client";

import { useTransition } from "react";

import { toggleProductActive } from "@/lib/actions/products";

/** Publica o despublica sin salir de la lista. */
export function ToggleActiveButton({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => void toggleProductActive(productId, !isActive))
      }
      title={isActive ? "Quitar del catálogo" : "Publicar en el catálogo"}
      className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
        isActive
          ? "bg-brand-teal/20 text-brand-green hover:bg-brand-teal/30"
          : "bg-brand-cream text-ink-muted hover:brightness-95"
      }`}
    >
      {isActive ? "Publicado" : "Borrador"}
    </button>
  );
}
