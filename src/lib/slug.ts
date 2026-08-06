/**
 * Convierte un nombre en slug para URL.
 *
 * Normaliza acentos y la ñ, que aparecen constantemente en los nombres de
 * productos en español: "Regalo de San Valentín" -> "regalo-de-san-valentin".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Quita los diacríticos que NFD acaba de separar de su letra base.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
