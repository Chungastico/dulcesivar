"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** Resultado uniforme para useActionState en los formularios. */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const contentItemSchema = z.object({
  label: z.string().trim().min(1, "El ítem no puede ir vacío").max(200),
  quantity: z.coerce.number().int().min(1).max(999),
  // Enlace al insumo de la biblioteca. Sin él, el ítem no suma al costo del
  // regalo en Inventario; se admite null porque no todo se escribe desde ahí.
  presetId: z.string().uuid().nullish(),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "El slug solo admite minúsculas, números y guiones",
    ),
  description: z
    .string()
    .trim()
    .min(10, "Escribe una descripción de al menos 10 caracteres")
    .max(5000),
  // Obligatorio: el precio es uno de los filtros del catálogo, y un producto
  // sin precio quedaría invisible en cualquier búsqueda por presupuesto.
  // La columna sigue aceptando NULL en la base a propósito, para poder añadir
  // un "a cotizar" más adelante sin migrar.
  price_usd: z.coerce
    .number({ message: "El precio es obligatorio" })
    .min(0, "El precio no puede ser negativo")
    .max(99999),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  valueIds: z.array(z.string().uuid()),
  // Al menos un ítem: un regalo sin "qué incluye" no le sirve a nadie que lo
  // esté comparando en el catálogo.
  contents: z
    .array(contentItemSchema)
    .min(1, "Agrega al menos un ítem de lo que incluye")
    .max(50),
});

/** Traduce el FormData crudo a algo que zod pueda validar. */
function parseProductForm(formData: FormData) {
  const rawName = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const rawDescription = String(formData.get("description") ?? "").trim();
  const rawContents = String(formData.get("contents") ?? "[]");

  let contents: unknown = [];
  try {
    contents = JSON.parse(rawContents);
  } catch {
    contents = [];
  }

  return productSchema.safeParse({
    name: rawName,
    // Si el usuario deja el slug vacío, se deriva del nombre.
    slug: rawSlug ? slugify(rawSlug) : slugify(rawName),
    description: rawDescription,
    price_usd: String(formData.get("price_usd") ?? "").trim(),
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    valueIds: formData.getAll("valueIds").map(String),
    contents,
  });
}

function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Sube los archivos al bucket y devuelve las rutas guardadas. */
async function uploadImages(
  db: ReturnType<typeof supabaseAdmin>,
  productId: string,
  files: File[],
): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { paths, error: `"${file.name}" no es una imagen válida (JPG, PNG, WebP o AVIF).` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { paths, error: `"${file.name}" pesa más de 8 MB.` };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return { paths, error: `No se pudo subir "${file.name}": ${error.message}` };
    paths.push(path);
  }

  return { paths };
}

/** Reemplaza contenidos, líneas e imágenes nuevas de un producto. */
async function saveRelations(
  db: ReturnType<typeof supabaseAdmin>,
  productId: string,
  data: z.infer<typeof productSchema>,
  files: File[],
): Promise<string | undefined> {
  // Contenidos: se reescriben enteros, es más simple que hacer diff.
  await db.from("product_contents").delete().eq("product_id", productId);
  if (data.contents.length) {
    const { error } = await db.from("product_contents").insert(
      data.contents.map((c, i) => ({
        product_id: productId,
        label: c.label,
        quantity: c.quantity,
        sort_order: i,
        preset_id: c.presetId ?? null,
      })),
    );
    if (error) return `No se pudo guardar el contenido: ${error.message}`;
  }

  // Clasificación: igual, se reescribe entera.
  await db.from("product_attributes").delete().eq("product_id", productId);
  if (data.valueIds.length) {
    const { error } = await db
      .from("product_attributes")
      .insert(data.valueIds.map((value_id) => ({ product_id: productId, value_id })));
    if (error) return `No se pudo guardar la clasificación: ${error.message}`;
  }

  if (files.length) {
    const { paths, error } = await uploadImages(db, productId, files);
    if (error) return error;

    // Si el producto aún no tiene portada, la primera imagen nueva lo será.
    const { count } = await db
      .from("product_images")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);
    const existing = count ?? 0;

    if (paths.length) {
      const { error: insertError } = await db.from("product_images").insert(
        paths.map((storage_path, i) => ({
          product_id: productId,
          storage_path,
          alt_text: null,
          sort_order: existing + i,
          is_cover: existing === 0 && i === 0,
        })),
      );
      if (insertError) return `No se pudieron registrar las imágenes: ${insertError.message}`;
    }
  }

  return undefined;
}

