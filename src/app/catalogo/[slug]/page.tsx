import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { publicEnv } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/public";
import { whatsappLink } from "@/lib/whatsapp";

async function getProduct(slug: string) {
  const { data } = await supabasePublic
    .from("products")
    .select(
      "*, product_images(storage_path, is_cover, sort_order), product_contents(label, quantity, sort_order), product_attributes(value_id)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
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

  const groupIds = product.product_attributes.map((a) => a.value_id);
  const { data: tags } = groupIds.length
    ? await supabasePublic
        .from("attribute_values")
        .select("id, name, slug, is_active, attribute_groups(slug, show_in_filters)")
        .in("id", groupIds)
        .eq("is_active", true)
    : { data: [] };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <Link
        href="/catalogo"
        className="text-base text-ink-muted transition hover:text-brand-green"
      >
        ← Volver al catálogo
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
            href={whatsappLink(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90"
          >
            Consultar por WhatsApp
          </a>

          {tags && tags.length ? (
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
    </main>
  );
}
