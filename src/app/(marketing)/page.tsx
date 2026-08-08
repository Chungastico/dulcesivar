import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CreditCard,
  Gift,
  Handshake,
  MessageCircle,
  Package,
  ScanLine,
  Sparkles,
  Truck,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/social";
import { CtaBand } from "@/components/site/cta-band";
import { Arc, Highlight, Scallop, Sparkle, Squiggle } from "@/components/site/decor";
import { Faq, faqJsonLd, type FaqItem } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { ProductStrip } from "@/components/site/product-strip";
import { BUDGET_TIERS } from "@/lib/catalog-filters";
import {
  getFeaturedProducts,
  getTaxonomy,
  publicImageBase,
} from "@/lib/marketing";
import { pageOpenGraph, site, whatsappTo } from "@/lib/site";

// Es una página de venta que casi nunca cambia y a la que se llega desde el
// buscador: se sirve prerenderizada y se refresca cada hora, en vez de pegarle
// a Supabase en cada visita.
export const revalidate = 3600;

const DESCRIPTION =
  "Cajas de regalo armadas a mano, detalles personalizados y grabado láser en El Salvador. Eliges la caja, cambias lo que lleva adentro y te la entregamos lista para dar.";

export const metadata: Metadata = {
  title: "Regalos personalizados y grabado láser en El Salvador",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: pageOpenGraph({
    title: `${site.name} — Regalos personalizados en El Salvador`,
    description: DESCRIPTION,
    path: "/",
  }),
};

const PROMISES = [
  {
    Icon: Boxes,
    title: "Se arma a tu medida",
    text: "Agregas y quitas productos de cualquier caja según lo que quieras dar y lo que tengas para gastar.",
  },
  {
    Icon: ScanLine,
    title: "Grabado láser propio",
    text: "El nombre, la fecha o la frase van grabados en el vaso, la madera o el acero. No es una calcomanía.",
  },
  {
    Icon: Truck,
    title: "Entrega coordinada",
    text: "Envío a domicilio con costo adicional. Al confirmar el pedido te pasamos los horarios disponibles.",
  },
  {
    Icon: CreditCard,
    title: "Precio claro",
    text: "Los precios del catálogo aplican para pago por transferencia bancaria y no incluyen IVA.",
  },
];

const STEPS = [
  {
    title: "Elige una caja",
    text: "Entra al catálogo y filtra por ocasión, contenido o presupuesto hasta dar con la que te gusta.",
  },
  {
    title: "Dinos qué cambiar",
    text: "Escríbenos por WhatsApp: quita lo que no va, suma lo que falta y dinos qué nombre o frase grabamos.",
  },
  {
    title: "La armamos",
    text: "Grabamos las piezas, armamos la caja, la envolvemos y te mandamos una foto antes de que salga.",
  },
  {
    title: "Se entrega",
    text: "La recoges o la llevamos a domicilio en el horario que hayas elegido, lista para dar.",
  },
];

const FAQS: FaqItem[] = [
  {
    question: "¿Puedo cambiar lo que trae la caja?",
    answer:
      "Sí. Todos los regalos del catálogo se pueden modificar: agregas y quitas productos según tus requerimientos y tu presupuesto. Escríbenos con la caja que te gustó y armamos tu versión.",
  },
  {
    question: "¿Qué se puede grabar a láser?",
    answer:
      "Nombres, fechas, iniciales, frases cortas y logos, sobre vasos de acero, vasos vineros y jarras de vidrio, tazas, llaveros, libretas, bolígrafos, cajas de madera, troncos, joyeros y placas.",
  },
  {
    question: "¿Cuánto cuestan los regalos?",
    answer:
      "El catálogo está ordenado por rangos de presupuesto: Sivar Esencial de $5 a $20, Sivar Especial de $21 a $35, Sivar Premium de $36 a $50 y Sivar Exclusivo de $51 a $85. Los precios aplican para pago por transferencia bancaria y no incluyen IVA.",
  },
  {
    question: "¿Hacen regalos para empresas?",
    answer:
      "Sí. Cajas de bienvenida para nuevos ingresos, reconocimientos y detalles de fin de año, con el logo de la empresa grabado a láser. Cuéntanos cuántas piezas necesitas y para cuándo las quieres recibir.",
  },
  {
    question: "¿Con cuánto tiempo hay que pedir?",
    answer:
      "Depende de lo que lleve el regalo. Lo que está en catálogo sale rápido; lo que se graba, se hornea o se personaliza necesita más tiempo (el pastel personalizado, por ejemplo, se pide con tres días de anticipación). Escríbenos con la fecha en que lo necesitas y te confirmamos si entra.",
  },
  {
    question: "¿Hacen entregas a domicilio?",
    answer:
      "Sí, por un costo adicional. Los envíos salen en horarios establecidos: al confirmar tu pedido te compartimos los horarios disponibles para que elijas el que mejor te convenga.",
  },
];

