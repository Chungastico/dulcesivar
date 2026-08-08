import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogProduct } from "@/lib/catalog-filters";
import { publicEnv } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/public";
import { whatsappLink } from "@/lib/whatsapp";

const SELECT =
  "*, product_images(storage_path, is_cover, sort_order), product_contents(label, quantity, sort_order), product_attributes(value_id)";

async function getProduct(slug: string) {
  const { data } = await supabasePublic
    .from("products")
    .select(SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

/**
 * Otros regalos que comparten al menos una etiqueta con este, ordenados por
 * cuántas comparten. Sin eso, "recomendados" sería solo lo más reciente y no
 * tendría nada que ver con lo que se está viendo.
 */
async function getRelated(product: NonNullable<Awaited<ReturnType<typeof getProduct>>>) {
  const valueIds = product.product_attributes.map((a) => a.value_id);
  if (valueIds.length === 0) return [];

  const { data: sharing } = await supabasePublic
    .from("product_attributes")
    .select("product_id")
    .in("value_id", valueIds)
    .neq("product_id", product.id);

  const scores = new Map<string, number>();
  for (const row of sharing ?? []) {
    scores.set(row.product_id, (scores.get(row.product_id) ?? 0) + 1);
  }
  if (scores.size === 0) return [];

  const topIds = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const { data: related } = await supabasePublic
    .from("products")
    .select(SELECT)
    .in("id", topIds)
    .eq("is_active", true);

  // Supabase no promete el orden de un IN(); se reordena según el puntaje ya
  // calculado para que lo más parecido salga primero.
  return (related ?? []).sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
  ) as CatalogProduct[];
}

export async function generateMetadata({
  params,
}: PageProps<"/catalogo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Regalo no encontrado" };

  return {
    title: product.name,
    description: product.description ?? undefined,
    // Para que al compartir por WhatsApp se vea la foto y no un enlace pelado.
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.product_images.length
        ? [
            `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images/${
              (
                product.product_images.find((i) => i.is_cover) ??
                product.product_images[0]
              ).storage_path
            }`,
          ]
        : undefined,
    },
  };
}

export default async function ProductoPage({
  params,
}: PageProps<"/catalogo/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const base = `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images`;
  const images = [...product.product_images].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
  );
  const contents = [...product.product_contents].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const [tagsResult, related] = await Promise.all([
    product.product_attributes.length
      ? supabasePublic
          .from("attribute_values")
          .select("id, name, slug, is_active, attribute_groups(slug, show_in_filters)")
          .in(
            "id",
            product.product_attributes.map((a) => a.value_id),
          )
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    getRelated(product),
  ]);
  const tags = tagsResult.data ?? [];

  const productUrl = `${publicEnv.siteUrl}/catalogo/${product.slug}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* Migas de pan estilo tienda: vuelve al listado sin perder el lugar,
          más reconocible que una flechita suelta. */}
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted transition hover:text-brand-green"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Volver al catálogo
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {images[0] ? (
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-brand-cream/40">
              <Image
                src={`${base}/${images[0].storage_path}`}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
                priority
              />
            </div>
          ) : null}

          {images.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2">
              {images.slice(1).map((img) => (
                <li
                  key={img.storage_path}
                  className="relative aspect-square overflow-hidden rounded-lg border border-line bg-brand-cream/40"
                >
                  <Image
                    src={`${base}/${img.storage_path}`}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-3xl font-semibold text-ink">{product.name}</h1>
            {product.price_usd != null ? (
              <p className="mt-2 text-3xl font-bold text-brand-green">
                ${Number(product.price_usd).toFixed(2)}
              </p>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-lg text-ink">{product.description}</p>
          ) : null}

          {contents.length ? (
            <section className="rounded-2xl border border-line bg-surface-raised p-5">
              <h2 className="text-base font-semibold text-brand-green">
                Incluye
              </h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {contents.map((c, i) => (
                  <li key={i} className="flex gap-2 text-base text-ink">
                    <span className="font-semibold text-brand-green">
                      {c.quantity}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <a
            href={whatsappLink(product.name, productUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.26-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.15-.24-.02-.37.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42-.14-.01-.31-.01-.47-.01-.16 0-.43.06-.66.31-.22.24-.86.85-.86 2.06s.89 2.39 1.01 2.55c.12.17 1.75 2.67 4.23 3.75.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
            </svg>
            Consultar por WhatsApp
          </a>

          {tags.length ? (
            <ul className="flex flex-wrap gap-2">
              {tags
                .filter((t) => t.attribute_groups?.show_in_filters)
                .map((tag) => (
                  <li key={tag.id}>
                    <Link
                      href={`/catalogo?${tag.attribute_groups!.slug}=${tag.slug}`}
                      className="inline-block rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink-muted transition hover:border-brand-teal hover:text-brand-green"
                    >
                      {tag.name}
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      </div>

      {related.length ? (
        <section className="mt-14 border-t border-line-soft pt-8">
          <h2 className="text-xl font-semibold text-brand-green">
            También te puede interesar
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} publicUrlBase={base} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 flex justify-center">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-green px-6 py-3 text-base font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
        >
          Ver todo el catálogo
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
    </main>
  );
}