function duplicateSlugMessage(error: { code?: string; message: string }) {
  return error.code === "23505"
    ? "Ya existe un producto con ese slug. Cambia el nombre o edita el slug."
    : error.message;
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos marcados.", fieldErrors: flattenErrors(parsed.error) };
  }

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return {
      error: "Falta la foto del producto.",
      fieldErrors: { images: "Sube al menos una imagen." },
    };
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("products")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price_usd: parsed.data.price_usd,
      is_active: parsed.data.is_active,
      is_featured: parsed.data.is_featured,
    })
    .select("id")
    .single();

  if (error) return { error: duplicateSlugMessage(error) };

  const relationError = await saveRelations(db, data.id, parsed.data, files);

  if (relationError) {
    // Sin transacciones multi-sentencia en supabase-js: si las relaciones
    // fallan, se borra el producto para no dejar un registro a medias.
    await db.from("products").delete().eq("id", data.id);
    return { error: relationError };
  }

  revalidatePath("/admin/catalogo");
  revalidatePath("/catalogo");
  redirect("/admin/catalogo");
}

export async function updateProduct(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos marcados.", fieldErrors: flattenErrors(parsed.error) };
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("products")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price_usd: parsed.data.price_usd,
      is_active: parsed.data.is_active,
      is_featured: parsed.data.is_featured,
    })
    .eq("id", productId);

  if (error) return { error: duplicateSlugMessage(error) };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const relationError = await saveRelations(db, productId, parsed.data, files);
  if (relationError) return { error: relationError };

  revalidatePath("/admin/catalogo");
  revalidatePath(`/admin/catalogo/${productId}`);
  revalidatePath("/catalogo");
  redirect("/admin/catalogo");
}

export async function deleteProduct(productId: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  // Las filas hijas caen por ON DELETE CASCADE, pero los archivos del bucket
  // no: hay que borrarlos a mano o quedan huérfanos ocupando espacio.
  const { data: images } = await db
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (images?.length) {
    await db.storage.from(BUCKET).remove(images.map((i) => i.storage_path));
  }

  const { error } = await db.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/catalogo");
  revalidatePath("/catalogo");
  redirect("/admin/catalogo");
}

export async function deleteProductImage(imageId: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: image } = await db
    .from("product_images")
    .select("storage_path, product_id, is_cover")
    .eq("id", imageId)
    .single();

  if (!image) return;

  await db.storage.from(BUCKET).remove([image.storage_path]);
  await db.from("product_images").delete().eq("id", imageId);

  // Si se borró la portada, ascender la siguiente para no dejar al producto
  // sin imagen destacada en el catálogo.
  if (image.is_cover) {
    const { data: next } = await db
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (next) {
      await db.from("product_images").update({ is_cover: true }).eq("id", next.id);
    }
  }

  revalidatePath(`/admin/catalogo/${image.product_id}`);
  revalidatePath("/catalogo");
}

export async function setCoverImage(imageId: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: image } = await db
    .from("product_images")
    .select("product_id")
    .eq("id", imageId)
    .single();

  if (!image) return;

  // Un índice único parcial impide dos portadas por producto, así que primero
  // hay que quitar la actual y solo después marcar la nueva.
  await db
    .from("product_images")
    .update({ is_cover: false })
    .eq("product_id", image.product_id);

  await db.from("product_images").update({ is_cover: true }).eq("id", imageId);

  revalidatePath(`/admin/catalogo/${image.product_id}`);
  revalidatePath("/catalogo");
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { error } = await db
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/catalogo");
  revalidatePath("/catalogo");
}
