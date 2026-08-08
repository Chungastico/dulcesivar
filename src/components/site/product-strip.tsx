import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogProduct } from "@/lib/catalog-filters";
import { publicImageBase } from "@/lib/marketing";

/**
 * Una tira de regalos reales dentro de una página de venta.
 *
 * Reusa la ProductCard del catálogo a propósito: si mañana cambia cómo se ve
 * un regalo, cambia en los dos lugares. Si no hay nada que mostrar —catálogo
 * recién estrenado, o un filtro sin productos— no se pinta un hueco vacío:
 * se devuelve null y la página sigue teniendo sentido sin la sección.
 */
export function ProductStrip({
  title,
  intro,
  products,
  href,
  linkLabel = "Ver todo el catálogo",
}: {
  title: string;
  intro?: string;
  products: CatalogProduct[];
  href: string;
  linkLabel?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            {title}
          </h2>
          {intro ? (
            <p className="mt-3 text-lg text-ink-muted">{intro}</p>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-full border-2 border-brand-green px-5 py-2.5 text-base font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
        >
          {linkLabel}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            publicUrlBase={publicImageBase}
          />
        ))}
      </ul>
    </section>
  );
}
