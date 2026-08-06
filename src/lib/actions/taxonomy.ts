"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionState = { error?: string; ok?: boolean };

const nameSchema = z.string().trim().min(2, "El nombre es obligatorio").max(80);

function revalidateAll() {
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/catalogo");
  revalidatePath("/catalogo");
}

function duplicateMessage(error: { code?: string; message: string }, what: string) {
  return error.code === "23505" ? `Ya existe ${what} con ese nombre.` : error.message;
}

// ---------------------------------------------------------------------------
// Ejes (categorías grandes: "Ocasión", "Tipo de caja")
// ---------------------------------------------------------------------------

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = supabaseAdmin();
  // Se coloca al final: el orden lo reacomoda ella después si quiere.
  const { data: last } = await db
    .from("attribute_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("attribute_groups").insert({
    slug: slugify(parsed.data),
    name: parsed.data,
    description: null,
    sort_order: (last?.sort_order ?? 0) + 1,
    is_active: true,
    show_in_filters: true,
  });

  if (error) return { error: duplicateMessage(error, "una categoría") };

  revalidateAll();
  return { ok: true };
}

export async function renameGroup(groupId: string, name: string) {
  await requireAdmin();

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  // Solo cambia la etiqueta visible. El slug se queda fijo a propósito: es el
  // parámetro de la URL, y cambiarlo rompería los links ya compartidos.
  const { error } = await supabaseAdmin()
    .from("attribute_groups")
    .update({ name: parsed.data })
    .eq("id", groupId);

  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function toggleGroupFilter(groupId: string, show: boolean) {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("attribute_groups")
    .update({ show_in_filters: show })
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function deleteGroup(groupId: string) {
  await requireAdmin();
  // El cascade se lleva sus valores y las asignaciones a productos.
  const { error } = await supabaseAdmin()
    .from("attribute_groups")
    .delete()
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Valores dentro de un eje ("Bodas" dentro de "Ocasión")
// ---------------------------------------------------------------------------

export async function createValue(
  groupId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = supabaseAdmin();
  const { data: last } = await db
    .from("attribute_values")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("attribute_values").insert({
    group_id: groupId,
    slug: slugify(parsed.data),
    name: parsed.data,
    sort_order: (last?.sort_order ?? 0) + 1,
    is_active: true,
  });

  if (error) return { error: duplicateMessage(error, "una opción") };

  revalidateAll();
  return { ok: true };
}

export async function renameValue(valueId: string, name: string) {
  await requireAdmin();

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { error } = await supabaseAdmin()
    .from("attribute_values")
    .update({ name: parsed.data })
    .eq("id", valueId);

  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function toggleValueActive(valueId: string, isActive: boolean) {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("attribute_values")
    .update({ is_active: isActive })
    .eq("id", valueId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function deleteValue(valueId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("attribute_values")
    .delete()
    .eq("id", valueId);
  if (error) throw new Error(error.message);
  revalidateAll();
}
