import Image from "next/image";
import Link from "next/link";

import type { CatalogProduct } from "@/lib/catalog-filters";

export function ProductCard({
  product,
  publicUrlBase,
}: {
  product: CatalogProduct;
  publicUrlBase: string;
}) {
  const cover =
    product.product_images.find((i) => i.is_cover) ?? product.product_images[0];
  const contents = [...product.product_contents]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3);
  const extra = product.product_contents.length - contents.length;

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition hover:border-brand-teal hover:shadow-lg">
      <Link href={`/catalogo/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square bg-brand-cream/40">
          {cover ? (
            <Image
              src={`${publicUrlBase}/${cover.storage_path}`}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className="object-cover transition group-hover:scale-[1.02]"
            />
          ) : null}
          {product.is_featured ? (
            <span className="absolute left-2 top-2 rounded bg-brand-orange px-2 py-0.5 text-xs font-semibold text-ink">
              Destacado
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-base font-semibold text-ink group-hover:text-brand-green">
            {product.name}
          </h3>

          {product.price_usd != null ? (
            <p className="text-xl font-bold text-brand-green">
              ${Number(product.price_usd).toFixed(2)}
            </p>
          ) : null}

          {contents.length ? (
            <ul className="flex flex-col gap-0.5 text-sm text-ink-muted">
              {contents.map((c, i) => (
                <li key={i} className="truncate">
                  · {c.quantity > 1 ? `${c.quantity} ` : ""}
                  {c.label}
                </li>
              ))}
              {extra > 0 ? (
                <li className="text-brand-green">y {extra} cosa{extra === 1 ? "" : "s"} más…</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
