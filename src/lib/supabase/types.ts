/**
 * Tipos de la base de datos.
 *
 * Escritos a mano para reflejar supabase/schema.sql. Cuando el esquema cambie,
 * se pueden regenerar con:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 *
 * Nota: `Relationships` no es decorativo. supabase-js lo exige para que un
 * esquema sea válido; si falta, el tipo entero degrada a `never` y cada
 * consulta pierde el tipado sin dar un error claro.
 */

/**
 * Un eje de clasificación: "Ocasión", "Tipo de caja", "Destinatario"...
 * El slug es el nombre del parámetro en la URL del catálogo.
 */
export type AttributeGroup = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_filters: boolean;
  created_at: string;
  updated_at: string;
};

/** Un valor dentro de un eje: "Bodas" dentro de "Ocasión". */
export type AttributeValue = {
  id: string;
  group_id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_usd: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

/** Un ítem de "qué incluye" el regalo. En fase 2 se enlazará a inventario. */
export type ProductContent = {
  id: string;
  product_id: string;
  label: string;
  quantity: number;
  sort_order: number;
  preset_id: string | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};

/** Insumo reutilizable de la biblioteca ("Chocolates Ferrero Rocher"). */
export type ContentPreset = {
  id: string;
  label: string;
  category: string;
  unit: string;
  sort_order: number;
  /** Ella lo marca a mano: dice si este insumo viene en colores/variantes.
   *  Sin esto, la única forma de saberlo era mirar si ya existían filas en
   *  content_preset_variants, y el "+ agregar color" terminaba ofreciéndose
   *  en insumos que nunca lo van a necesitar. */
  has_variants: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Variante de un insumo: el color de una taza, por ejemplo. Cuelga del
 * insumo, no lo reemplaza — la mayoría de insumos no tiene ninguna.
 */
export type ContentPresetVariant = {
  id: string;
  preset_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Una compra de insumo. El unitario lo calcula la base. */
export type InventoryPurchase = {
  id: string;
  item_id: string;
  /** Color/variante comprado, si el insumo los tiene. Null si no aplica. */
  variant_id: string | null;
  quantity: number;
  total_cost: number;
  unit_cost: number | null;
  purchase_type: "mayoreo" | "individual" | "inicial";
  supplier: string | null;
  purchased_at: string;
  notes: string | null;
  created_at: string;
};

/** Vista: costo promedio ponderado por insumo (combina todos sus colores). */
export type InventoryStatus = {
  id: string;
  label: string;
  category: string;
  unit: string;
  has_variants: boolean;
  is_active: boolean;
  total_quantity: number;
  total_invested: number;
  avg_unit_cost: number | null;
  purchase_count: number;
  last_purchase_at: string | null;
};

/** Vista: costo y stock de un color específico de un insumo. */
export type InventoryVariantStatus = {
  id: string;
  preset_id: string;
  item_label: string;
  unit: string;
  variant_name: string;
  sort_order: number;
  is_active: boolean;
  total_quantity: number;
  total_invested: number;
  avg_unit_cost: number | null;
  purchase_count: number;
  last_purchase_at: string | null;
};

/** Vista: costo estimado y margen por producto. */
export type ProductCost = {
  product_id: string;
  name: string;
  price_usd: number | null;
  total_items: number;
  costed_items: number;
  estimated_cost: number;
  estimated_margin: number | null;
};

export type ProductAttribute = {
  product_id: string;
  value_id: string;
};

/** Columnas con default en SQL: opcionales al insertar. */
type Generated = "id" | "created_at" | "updated_at";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/**
 * `Computed` son columnas que Postgres calcula solas (GENERATED ALWAYS): no
 * solo son opcionales al insertar, es que mandarlas hace fallar la escritura.
 * Por eso se excluyen de Insert y de Update en vez de volverse opcionales.
 */
type Table<
  Row,
  Rels extends Relationship[] = [],
  Computed extends keyof Row = never,
> = {
  Row: Row;
  Insert: Omit<Row, (Generated & keyof Row) | Computed> &
    Partial<Pick<Row, Generated & keyof Row>>;
  Update: Partial<Omit<Row, Computed>>;
  Relationships: Rels;
};

/** FK product_id -> products.id, común a las tres tablas hijas. */
type ProductFk<Table extends string> = {
  foreignKeyName: `${Table}_product_id_fkey`;
  columns: ["product_id"];
  isOneToOne: false;
  referencedRelation: "products";
  referencedColumns: ["id"];
};

export type Database = {
  public: {
    Tables: {
      attribute_groups: Table<AttributeGroup>;
      content_presets: Table<ContentPreset>;
      content_preset_variants: Table<
        ContentPresetVariant,
        [
          {
            foreignKeyName: "content_preset_variants_preset_id_fkey";
            columns: ["preset_id"];
            isOneToOne: false;
            referencedRelation: "content_presets";
            referencedColumns: ["id"];
          },
        ]
      >;
      inventory_purchases: Table<
        InventoryPurchase,
        [
          {
            foreignKeyName: "inventory_purchases_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "content_presets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_purchases_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "content_preset_variants";
            referencedColumns: ["id"];
          },
        ],
        // La calcula Postgres a partir de total_cost / quantity.
        "unit_cost"
      >;
      attribute_values: Table<
        AttributeValue,
        [
          {
            foreignKeyName: "attribute_values_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "attribute_groups";
            referencedColumns: ["id"];
          },
        ]
      >;
      products: Table<Product>;
      product_contents: Table<
        ProductContent,
        [ProductFk<"product_contents">]
      >;
      product_images: Table<ProductImage, [ProductFk<"product_images">]>;
      product_attributes: Table<
        ProductAttribute,
        [
          ProductFk<"product_attributes">,
          {
            foreignKeyName: "product_attributes_value_id_fkey";
            columns: ["value_id"];
            isOneToOne: false;
            referencedRelation: "attribute_values";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: {
      inventory_status: { Row: InventoryStatus; Relationships: [] };
      inventory_variant_status: {
        Row: InventoryVariantStatus;
        Relationships: [];
      };
      product_costs: { Row: ProductCost; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Un eje con sus valores, como lo consumen el panel y los filtros. */
export type AttributeGroupWithValues = AttributeGroup & {
  attribute_values: AttributeValue[];
};
