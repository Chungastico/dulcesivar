"use client";

import { useState, useTransition } from "react";

import { resetInventory } from "@/lib/actions/inventory";

/**
 * Borra todas las compras registradas para empezar de cero.
 *
 * Confirmación en dos pasos porque es irreversible: borra también la carga
 * inicial, no solo compras "de verdad". No toca la biblioteca de insumos ni
 * el catálogo, solo el historial del que sale el costo promedio.
 */
export function ResetInventoryButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-ink-muted underline transition hover:text-red-700"
      >
        Vaciar inventario y empezar de cero
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-800">
        Esto borra <strong>todas</strong> las compras registradas (incluida
        cualquier carga inicial). Los insumos y el catálogo no se tocan. No se
        puede deshacer.
      </p>
      {message ? <p className="text-sm text-red-900">{message}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resetInventory();
              setMessage(result.error ?? result.ok ?? null);
              if (!result.error) setConfirming(false);
            })
          }
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Borrando…" : "Sí, vaciar todo"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="text-sm text-red-700 hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
