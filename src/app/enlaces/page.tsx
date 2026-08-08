import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  Baby,
  Briefcase,
  Cake,
  CakeSlice,
  CalendarHeart,
  DoorOpen,
  Gem,
  Gift,
  GraduationCap,
  HandHeart,
  Heart,
  type LucideIcon,
  Sparkles,
} from "lucide-react";

import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social";
import { supabasePublic } from "@/lib/supabase/public";
import type { AttributeGroupWithValues } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Enlaces",
  description:
    "Elige la ocasión y te llevamos directo a esos regalos en el catálogo de DulceSivar.",
};

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP ?? "50376815829";
const INSTAGRAM_URL = "https://www.instagram.com/dulcesivar/";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hola, quiero más información sobre sus regalos.",
)}`;

/**
 * Un ícono por ocasión, a mano, porque la relación slug -> significado no se
 * puede inferir del texto (y "el/ella" en un nombre no debe tomarse como
 * pronombre de nadie: es apenas el rótulo comercial de la caja). Cualquier
 * ocasión nueva que se dé de alta en el panel y no esté aquí cae al ícono
 * genérico, así esta página nunca se rompe por datos que crecen solos.
 */
const OCCASION_ICONS: Record<string, LucideIcon> = {
  bodas: Gem,
  aniversario: CalendarHeart,
  "san-valentin": Heart,
  cumpleanos: Cake,
  "cumpleanos-el": CakeSlice,
  "cumpleanos-ella": Cake,
  graduacion: GraduationCap,
  "dia-madre": Sparkles,
  "dia-padre": Award,
  "bienvenida-baby": Baby,
  agradecimiento: HandHeart,
  bienvenida: DoorOpen,
  corporativo: Briefcase,
};

export default async function EnlacesPage() {
  const [groupResult, productsResult] = await Promise.all([
    supabasePublic
      .from("attribute_groups")
      .select("*, attribute_values(*)")
      .eq("slug", "ocasion")
      .maybeSingle(),
    supabasePublic
      .from("products")
      .select("id, product_attributes(value_id)")
      .eq("is_active", true),
  ]);

  const group = groupResult.data as AttributeGroupWithValues | null;
  const products =
    (productsResult.data as { product_attributes: { value_id: string }[] }[]) ??
    [];

  const counts = new Map<string, number>();
  for (const product of products) {
    for (const attr of product.product_attributes) {
      counts.set(attr.value_id, (counts.get(attr.value_id) ?? 0) + 1);
    }
  }

  const occasions = (group?.attribute_values ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      slug: v.slug,
      name: v.name,
      count: counts.get(v.id) ?? 0,
      Icon: OCCASION_ICONS[v.slug] ?? Gift,
    }));

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-brand-green via-brand-green to-[#013226] px-5 py-10 sm:py-14">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex size-24 items-center justify-center rounded-full bg-surface-raised p-3 shadow-lg ring-4 ring-white/15 sm:size-28">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local,
              no necesita el optimizador de next/image. */}
          <img
            src="/logo.svg"
            alt="DulceSivar"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            DulceSivar
          </h1>
          <p className="max-w-xs text-balance text-base text-brand-cream/90">
            ¿Qué estás celebrando? Elige la ocasión y te llevamos directo a
            esos regalos ✨
          </p>
        </div>

        <nav className="flex w-full flex-col gap-3" aria-label="Ocasiones">
          <Link
            href="/catalogo"
            className="flex items-center gap-3 rounded-2xl bg-brand-lime px-5 py-4 text-ink shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            <Sparkles className="size-5 shrink-0 text-brand-green" aria-hidden />
            <span className="flex-1 text-base font-semibold">
              Ver todo el catálogo
            </span>
          </Link>

          {occasions.map(({ slug, name, count, Icon }) => {
            const dead = count === 0;

            const inner = (
              <>
                <Icon
                  className={`size-5 shrink-0 ${dead ? "text-ink-muted" : "text-brand-green"}`}
                  aria-hidden
                />
                <span className="flex-1 text-base font-medium">{name}</span>
                <span className="text-sm text-ink-muted">{count}</span>
              </>
            );

            // Una ocasión sin regalos todavía se deja visible pero inerte, en
            // vez de mandar a un catálogo vacío: no es un Link porque un
            // Server Component no puede llevar onClick para bloquearlo.
            if (dead) {
              return (
                <div
                  key={slug}
                  aria-disabled
                  className="flex cursor-not-allowed items-center gap-3 rounded-2xl bg-white/40 px-5 py-4 text-ink-muted shadow-md"
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={slug}
                href={`/catalogo?ocasion=${slug}`}
                className="flex items-center gap-3 rounded-2xl bg-surface-raised px-5 py-4 text-ink shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              >
                {inner}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 flex items-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition hover:brightness-110 active:brightness-95"
          >
            <WhatsAppIcon className="size-5" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Síguenos en Instagram"
            className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-md transition hover:brightness-110 active:brightness-95"
          >
            <InstagramIcon className="size-5" />
          </a>
        </div>

        <p className="mt-1 text-sm text-brand-cream/70">@dulcesivar</p>
      </div>
    </main>
  );
}
