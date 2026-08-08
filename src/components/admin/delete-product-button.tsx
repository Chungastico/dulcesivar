"use client";

import { useState, useTransition } from "react";

import { Modal } from "@/components/admin/modal";
import { deleteProduct } from "@/lib/actions/products";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border-2 border-red-300 bg-surface-raised px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-500 hover:bg-red-50"
      >
        Eliminar este producto
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="¿Eliminar producto definitivamente?"
        description="Esta acción no se puede deshacer."
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-ink">
            Estás a punto de borrar{" "}
            <strong className="font-semibold text-red-700">"{productName}"</strong>.
            Se eliminará del catálogo público, junto con sus fotos y su lista de
            contenido.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-lg border-2 border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-cream/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteProduct(productId);
                })
              }
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Eliminando…" : "Sí, eliminar producto"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
