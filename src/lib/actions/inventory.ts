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
  // "" (sin variante) se normaliza a null antes de llegar aquí, para que la
  // validación uuid no reviente con un insumo que no tiene colores.
  variant_id: z.string().uuid().nullable(),
  quantity: z.coerce
    .number({ message: "La cantidad es obligatoria" })
    .positive("La cantidad debe ser mayor que cero")
    .max(1_000_000),
  total_cost: z.coerce
    .number({ message: "El precio total es obligatorio" })
    .min(0, "El precio no puede ser negativo")
    .max(1_000_000),
  purchase_type: z.enum(["mayoreo", "individual"]).default("individual"),
  supplier: z.string().trim().max(120).optional(),
  purchased_at: z.string().trim().min(1, "Falta la fecha"),
  notes: z.string().trim().max(500).optional(),
});

export async function registerPurchase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const rawVariant = String(formData.get("variant_id") ?? "").trim();

  const parsed = purchaseSchema.safeParse({
    item_id: formData.get("item_id"),
    variant_id: rawVariant || null,
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
      variant_id: parsed.data.variant_id,
      quantity: parsed.data.quantity,
      total_cost: parsed.data.total_cost,
      purchase_type: parsed.data.purchase_type,
      supplier: parsed.data.supplier ?? null,
      purchased_at: parsed.data.purchased_at,
      notes: parsed.data.notes ?? null,
    });

  if (error) {
    // El trigger de la base lanza este mensaje si el color elegido no
    // pertenece al insumo (no debería poder pasar por la UI, pero si pasa,
    // que se entienda por qué falló en vez de mostrar el error crudo de Postgres).
    return {
      error: error.message.includes("no pertenece a este insumo")
        ? "Ese color no pertenece al insumo elegido."
        : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");

  const unit = parsed.data.total_cost / parsed.data.quantity;
  return { ok: `Compra registrada. Costo unitario: $${unit.toFixed(2)}` };
}

/**
 * Crea un color/variante nuevo para un insumo, desde el propio formulario de
 * compra: si aparece un color que no está en la lista, no hay que ir a otra
 * pantalla a darlo de alta.
 */
export async function createVariant(
  presetId: string,
  name: string,
): Promise<ActionState & { id?: string }> {
  await requireAdmin();

  const trimmed = name.trim();
  if (trimmed.length < 1) return { error: "Escribe el nombre del color." };

  const db = supabaseAdmin();
  const { data: last } = await db
    .from("content_preset_variants")
    .select("sort_order")
    .eq("preset_id", presetId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("content_preset_variants")
    .insert({
      preset_id: presetId,
      name: trimmed,
      sort_order: (last?.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ese insumo ya tiene un color con ese nombre."
          : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  return { ok: `Color «${trimmed}» agregado.`, id: data.id };
}

// ---------------------------------------------------------------------------
// Carga inicial: registrar muchos insumos de una vez.
//
// Llenar el formulario de "Registrar compra" insumo por insumo no es viable
// para poblar 74 insumos de arranque. Esta acción recibe un lote entero y lo
// inserta en una sola operación.
//
// Se llama directo desde el cliente (no como <form action>): así se le pasa
// un arreglo tipado en vez de tener que codificar N filas en un FormData con
// nombres tipo quantity[3], cost[3], que sería más frágil de parsear.
//
// Cada fila sigue siendo su propia compra (mismo esquema que registerPurchase,
// una por insumo): no existe manera de que esto termine como una sola compra
// gigante que mezcle artículos, porque inventory_purchases exige un item_id
// por fila. El tipo "inicial" es lo que las distingue de una compra real a un
// proveedor en cualquier reporte futuro.
// ---------------------------------------------------------------------------

const bulkRowSchema = z.object({
  itemId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.coerce.number().positive().max(1_000_000),
  totalCost: z.coerce.number().min(0).max(1_000_000),
});

const bulkMetaSchema = z.object({
  purchasedAt: z.string().trim().min(1, "Falta la fecha"),
  purchaseType: z.enum(["inicial", "mayoreo", "individual"]).default("inicial"),
  supplier: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type BulkRow = {
  itemId: string;
  /** null = fila del insumo base; un id = fila de un color específico. */
  variantId: string | null;
  quantity: string;
  totalCost: string;
};
export type BulkMeta = {
  purchasedAt: string;
  purchaseType?: "inicial" | "mayoreo" | "individual";
  supplier?: string;
  notes?: string;
};
export type BulkResult = { error?: string; ok?: string; saved?: number; skipped?: number };

export async function bulkRegisterInventory(
  rows: BulkRow[],
  meta: BulkMeta,
): Promise<BulkResult> {
  await requireAdmin();

  const parsedMeta = bulkMetaSchema.safeParse(meta);
  if (!parsedMeta.success) return { error: parsedMeta.error.issues[0].message };

  // Solo cuentan las filas donde ella escribió cantidad Y costo. Una fila con
  // cantidad pero sin costo se descarta en vez de guardarse en $0: un costo
  // inventado a la baja arrastraría el promedio ponderado de ese insumo hacia
  // abajo y mentiría en el margen de cada regalo que lo use.
  const candidates = rows.filter(
    (r) => r.quantity.trim() !== "" && r.totalCost.trim() !== "",
  );
  const skipped = rows.length - candidates.length;

  if (candidates.length === 0) {
    return {
      error:
        skipped > 0
          ? "Ninguna fila tiene cantidad y costo juntos. Ambos son necesarios para registrar el insumo."
          : "No hay insumos que registrar.",
    };
  }

  const validated = candidates.map((r) => bulkRowSchema.safeParse(r));
  const bad = validated.find((v) => !v.success);
  if (bad && !bad.success) {
    return { error: `Revisa los números: ${bad.error.issues[0].message}` };
  }

  const good = validated
    .filter((v): v is { success: true; data: z.infer<typeof bulkRowSchema> } => v.success)
    .map((v) => v.data);

  const payload = good.map((row) => ({
    item_id: row.itemId,
    variant_id: row.variantId,
    quantity: row.quantity,
    total_cost: row.totalCost,
    purchase_type: parsedMeta.data.purchaseType,
    supplier: parsedMeta.data.supplier ?? null,
    purchased_at: parsedMeta.data.purchasedAt,
    notes: parsedMeta.data.notes ?? "Carga inicial de inventario",
  }));

  const { error } = await supabaseAdmin().from("inventory_purchases").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");

  return {
    ok: `${good.length} insumo${good.length === 1 ? "" : "s"} registrado${good.length === 1 ? "" : "s"}${
      skipped > 0 ? `. ${skipped} sin cantidad+costo se omitieron.` : "."
    }`,
    saved: good.length,
    skipped,
  };
}

/**
 * Borra TODAS las compras registradas (incluida la carga inicial) para
 * empezar de cero. No toca los insumos de la biblioteca ni el catálogo, solo
 * el historial de compras del que sale el costo promedio.
 */
export async function resetInventory(): Promise<BulkResult> {
  await requireAdmin();

  const { error, count } = await supabaseAdmin()
    .from("inventory_purchases")
    .delete({ count: "exact" })
    // Supabase exige un filtro explícito; este coincide con toda fila real,
    // ya que "id" nunca es NULL.
    .not("id", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");

  return { ok: `Inventario vaciado: se borraron ${count ?? 0} compras.` };
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
  const hasVariants = formData.get("has_variants") === "on";

  if (label.length < 2) return { error: "Escribe el nombre del insumo." };

  const { error } = await supabaseAdmin().from("content_presets").insert({
    label,
    category,
    unit,
    has_variants: hasVariants,
    sort_order: 999,
    is_active: true,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un insumo con ese nombre."
          : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  return { ok: `Insumo "${label}" agregado.` };
}

/** Alta rápida de insumo desde buscadores (qué incluye, registrar compra, carga por lote). */
export async function quickCreateInventoryItem(
  label: string,
  category: string = "Otros",
  hasVariants: boolean = false,
): Promise<{ id?: string; label?: string; category?: string; error?: string }> {
  await requireAdmin();
  const trimmed = label.trim();
  if (trimmed.length < 2) return { error: "Escribe el nombre del insumo." };

  const { data, error } = await supabaseAdmin()
    .from("content_presets")
    .insert({
      label: trimmed,
      category: category.trim() || "Otros",
      unit: "unidad",
      has_variants: hasVariants,
      sort_order: 999,
      is_active: true,
    })
    .select("id, label, category")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un insumo con ese nombre."
          : error.message,
    };
  }

  return { id: data.id, label: data.label, category: data.category };
}

/**
 * Marca o desmarca si un insumo viene en colores/variantes. Es la casilla
 * "Colores" de la tabla de costos: reemplaza tener que adivinarlo mirando si
 * ya existen filas en content_preset_variants.
 */
export async function setHasVariants(itemId: string, hasVariants: boolean) {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from("content_presets")
    .update({ has_variants: hasVariants })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/carga-inicial");
}