export default async function HomePage() {
  const [featured, occasions] = await Promise.all([
    getFeaturedProducts(8),
    getTaxonomy("ocasion"),
  ]);

  const heroImages = featured
    .map((p) => ({
      product: p,
      cover: p.product_images.find((i) => i.is_cover) ?? p.product_images[0],
    }))
    .filter((p) => p.cover)
    .slice(0, 3);

  return (
    <main className="flex flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${site.url}/#organizacion`,
              name: site.name,
              url: site.url,
              logo: `${site.url}/logo.svg`,
              description: DESCRIPTION,
              areaServed: { "@type": "Country", name: site.country },
              telephone: `+${site.phone}`,
              sameAs: [site.instagram],
            },
            {
              "@type": "WebSite",
              "@id": `${site.url}/#sitio`,
              url: site.url,
              name: site.name,
              inLanguage: "es-SV",
              publisher: { "@id": `${site.url}/#organizacion` },
            },
          ],
        }}
      />
      <JsonLd data={faqJsonLd(FAQS)} />

      {/* ---------------------------------------------------------------- */}
      {/* Portada                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="paper relative overflow-hidden">
        <Arc className="pointer-events-none absolute -left-10 top-24 hidden w-64 text-brand-teal/25 lg:block" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8 lg:pb-28 lg:pt-16">
          <div className="relative flex flex-col items-start gap-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-orange/40 bg-brand-orange/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-ink">
              <Sparkles className="size-4 shrink-0 text-brand-orange" aria-hidden />
              <span className="text-balance">Hecho a mano en El Salvador</span>
            </p>

            <h1 className="font-display text-4xl font-semibold leading-[1.08] text-balance text-brand-green sm:text-5xl lg:text-6xl">
              Regalos <Highlight>personalizados</Highlight> en El Salvador,
              armados caja por caja
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink sm:text-xl">
              Eliges la caja, cambias lo que lleva adentro y le ponemos el
              nombre grabado a láser. Nosotros la armamos, la envolvemos y te la
              entregamos lista para dar.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-4 text-lg font-semibold sm:px-7 text-white transition hover:opacity-90"
              >
                Ver el catálogo
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a
                href={whatsappTo(
                  "Hola, vengo del sitio web y quiero armar un regalo.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-green px-6 py-4 text-lg font-semibold sm:px-7 text-brand-green transition hover:bg-brand-green hover:text-white"
              >
                <WhatsAppIcon className="size-5" />
                Escribir por WhatsApp
              </a>
            </div>

            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-base text-ink-muted">
              <li className="flex items-center gap-2">
                <Sparkle className="size-3.5 text-brand-orange" />
                Se ajusta a tu presupuesto
              </li>
              <li className="flex items-center gap-2">
                <Sparkle className="size-3.5 text-brand-orange" />
                Grabado láser propio
              </li>
              <li className="flex items-center gap-2">
                <Sparkle className="size-3.5 text-brand-orange" />
                Entrega a domicilio
              </li>
            </ul>
          </div>

          {/* Collage de fotos reales del catálogo. Si todavía no hay regalos
              publicados, no se pinta un marco vacío: la portada funciona igual
              con la columna de texto sola. */}
          {heroImages.length > 0 ? (
            <div className="relative mx-auto w-full max-w-lg">
              <Sparkle className="absolute -left-2 -top-4 z-10 size-10 text-brand-orange" />
              <Squiggle className="absolute -bottom-6 left-1/4 h-6 w-28 text-brand-teal" />

              <div className="grid grid-cols-2 gap-4">
                <Link
                  href={`/catalogo/${heroImages[0].product.slug}`}
                  className="col-span-2 block -rotate-2 transition hover:rotate-0"
                >
                  <figure className="overflow-hidden rounded-3xl border-[6px] border-surface-raised bg-brand-cream shadow-xl">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={`${publicImageBase}/${heroImages[0].cover!.storage_path}`}
                        alt={heroImages[0].product.name}
                        fill
                        sizes="(max-width: 1024px) 90vw, 480px"
                        className="object-cover"
                        priority
                      />
                    </div>
                  </figure>
                </Link>

                {heroImages.slice(1).map(({ product, cover }, i) => (
                  <Link
                    key={product.id}
                    href={`/catalogo/${product.slug}`}
                    className={`block transition hover:rotate-0 ${
                      i === 0 ? "rotate-3" : "-rotate-3"
                    }`}
                  >
                    <figure className="overflow-hidden rounded-3xl border-[6px] border-surface-raised bg-brand-cream shadow-lg">
                      <div className="relative aspect-square">
                        <Image
                          src={`${publicImageBase}/${cover!.storage_path}`}
                          alt={product.name}
                          fill
                          sizes="(max-width: 1024px) 45vw, 240px"
                          className="object-cover"
                        />
                      </div>
                    </figure>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Scallop className="h-6 w-full text-brand-green" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Promesas                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-brand-green" aria-labelledby="promesas">
        <h2 id="promesas" className="sr-only">
          Por qué comprar con {site.name}
        </h2>
        <ul className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {PROMISES.map(({ Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-lime">
                <Icon className="size-5 text-brand-green" aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold text-white">
                {title}
              </h3>
              <p className="text-base leading-relaxed text-brand-cream/85">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Los dos servicios                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Dos maneras de regalar
          </h2>
          <p className="mt-3 text-lg text-ink-muted">
            Una caja completa lista para dar, o una pieza grabada que se queda
            para siempre. Casi siempre terminan siendo las dos.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Link
            href="/regalos-personalizados-el-salvador"
            className="group relative flex flex-col gap-4 overflow-hidden rounded-[2rem] border border-line-soft bg-brand-cream/60 p-8 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <Sparkle className="absolute -right-6 -top-6 size-28 text-brand-orange/20" />
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-green">
              <Gift className="size-6 text-white" aria-hidden />
            </span>
            <h3 className="font-display text-2xl font-semibold text-brand-green">
              Regalos personalizados
            </h3>
            <p className="text-base leading-relaxed text-ink">
              Cajas de madera, kraft o cilindro con lo que tú elijas adentro:
              flores, globos, chocolates, peluches, vino, café, un mini pastel.
              Con tarjeta y nombre grabado.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 font-semibold text-brand-green">
              Ver cómo se arma
              <ArrowRight
                className="size-4 transition group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </Link>

          <Link
            href="/grabado-laser-el-salvador"
            className="group relative flex flex-col gap-4 overflow-hidden rounded-[2rem] border border-line-soft bg-surface-raised p-8 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <Sparkle className="absolute -right-6 -top-6 size-28 text-brand-teal/20" />
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-lime">
              <ScanLine className="size-6 text-brand-green" aria-hidden />
            </span>
            <h3 className="font-display text-2xl font-semibold text-brand-green">
              Grabado láser
            </h3>
            <p className="text-base leading-relaxed text-ink">
              Nombres, fechas, frases y logos sobre acero, madera, vidrio,
              cerámica y cuerina. Para bodas, graduaciones y regalos de empresa
              en volumen.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 font-semibold text-brand-green">
              Ver qué grabamos
              <ArrowRight
                className="size-4 transition group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Ocasiones                                                         */}
      {/* ---------------------------------------------------------------- */}
      {occasions.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <div className="rounded-[2rem] bg-brand-cream/50 p-8 sm:p-10">
            <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
              ¿Qué estás celebrando?
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-muted">
              Elige la ocasión y te llevamos directo a los regalos que van con
              ella.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {occasions.map((occasion) => (
                <li key={occasion.slug}>
                  <Link
                    href={`/catalogo?ocasion=${occasion.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-2.5 text-base font-medium text-ink transition hover:border-brand-green hover:bg-brand-green hover:text-white"
                  >
                    {occasion.name}
                    <span className="text-sm opacity-60">{occasion.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Regalos destacados                                                */}
      {/* ---------------------------------------------------------------- */}
      <ProductStrip
        title="Lo que más nos piden"
        intro="Cajas que ya están armadas y se pueden cambiar. Toca la que te guste para ver todo lo que trae."
        products={featured}
        href="/catalogo"
      />

      {/* ---------------------------------------------------------------- */}
      {/* Presupuesto                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Empieza por el presupuesto
          </h2>
          <p className="text-base text-ink-muted">
            Precios por transferencia bancaria, sin IVA.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BUDGET_TIERS.map((tier) => (
            <li key={tier.id}>
              <Link
                href={`/catalogo?presupuesto=${tier.id}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface-raised p-6 transition hover:border-brand-teal hover:shadow-lg"
              >
                <span className="font-display text-xl font-semibold text-brand-green">
                  {tier.name}
                </span>
                <span className="text-2xl font-bold text-ink">
                  {tier.priceLabel}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-ink-muted transition group-hover:text-brand-green">
                  Ver estos regalos
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Cómo funciona                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Cómo lo armamos
          </h2>
          <Squiggle className="hidden h-5 w-24 text-brand-orange sm:block" />
        </div>

        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-3xl bg-brand-cream/60 p-7 pt-9"
            >
              {/* La numeración es un adorno: el orden ya lo dice la lista. */}
              <span
                aria-hidden
                className="absolute right-5 top-4 font-display text-5xl font-semibold text-brand-green/15"
              >
                {i + 1}
              </span>
              {/* El pr- deja libre la esquina donde vive el número: sin él, un
                  título de dos líneas se le monta encima. */}
              <h3 className="pr-12 font-display text-xl font-semibold text-brand-green">
                {step.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-ink">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Corporativo                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <div className="grid items-center gap-8 rounded-[2rem] border border-line-soft bg-surface-raised p-8 sm:p-10 lg:grid-cols-[auto_1fr_auto]">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-orange">
            <Handshake className="size-7 text-ink" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold text-brand-green sm:text-3xl">
              Regalos corporativos
            </h2>
            <p className="mt-2 max-w-2xl text-lg text-ink-muted">
              Cajas de bienvenida para nuevos ingresos, reconocimientos y
              detalles de fin de año, con el logo de tu empresa grabado a láser.
              Escríbenos con la cantidad y la fecha y te cotizamos.
            </p>
          </div>
          <a
            href={whatsappTo(
              "Hola, quiero cotizar regalos corporativos para mi empresa.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
          >
            <MessageCircle className="size-5" aria-hidden />
            Cotizar
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Preguntas                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-3xl px-5 py-16 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <p className="mt-3 text-lg text-ink-muted">
          Y si falta alguna, se pregunta por WhatsApp: contestamos ahí mismo.
        </p>
        <div className="mt-8">
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand
        title="¿Ya sabes a quién se lo vas a dar?"
        text="Mándanos la ocasión, la fecha y más o menos cuánto quieres gastar. Con eso te proponemos dos o tres opciones."
        message="Hola, quiero armar un regalo. Es para:"
      />

      {/* Enlace de apoyo al catálogo por si alguien llegó hasta el final. */}
      <p className="mx-auto -mt-8 mb-12 flex items-center justify-center gap-2 px-5 text-base text-ink-muted">
        <Package className="size-4" aria-hidden />
        También puedes
        <Link
          href="/catalogo"
          className="font-semibold text-brand-green underline underline-offset-4"
        >
          ver todos los regalos
        </Link>
      </p>
    </main>
  );
}
