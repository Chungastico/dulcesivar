import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Coffee,
  GraduationCap,
  Heart,
  Layers,
  ScanLine,
  Sparkles,
  Trees,
  Wine,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/social";
import { CtaBand } from "@/components/site/cta-band";
import { Arc, Scallop, Sparkle, Squiggle } from "@/components/site/decor";
import { Faq, faqJsonLd, type FaqItem } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { ProductStrip } from "@/components/site/product-strip";
import {
  getFeaturedProducts,
  getProductsByAttribute,
  getTaxonomy,
} from "@/lib/marketing";
import { pageOpenGraph, site, whatsappTo } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/grabado-laser-el-salvador";

const DESCRIPTION =
  "Grabado láser en El Salvador sobre acero, madera, vidrio, cerámica y cuerina. Nombres, fechas, frases y logos en vasos, termos, llaveros, cajas de madera y libretas. Piezas sueltas y pedidos corporativos.";

export const metadata: Metadata = {
  title: "Grabado láser en El Salvador",
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({
    title: `Grabado láser en El Salvador | ${site.name}`,
    description: DESCRIPTION,
    path: PATH,
  }),
};

/**
 * Los artículos salen de la biblioteca real de insumos (migración 003), no de
 * un catálogo inventado: si aquí dice "vaso vinero 12 onz" es porque existe.
 */
const MATERIALS = [
  {
    Icon: Layers,
    name: "Acero inoxidable",
    result: "El grabado queda plateado sobre el color del vaso.",
    items: [
      "Vaso tipo Yeti 20 onz",
      "Vaso acero doble capa 350 ml",
      "Termo Stanley style 40 onz",
      "Botella matte 500 ml",
      "Llavero de acero",
      "Placa estilo militar",
      "Placa para mascota",
    ],
  },
  {
    Icon: Trees,
    name: "Madera",
    result: "El grabado queda tostado, con relieve al tacto.",
    items: [
      "Caja de madera personalizada",
      "Tronco de madera grabado",
      "Corazón de madera con base",
      "Joyero personalizado",
      "Bolígrafo y portaminas de madera",
      "Destapador de madera",
      "Caballete de marco",
    ],
  },
  {
    Icon: Wine,
    name: "Vidrio",
    result: "El grabado queda esmerilado, blanco mate.",
    items: [
      "Vaso vinero 12 onz",
      "Jarra transparente 16 onz",
      "Vaso transparente con tapadera de madera",
      "Taza transparente",
    ],
  },
  {
    Icon: Coffee,
    name: "Cerámica y vasos",
    result: "Nombre, fecha o frase corta, para uso diario.",
    items: [
      "Taza cerámica blanca",
      "Taza con agarradero de corazón",
      "Vaso 30 onz",
      "Vaso skinny 600 ml",
      "Vaso doble pared 30 onz",
    ],
  },
  {
    Icon: ScanLine,
    name: "Cuerina y libretas",
    result: "Ideal para el logo de una empresa.",
    items: [
      "Libreta de cuerina con base para bolígrafo",
      "Libreta ecológica con lapicero",
      "Estuche metálico con bolígrafo",
    ],
  },
];

const USES = [
  {
    Icon: Heart,
    title: "Bodas y aniversarios",
    text: "Recuerdos para los invitados, vasos vineros con los nombres y la fecha, cajas de madera para los papás y los padrinos.",
    href: "/catalogo?ocasion=bodas",
    cta: "Ver regalos de bodas",
  },
  {
    Icon: Building2,
    title: "Empresas",
    text: "Cajas de bienvenida para nuevos ingresos, reconocimientos y detalles de fin de año con el logo grabado en termos, libretas o cajas.",
    href: "/catalogo?ocasion=corporativo",
    cta: "Ver regalos corporativos",
  },
  {
    Icon: GraduationCap,
    title: "Graduaciones",
    text: "El nombre, la carrera y el año en un termo, un llavero o un tronco de madera que se queda de recuerdo.",
    href: "/catalogo?ocasion=graduacion",
    cta: "Ver regalos de graduación",
  },
];

