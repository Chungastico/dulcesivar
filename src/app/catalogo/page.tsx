import type { Metadata } from "next";

import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora los regalos de Dulces Sivar por ocasión: bodas, aniversarios, San Valentín y más.",
};

/**
 * Catálogo público. El filtro vive en la URL (?linea=bodas) para que el link
 * ya filtrado se pueda compartir tal cual por WhatsApp.
 *
 * Versión inicial: lista las líneas disponibles. La grilla de productos y las
 * fichas llegan en el siguiente paso.
 */
export default async function CatalogoPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const { linea } = await searchParams;
  const activeLine = typeof linea === "string" ? linea : null;

  const { data: lines } = await supabasePublic
    .from("product_lines")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-neutral-900">Catálogo</h1>
      <p className="mt-2 text-neutral-600">
        {activeLine
          ? `Mostrando la línea: ${activeLine}`
          : "Elige una ocasión para ver los regalos."}
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lines?.map((line) => (
          <li key={line.id}>
            <a
              href={`/catalogo?linea=${line.slug}`}
              className="block rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400"
            >
              <h2 className="font-medium text-neutral-900">{line.name}</h2>
              {line.description ? (
                <p className="mt-1 text-sm text-neutral-500">
                  {line.description}
                </p>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
