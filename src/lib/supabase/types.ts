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

type Table<Row, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Omit<Row, Generated & keyof Row> &
    Partial<Pick<Row, Generated & keyof Row>>;
  Update: Partial<Row>;
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
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Un eje con sus valores, como lo consumen el panel y los filtros. */
export type AttributeGroupWithValues = AttributeGroup & {
  attribute_values: AttributeValue[];
};