const STEPS = [
  {
    title: "Mándanos el texto o el logo",
    text: "El nombre, la fecha o la frase tal cual quieres que se lea. Si es un logo, en la mejor calidad que tengas.",
  },
  {
    title: "Te confirmamos si se puede",
    text: "Revisamos el material, el tamaño de la pieza y el nivel de detalle del diseño, y te decimos cómo va a quedar.",
  },
  {
    title: "Grabamos",
    text: "El láser marca el material. No es vinil ni impresión: no se despinta, no se despega y no se lava.",
  },
  {
    title: "Se entrega o se arma en una caja",
    text: "La pieza sola, o dentro de un regalo armado con flores, chocolates y tarjeta.",
  },
];

const FAQS: FaqItem[] = [
  {
    question: "¿Qué materiales pueden grabarse a láser?",
    answer:
      "Trabajamos acero inoxidable, madera, vidrio, cerámica y cuerina. En acero el grabado queda plateado, en madera queda tostado y en vidrio queda esmerilado, blanco mate.",
  },
  {
    question: "¿El grabado se borra o se despinta?",
    answer:
      "No. El láser marca el material mismo, no le pega nada encima. A diferencia del vinil o la impresión, no se despega al lavar ni se desgasta con el uso diario.",
  },
  {
    question: "¿Graban logos de empresas?",
    answer:
      "Sí. Lo ideal es que nos mandes el logo en vectorial (.ai, .svg, .pdf o .eps); si solo tienes una imagen, la revisamos y te decimos si el detalle alcanza para que se lea bien al grabarlo.",
  },
  {
    question: "¿Cuántas piezas hay que pedir como mínimo?",
    answer:
      "Se puede grabar una sola pieza. Para pedidos de empresa escríbenos con la cantidad y te cotizamos por volumen.",
  },
  {
    question: "¿Puedo llevar mi propio artículo para que lo graben?",
    answer:
      "Consúltanos. Depende del material y de la forma de la pieza: mándanos una foto por WhatsApp y te decimos si se puede grabar y cómo quedaría.",
  },
  {
    question: "¿Cuánto tardan?",
    answer:
      "Depende de la cantidad de piezas y de si el diseño ya está listo. Escríbenos con la fecha en que lo necesitas y te confirmamos si entra antes de que hagas el pedido.",
  },
];

