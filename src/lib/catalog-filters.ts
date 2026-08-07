import type {
  AttributeGroupWithValues,
  Product,
  ProductContent,
  ProductImage,
} from "@/lib/supabase/types";

export type CatalogProduct = Product & {
  product_images: Pick<ProductImage, "storage_path" | "is_cover" | "sort_order">[];
  product_contents: Pick<ProductContent, "label" | "quantity" | "sort_order">[];
  product_attributes: { value_id: string }[];
};

export type Filters = {
  /** Slugs elegidos por eje. */
  byGroup: Record<string, string[]>;
  min: number | null;
  max: number | null;
  query: string;
  sort: SortKey;
};

export type SortKey = "relevancia" | "precio-asc" | "precio-desc" | "nuevos";

const SORTS: SortKey[] = ["relevancia", "precio-asc", "precio-desc", "nuevos"];

export const PRICE_MIN_PARAM = "precio_min";
export const PRICE_MAX_PARAM = "precio_max";
export const QUERY_PARAM = "q";
export const SORT_PARAM = "orden";

type RawParams = Record<string, string | string[] | undefined>;

/** Un parámetro puede venir repetido o separado por comas: se aceptan ambos. */
function readList(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts
    .flatMap((p) => p.split(","))
    .map((p) => p.trim())
    .filter(Boolean);
}

function readNumber(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseFilters(
  params: RawParams,
  groups: AttributeGroupWithValues[],
): Filters {
  const byGroup: Record<string, string[]> = {};

  for (const group of groups) {
    // Solo se aceptan slugs que existan en el eje: así una URL manipulada o un
    // enlace viejo con una opción ya borrada no rompe nada ni filtra a cero.
    const valid = new Set(
      group.attribute_values.filter((v) => v.is_active).map((v) => v.slug),
    );
    const chosen = readList(params[group.slug]).filter((s) => valid.has(s));
    if (chosen.length) byGroup[group.slug] = chosen;
  }

  const sortRaw = Array.isArray(params[SORT_PARAM])
    ? params[SORT_PARAM][0]
    : params[SORT_PARAM];

  return {
    byGroup,
    min: readNumber(params[PRICE_MIN_PARAM]),
    max: readNumber(params[PRICE_MAX_PARAM]),
    query: (Array.isArray(params[QUERY_PARAM])
      ? params[QUERY_PARAM][0]
      : params[QUERY_PARAM] ?? ""
    ).trim(),
    sort: SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "relevancia",
  };
}

export function activeFilterCount(filters: Filters): number {
  return (
    Object.values(filters.byGroup).reduce((n, list) => n + list.length, 0) +
    (filters.min != null ? 1 : 0) +
    (filters.max != null ? 1 : 0) +
    (filters.query ? 1 : 0)
  );
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Aplica los filtros.
 *
 * Dentro de un eje las opciones suman (bodas O aniversario); entre ejes se
 * exigen todas (bodas Y con flores). Es como se comporta cualquier tienda:
 * marcar dos ocasiones amplía la búsqueda, marcar una ocasión y un contenido
 * la restringe.
 */
export function applyFilters(
  products: CatalogProduct[],
  filters: Filters,
  slugToId: Map<string, string>,
): CatalogProduct[] {
  const needle = normalize(filters.query);

  const filtered = products.filter((product) => {
    const owned = new Set(product.product_attributes.map((a) => a.value_id));

    for (const [groupSlug, slugs] of Object.entries(filters.byGroup)) {
      const wanted = slugs
        .map((s) => slugToId.get(`${groupSlug}:${s}`))
        .filter((id): id is string => Boolean(id));
      if (wanted.length && !wanted.some((id) => owned.has(id))) return false;
    }

    const price = product.price_usd;
    if (filters.min != null && (price == null || price < filters.min)) return false;
    if (filters.max != null && (price == null || price > filters.max)) return false;

    if (needle) {
      // También busca dentro de lo que incluye: quien escribe "peluche" espera
      // encontrar las cajas que lo traen, no solo las que lo llevan en el nombre.
      const haystack = normalize(
        [
          product.name,
          product.description ?? "",
          ...product.product_contents.map((c) => c.label),
        ].join(" "),
      );
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  return sortProducts(filtered, filters.sort);
}

function sortProducts(
  products: CatalogProduct[],
  sort: SortKey,
): CatalogProduct[] {
  const copy = [...products];
  switch (sort) {
    case "precio-asc":
      return copy.sort(
        (a, b) => (a.price_usd ?? Infinity) - (b.price_usd ?? Infinity),
      );
    case "precio-desc":
      return copy.sort(
        (a, b) => (b.price_usd ?? -Infinity) - (a.price_usd ?? -Infinity),
      );
    case "nuevos":
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    default:
      // Los destacados primero; dentro de cada grupo, lo más nuevo arriba.
      return copy.sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          b.created_at.localeCompare(a.created_at),
      );
  }
}

/**
 * Cuenta cuántos productos quedarían al marcar cada opción, respetando los
 * demás filtros activos. Sin esto la clienta vería opciones que llevan a cero
 * resultados, que es el defecto clásico de los filtros sin conteo.
 */
export function facetCounts(
  products: CatalogProduct[],
  filters: Filters,
  groups: AttributeGroupWithValues[],
  slugToId: Map<string, string>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const group of groups) {
    const others: Filters = {
      ...filters,
      byGroup: Object.fromEntries(
        Object.entries(filters.byGroup).filter(([slug]) => slug !== group.slug),
      ),
      sort: "relevancia",
    };
    const base = applyFilters(products, others, slugToId);

    for (const value of group.attribute_values) {
      const id = slugToId.get(`${group.slug}:${value.slug}`);
      if (!id) continue;
      counts.set(
        `${group.slug}:${value.slug}`,
        base.filter((p) => p.product_attributes.some((a) => a.value_id === id))
          .length,
      );
    }
  }

  return counts;
}
