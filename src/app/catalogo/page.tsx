import type { Metadata } from "next";

import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora los regalos de Dulces Sivar por ocasión, tipo de caja y presupuesto.",
};

/**
 * Catálogo público. Los filtros viven en la URL (?ocasion=bodas&tipo-caja=...)
 * para que el link ya filtrado se pueda compartir tal cual por WhatsApp.
 *
 * Versión provisional: lista las categorías disponibles. La grilla de
 * productos con los filtros combinados es el siguiente paso.
 */
export default async function CatalogoPage({
  searchParams,
}: PageProps<"/catalogo">) {
  const params = await searchParams;

  const { data: groups } = await supabasePublic
    .from("attribute_groups")
    .select("*, attribute_values(*)")
    .eq("is_active", true)
    .eq("show_in_filters", true)
    .order("sort_order");

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-brand-green">Catálogo</h1>
      <p className="mt-2 text-ink-muted">
        Explora los regalos por ocasión, tipo de caja o para quién es.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {groups?.map((group) => {
          const active = params[group.slug];
          const values = [...group.attribute_values]
            .filter((v) => v.is_active)
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <section key={group.id}>
              <h2 className="text-sm font-semibold text-brand-green">
                {group.name}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {values.map((value) => {
                  const isActive = active === value.slug;
                  return (
                    <li key={value.id}>
                      <a
                        href={`/catalogo?${group.slug}=${value.slug}`}
                        className={`inline-block rounded-full border px-4 py-2 text-sm transition ${
                          isActive
                            ? "border-brand-green bg-brand-green font-medium text-white"
                            : "border-line bg-surface-raised text-ink hover:border-brand-teal"
                        }`}
                      >
                        {value.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