export default async function GrabadoLaserPage() {
  const [tagged, featured, occasions] = await Promise.all([
    getProductsByAttribute("contenido", ["grabado-laser"], 8),
    getFeaturedProducts(8),
    getTaxonomy("ocasion"),
  ]);

  const products = tagged.length > 0 ? tagged : featured;
  const occasionSlugs = new Set(occasions.map((o) => o.slug));
  // Solo se enlazan las ocasiones que hoy tienen regalos publicados: un enlace
  // a un catálogo vacío gasta la visita.
  const uses = USES.filter((use) => {
    const slug = use.href.split("=")[1];
    return occasionSlugs.has(slug);
  });

  return (
    <main className="flex flex-col">
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
            {
              "@type": "ListItem",
              position: 2,
              name: "Grabado láser en El Salvador",
              item: `${site.url}${PATH}`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Grabado láser",
          serviceType: "Grabado láser sobre acero, madera, vidrio y cerámica",
          description: DESCRIPTION,
          url: `${site.url}${PATH}`,
          areaServed: { "@type": "Country", name: site.country },
          provider: {
            "@type": "Organization",
            name: site.name,
            url: site.url,
            telephone: `+${site.phone}`,
          },
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Portada                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-green">
        <Arc className="pointer-events-none absolute -left-16 -top-10 hidden w-80 text-brand-teal/25 lg:block" />
        <Sparkle className="absolute right-10 top-16 size-16 text-brand-lime/25" />

        <div className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8 text-center lg:px-8 lg:pb-24 lg:pt-12">
          <nav
            aria-label="Migas de pan"
            className="mb-6 text-base text-brand-cream/70"
          >
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <span className="px-2" aria-hidden>
              /
            </span>
            <span className="text-brand-cream">Grabado láser</span>
          </nav>

          <p className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-ink">
            <Sparkles className="size-4 shrink-0 text-brand-green" aria-hidden />
            {/* El texto va en su propio span para que, cuando en móvil no
                quepa en una línea, las dos queden parejas en vez de dejar una
                palabra suelta abajo. */}
            <span className="text-balance">
              Marcado permanente, no calcomanía
            </span>
          </p>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] text-balance text-white sm:text-5xl lg:text-6xl">
            {/* Aquí el énfasis va en color y no con el resaltador de lima: el
                titular es blanco, y blanco sobre lima da 2.32:1. El lima sobre
                el verde de marca, en cambio, da 5.28:1. */}
            Grabado <span className="text-brand-lime">láser</span> en El
            Salvador
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-cream/90 sm:text-xl">
            Nombres, fechas, frases y logos grabados sobre acero, madera,
            vidrio, cerámica y cuerina. Una pieza suelta o un pedido completo
            para tu empresa, y si quieres lo metemos dentro de un regalo armado.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={whatsappTo(
                "Hola, quiero cotizar un grabado láser. Quiero grabar:",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-4 text-lg font-semibold sm:px-7 text-ink transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-5" />
              Cotizar mi grabado
            </a>
            <Link
              href="/catalogo?contenido=grabado-laser"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-cream/60 px-6 py-4 text-lg font-semibold sm:px-7 text-white transition hover:bg-white/10"
            >
              Ver regalos con grabado
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Va dentro de la portada verde, así que se rellena del color de la
            página: el festón lo dibuja el crema mordiendo el verde, no al
            revés. Voltearlo aquí no serviría —lo que quedara sin rellenar
            seguiría siendo verde. */}
        <Scallop className="h-6 w-full text-surface" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Materiales                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Sobre qué grabamos
          </h2>
          <Squiggle className="hidden h-5 w-24 text-brand-orange sm:block" />
        </div>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">
          Cada material reacciona distinto al láser, y eso decide cómo se va a
          ver el nombre. Esto es lo que manejamos:
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MATERIALS.map(({ Icon, name, result, items }) => (
            <section
              key={name}
              className="flex flex-col gap-3 rounded-3xl border border-line-soft bg-surface-raised p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-cream">
                <Icon className="size-5 text-brand-green" aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold text-brand-green">
                {name}
              </h3>
              <p className="text-base text-ink">{result}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item} className="text-base text-ink-muted">
                    · {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Para qué se usa                                                   */}
      {/* ---------------------------------------------------------------- */}
      {uses.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <div className="rounded-[2rem] bg-brand-cream/50 p-8 sm:p-10">
            <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
              Para qué lo piden
            </h2>
            {/* En tablet se parten en dos y la tercera baja: a una sola
                columna, cada tarjeta queda de 700 px de ancho por tres
                líneas de texto. */}
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {uses.map(({ Icon, title, text, href, cta }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 rounded-3xl bg-surface-raised p-7"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-lime">
                    <Icon className="size-5 text-brand-green" aria-hidden />
                  </span>
                  <h3 className="font-display text-xl font-semibold text-brand-green">
                    {title}
                  </h3>
                  <p className="text-base leading-relaxed text-ink">{text}</p>
                  <Link
                    href={href}
                    className="mt-auto inline-flex items-center gap-2 pt-2 font-semibold text-brand-green underline underline-offset-4"
                  >
                    {cta}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Cómo se pide                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
          Cómo se pide un grabado
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-3xl bg-brand-cream/60 p-7 pt-9"
            >
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
      {/* Ejemplos                                                          */}
      {/* ---------------------------------------------------------------- */}
      <ProductStrip
        title="Regalos que llevan grabado"
        intro="El grabado casi nunca va solo: suele ir dentro de una caja con flores, chocolates y tarjeta."
        products={products}
        href="/catalogo?contenido=grabado-laser"
        linkLabel="Ver todos"
      />

      {/* ---------------------------------------------------------------- */}
      {/* Preguntas                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-8">
          <Faq items={FAQS} />
        </div>

        <p className="mt-8 text-base text-ink-muted">
          ¿Quieres que el grabado vaya dentro de una caja? Mira cómo armamos los{" "}
          <Link
            href="/regalos-personalizados-el-salvador"
            className="font-semibold text-brand-green underline underline-offset-4"
          >
            regalos personalizados en El Salvador
          </Link>
          .
        </p>
      </section>

      <CtaBand
        title="Mándanos el nombre y te decimos cómo queda"
        text="Escríbenos qué pieza quieres grabar y qué debe decir. Si es para una empresa, cuéntanos la cantidad y te cotizamos por volumen."
        message="Hola, quiero cotizar un grabado láser. Quiero grabar:"
        secondaryHref="/catalogo?contenido=grabado-laser"
        secondaryLabel="Ver regalos con grabado"
      />
    </main>
  );
}
