"use client";

import { useState, useTransition } from "react";

import { deleteProduct } from "@/lib/actions/products";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="self-start rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Eliminar producto
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-800">
        ¿Eliminar "{productName}" definitivamente?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void deleteProduct(productId))}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Eliminando…" : "Sí, eliminar"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="text-sm text-red-700 hover:underline disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
