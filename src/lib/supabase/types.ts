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

/** Línea de regalo: bodas, aniversario, San Valentín, etc. */
export type ProductLine = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
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

export type ProductLineMap = {
  product_id: string;
  line_id: string;
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
      product_lines: Table<ProductLine>;
      products: Table<Product>;
      product_contents: Table<
        ProductContent,
        [ProductFk<"product_contents">]
      >;
      product_images: Table<ProductImage, [ProductFk<"product_images">]>;
      product_line_map: Table<
        ProductLineMap,
        [
          ProductFk<"product_line_map">,
          {
            foreignKeyName: "product_line_map_line_id_fkey";
            columns: ["line_id"];
            isOneToOne: false;
            referencedRelation: "product_lines";
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

/** Producto con sus relaciones, tal como lo consume el catálogo. */
export type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_contents: ProductContent[];
  product_lines: ProductLine[];
};
