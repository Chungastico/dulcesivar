"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionState = { error?: string; ok?: string };

/**
 * Se captura cantidad y COSTO UNITARIO. La tabla guarda el total pagado (y de
 * ahí Postgres deriva unit_cost), pero esa multiplicación se hace una sola vez,
 * aquí abajo, justo antes de insertar.
 *
 * Antes los formularios ofrecían escribir el precio total o el unitario, a
 * elección. Se quitó: era una decisión de más en cada carga, y tener dos
 * caminos hacia la misma columna abría la puerta a que se contradijeran.
 */
const purchaseSchema = z.object({
  item_id: z.string().uuid("Elige un insumo de la lista"),
  // "" (sin variante) se normaliza a null antes de llegar aquí, para que la
  // validación uuid no reviente con un insumo que no tiene colores.
  variant_id: z.string().uuid().nullable(),
  // Entera: se compran 20 cajas, no 19.999. Las cantidades rotas que había en
  // la base venían del spinner de un <input step="0.001">, no de nadie
  // escribiéndolas. Si algún día entra un insumo que se compra por peso, este
  // es el punto a relajar (ver supabase/migrations/008_cantidades_enteras.sql).
  quantity: z.coerce
    .number({ message: "La cantidad es obligatoria" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor que cero")
    .max(1_000_000),
  unit_cost: z.coerce
    .number({ message: "El precio por unidad es obligatorio" })
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
    unit_cost: formData.get("unit_cost"),
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
      total_cost: parsed.data.unit_cost * parsed.data.quantity,
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

  const total = parsed.data.unit_cost * parsed.data.quantity;
  return { ok: `Compra registrada. Total: $${total.toFixed(2)}` };
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
  revalidatePath("/admin/inventario/carga-inicial");
  return { ok: `Color "${trimmed}" agregado.`, id: data.id };
}

/** Renombra un color/variante existente de un insumo. */
export async function renameVariant(
  variantId: string,
  name: string,
): Promise<ActionState> {
  await requireAdmin();
  const trimmed = name.trim();
  if (trimmed.length < 1) return { error: "El nombre no puede quedar vacío." };

  const { error } = await supabaseAdmin()
    .from("content_preset_variants")
    .update({ name: trimmed })
    .eq("id", variantId);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe otro color con ese nombre en este insumo."
          : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/carga-inicial");
  return { ok: `Color renombrado a "${trimmed}".` };
}

/** Elimina un color/variante de un insumo. */
export async function deleteVariant(variantId: string): Promise<ActionState> {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from("content_preset_variants")
    .delete()
    .eq("id", variantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/carga-inicial");
  return { ok: "Color eliminado." };
}

/**
 * Renombra un insumo de la biblioteca (la fila de content_presets, no un
 * color). El historial de compras y los colores no se tocan: solo cambia la
 * etiqueta con la que se muestra en todos lados.
 */
export async function renameInventoryItem(
  itemId: string,
  label: string,
): Promise<ActionState> {
  await requireAdmin();

  const trimmed = label.trim();
  if (trimmed.length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres." };
  }

  const { error } = await supabaseAdmin()
    .from("content_presets")
    .update({ label: trimmed })
    .eq("id", itemId);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un insumo con ese nombre."
          : error.message,
    };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/carga-inicial");
  revalidatePath("/admin/catalogo");
  return { ok: `Insumo renombrado a "${trimmed}".` };
}

/**
 * Elimina un insumo completo de la biblioteca. Por las FK de la base:
 * - Sus compras (inventory_purchases) se borran en cascada.
 * - Sus colores (content_preset_variants) se borran en cascada.
 * - Si aparece en el "qué incluye" de algún producto (product_contents),
 *   ese ítem no se borra: solo pierde el enlace al insumo (preset_id -> null)
 *   y queda como texto suelto, sin costo.
 * El caller es responsable de confirmar con la usuaria antes de llamar esto,
 * ya que no se puede deshacer.
 */
export async function deleteInventoryItem(itemId: string): Promise<ActionState> {
  await requireAdmin();

  const { error } = await supabaseAdmin()
    .from("content_presets")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/inventario/carga-inicial");
  revalidatePath("/admin/catalogo");
  return { ok: "Insumo eliminado." };
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
  quantity: z.coerce
    .number()
    .int("las cantidades deben ser números enteros")
    .positive()
    .max(1_000_000),
  unitCost: z.coerce.number().min(0).max(1_000_000),
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
  /** Lo que cuesta UNA unidad. El total lo calcula esta acción. */
  unitCost: string;
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
    (r) => r.quantity.trim() !== "" && r.unitCost.trim() !== "",
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
    // Único lugar del proyecto donde se calcula un total. Los formularios solo
    // piden el unitario.
    total_cost: row.unitCost * row.quantity,
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

// ---------------------------------------------------------------------------
// Corregir el stock y el costo de un insumo a mano.
//
// A diferencia de registrarPurchase/bulkRegisterInventory, esto NO suma al
// historial: lo REEMPLAZA. Lo que quede escrito en el modal es exactamente lo
// que va a tener el insumo.
//
// Es una decisión deliberada para esta etapa: ella está cargando el catálogo
// por primera vez y necesita poder corregir un número mal escrito sin pelear
// contra un promedio ponderado que arrastra el error anterior. El costo es que
// se pierde el detalle de compras previas de ese insumo (fechas, proveedores).
// Cuando el catálogo esté estable, el camino correcto vuelve a ser registrar
// compras y dejar que el promedio haga su trabajo.
// ---------------------------------------------------------------------------

/** Igual que bulkRowSchema pero admite 0 = "no tengo ninguna". */
const levelRowSchema = z.object({
  itemId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.coerce
    .number()
    .int("las cantidades deben ser números enteros")
    .min(0)
    .max(1_000_000),
  unitCost: z.coerce.number().min(0).max(1_000_000),
});

export async function setInventoryLevels(
  itemId: string,
  rows: BulkRow[],
  meta: { purchasedAt: string },
): Promise<BulkResult> {
  await requireAdmin();

  if (!meta.purchasedAt?.trim()) return { error: "Falta la fecha." };

  // Se valida TODO antes de tocar la base: si un número está mal, se sale sin
  // haber borrado nada.
  const validated = rows.map((r) => levelRowSchema.safeParse(r));
  const bad = validated.find((v) => !v.success);
  if (bad && !bad.success) {
    return { error: `Revisa los números: ${bad.error.issues[0].message}` };
  }

  const good = validated
    .filter((v): v is { success: true; data: z.infer<typeof levelRowSchema> } => v.success)
    .map((v) => v.data);

  const db = supabaseAdmin();

  // Las compras que hay ahora. Se capturan sus ids ANTES de insertar para
  // borrar exactamente esas y ninguna nueva.
  const { data: previous, error: readError } = await db
    .from("inventory_purchases")
    .select("id")
    .eq("item_id", itemId);

  if (readError) return { error: readError.message };
  const previousIds = (previous ?? []).map((p) => p.id);

  // Una cantidad en 0 significa "no tengo ninguna": no se inserta fila.
  const payload = good
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      item_id: itemId,
      variant_id: row.variantId,
      quantity: row.quantity,
      total_cost: row.unitCost * row.quantity,
      purchase_type: "inicial" as const,
      supplier: null,
      purchased_at: meta.purchasedAt,
      notes: "Ajuste manual de stock y costo",
    }));

  // Insertar primero y borrar después: si el insert falla, el dato viejo sigue
  // intacto. Al revés, un fallo a mitad de camino dejaría el insumo en cero.
  if (payload.length > 0) {
    const { error: insertError } = await db
      .from("inventory_purchases")
      .insert(payload);
    if (insertError) return { error: insertError.message };
  }

  if (previousIds.length > 0) {
    const { error: deleteError } = await db
      .from("inventory_purchases")
      .delete()
      .in("id", previousIds);

    // El dato nuevo ya entró; lo que falló fue limpiar lo viejo. Se avisa en
    // vez de callarlo, porque el insumo queda con el stock duplicado.
    if (deleteError) {
      return {
        error:
          "Se guardó el valor nuevo, pero no se pudo borrar el anterior: " +
          `${deleteError.message}. El insumo quedó con el stock duplicado.`,
      };
    }
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");

  return {
    ok: payload.length > 0 ? "Valores actualizados." : "Insumo dejado sin stock.",
    saved: payload.length,
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
