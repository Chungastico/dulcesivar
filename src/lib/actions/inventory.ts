"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionState = { error?: string; ok?: string };

/**
 * Se captura cantidad y precio TOTAL porque es como llega la información real:
 * una factura dice "$18 por 24 chocolates", no el unitario. La división la
 * hace la base de datos, así no se guardan redondeos hechos a mano.
 */
const purchaseSchema = z.object({
  item_id: z.string().uuid("Elige un insumo de la lista"),
  quantity: z.coerce
    .number({ message: "La cantidad es obligatoria" })
    .positive("La cantidad debe ser mayor que cero")
    .max(1_000_000),
  total_cost: z.coerce
    .number({ message: "El precio total es obligatorio" })
    .min(0, "El precio no puede ser negativo")
    .max(1_000_000),
  purchase_type: z.enum(["mayoreo", "individual"]),
  supplier: z.string().trim().max(120).optional(),
  purchased_at: z.string().trim().min(1, "Falta la fecha"),
  notes: z.string().trim().max(500).optional(),
});

export async function registerPurchase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = purchaseSchema.safeParse({
    item_id: formData.get("item_id"),
    quantity: formData.get("quantity"),
    total_cost: formData.get("total_cost"),
    purchase_type: formData.get("purchase_type"),
    supplier: String(formData.get("supplier") ?? "").trim() || undefined,
    purchased_at: formData.get("purchased_at"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabaseAdmin()
    .from("inventory_purchases")
    .insert({
      item_id: parsed.data.item_id,
      quantity: parsed.data.quantity,
      total_cost: parsed.data.total_cost,
      purchase_type: parsed.data.purchase_type,
      supplier: parsed.data.supplier ?? null,
      purchased_at: parsed.data.purchased_at,
      notes: parsed.data.notes ?? null,
    });

  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");

  const unit = parsed.data.total_cost / parsed.data.quantity;
  return { ok: `Compra registrada. Costo unitario: $${unit.toFixed(2)}` };
}

export async function deletePurchase(purchaseId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from("inventory_purchases")
    .delete()
    .eq("id", purchaseId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");
}

/** Crea un insumo que aún no está en la biblioteca, desde el propio inventario. */
export async function createInventoryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "Otros").trim() || "Otros";
  const unit = String(formData.get("unit") ?? "unidad").trim() || "unidad";

  if (label.length < 2) return { error: "Escribe el nombre del insumo." };

  const { error } = await supabaseAdmin()
    .from("content_presets")
    .insert({ label, category, unit, sort_order: 999, is_active: true });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un insumo con ese nombre."
          : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  return { ok: `Insumo «${label}» agregado.` };
}
