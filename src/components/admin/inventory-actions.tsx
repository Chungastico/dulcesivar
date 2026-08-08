"use client";

import { useState } from "react";

import { Modal } from "@/components/admin/modal";
import { NewItemForm } from "@/components/admin/new-item-form";
import { PurchaseForm } from "@/components/admin/purchase-form";
import type { ContentPresetVariant, InventoryStatus } from "@/lib/supabase/types";

/**
 * Barra de acciones del inventario.
 *
 * Los formularios viven en modales porque son acciones puntuales: tenerlos
 * clavados en una columna de la página apretaba ocho campos en 24rem y dejaba
 * la pantalla llena de cosas que ella no está usando en ese momento.
 */
export function InventoryActions({
  items,
  variantsByItem,
  variantsEnabled,
  categories,
}: {
  items: InventoryStatus[];
  variantsByItem: Map<string, ContentPresetVariant[]>;
  variantsEnabled: boolean;
  categories: string[];
}) {
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openNewItem, setOpenNewItem] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpenPurchase(true)}
          className="rounded-lg bg-brand-green px-5 py-2.5 text-base font-semibold text-white transition hover:opacity-90"
        >
          + Registrar compra
        </button>
        {/* "Cargar varios a la vez" (/admin/inventario/carga-inicial) quedó
            fuera de la barra: el wizard de 3 pasos resultó más engorroso que
            abrir el insumo y escribirle cantidad y precio ahí mismo. La página
            y el wizard siguen en el repo por si hace falta recuperarlos. */}
        <button
          type="button"
          onClick={() => setOpenNewItem(true)}
          className="rounded-lg border-2 border-line px-4 py-2.5 text-base font-medium text-ink transition hover:border-brand-teal hover:bg-brand-teal/10"
        >
          Nuevo insumo
        </button>
      </div>

      <Modal
        open={openPurchase}
        onClose={() => setOpenPurchase(false)}
        title="Registrar compra"
        description="Anota cuántas unidades compraste y cuánto costó cada una."
        wide
      >
        <PurchaseForm
          items={items}
          variantsByItem={variantsByItem}
          variantsEnabled={variantsEnabled}
        />
      </Modal>

      <Modal
        open={openNewItem}
        onClose={() => setOpenNewItem(false)}
        title="Nuevo insumo"
        description="¿No aparece en la lista al registrar una compra? Créalo aquí."
      >
        <NewItemForm categories={categories} />
      </Modal>
    </>
  );
}
