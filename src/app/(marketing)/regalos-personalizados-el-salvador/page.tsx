import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Boxes,
  CreditCard,
  Palette,
  ScanLine,
  Sparkles,
  Stamp,
  Truck,
  Type,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/social";
import { CtaBand } from "@/components/site/cta-band";
import { Arc, Highlight, Sparkle, Squiggle } from "@/components/site/decor";
import { Faq, faqJsonLd, type FaqItem } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { ProductStrip } from "@/components/site/product-strip";
import { BUDGET_TIERS } from "@/lib/catalog-filters";
import {
  getContentPresets,
  getFeaturedProducts,
  getProductsByAttribute,
  getTaxonomy,
} from "@/lib/marketing";
import { pageOpenGraph, site, whatsappTo } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/regalos-personalizados-el-salvador";

const DESCRIPTION =
  "Regalos personalizados en El Salvador: cajas armadas a mano con lo que tú elijas adentro, nombre grabado a láser y tarjeta. Para cumpleaños, bodas, graduaciones y empresas.";

export const metadata: Metadata = {
  title: "Regalos personalizados en El Salvador",
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({
    title: `Regalos personalizados en El Salvador | ${site.name}`,
    description: DESCRIPTION,
    path: PATH,
  }),
};

const CUSTOMIZABLE = [
  {
    Icon: Boxes,
    title: "Lo que lleva adentro",
    text: "Quitas lo que no va y agregas lo que falta. La caja se arma con lo que tú elijas, no con un paquete cerrado.",
  },
  {
    Icon: ScanLine,
    title: "El nombre grabado",
    text: "Nombre, iniciales, fecha o una frase corta, grabados a láser en el vaso, la taza, el llavero o la caja de madera.",
  },
  {
    Icon: Box,
    title: "El empaque",
    text: "Caja de madera personalizada, kraft decorada, cilindro, caja negra con tapadera transparente o bolsa decorada.",
  },
  {
    Icon: Type,
    title: "La tarjeta",
    text: "Escribimos tu dedicatoria en una tarjeta personalizada. Es lo primero que lee la persona al abrir.",
  },
  {
    Icon: Palette,
    title: "Los colores",
    text: "Muchos insumos vienen en varios colores: se eligen para que la caja combine con la ocasión o con la marca.",
  },
  {
    Icon: CreditCard,
    title: "El presupuesto",
    text: "Nos dices con cuánto cuentas y armamos la mejor versión posible dentro de ese monto.",
  },
];

const STEPS = [
  {
    title: "Nos escribes",
    text: "Cuéntanos la ocasión, para quién es, la fecha y más o menos cuánto quieres gastar.",
  },
  {
    title: "Te proponemos",
    text: "Te mandamos dos o tres opciones con lo que llevaría cada una y cuánto sale.",
  },
  {
    title: "Ajustamos",
    text: "Cambias lo que quieras: sacar el licor, poner flores, subir de tamaño, cambiar el color del moño.",
  },
  {
    title: "Se arma y se entrega",
    text: "Grabamos, armamos y envolvemos. Lo recoges o lo llevamos a domicilio en el horario que elijas.",
  },
];

const FAQS: FaqItem[] = [
  {
    question: "¿Puedo pedir un regalo que no está en el catálogo?",
    answer:
      "Sí. El catálogo son ideas ya armadas para que veas qué se puede hacer, pero se puede partir de cero: dinos qué quieres que lleve y lo cotizamos.",
  },
  {
    question: "¿Cuál es el monto mínimo?",
    answer:
      "El rango más bajo del catálogo, Sivar Esencial, va de $5 a $20, así que se puede armar un detalle pequeño sin problema. Para pedidos de varias piezas iguales escríbenos y te damos precio por volumen.",
  },
  {
    question: "¿Qué puede llevar adentro la caja?",
    answer:
      "Vasos y tazas personalizados, termos, libretas, bolígrafos, llaveros, flores, globos con helio, chocolates, café, semillas, frutas, vino o cerveza, peluches, velas, marcos con foto, mini pasteles y postres.",
  },
  {
    question: "¿Puedo quitar el licor o los comestibles?",
    answer:
      "Sí. Se pueden efectuar cambios en cualquiera de las opciones: agregar y quitar productos según tus requerimientos y tu presupuesto.",
  },
  {
    question: "¿Cómo se paga y cuánto cuesta el envío?",
    answer:
      "Los precios aplican para pago por transferencia bancaria y no incluyen IVA. El envío a domicilio tiene un costo adicional y sale en horarios establecidos: al confirmar tu pedido te compartimos los horarios disponibles.",
  },
  {
    question: "¿Con cuánta anticipación debo pedir?",
    answer:
      "Entre más personalizado, más tiempo. Un pastel personalizado, por ejemplo, se pide con tres días de anticipación. Escríbenos con la fecha en que lo necesitas y te confirmamos si entra.",
  },
];

export default async function RegalosPersonalizadosPage() {
  const [boxTypes, occasions, presets, tagged, featured] = await Promise.all([
    getTaxonomy("tipo-caja"),
    getTaxonomy("ocasion"),
    getContentPresets(8),
    getProductsByAttribute("personalizacion", ["total", "parcial"], 8),
    getFeaturedProducts(8),
  ]);

  // Si nadie ha etiquetado todavía el eje "personalización", la página no se
  // queda sin ejemplos: cae a lo destacado, que igual se puede personalizar.
  const products = tagged.length > 0 ? tagged : featured;

  return (
    <main className="flex flex-col">
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Inicio",
              item: site.url,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Regalos personalizados en El Salvador",
              item: `${site.url}${PATH}`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Regalos personalizados",
          serviceType: "Cajas de regalo personalizadas",
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
      <section className="paper relative overflow-hidden">
        <Arc className="pointer-events-none absolute -right-16 top-16 hidden w-72 text-brand-orange/25 lg:block" />

        <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 text-center lg:px-8 lg:pb-24 lg:pt-12">
          <nav aria-label="Migas de pan" className="mb-6 text-base text-ink-muted">
            <Link href="/" className="hover:text-brand-green">
              Inicio
            </Link>
            <span className="px-2" aria-hidden>
              /
            </span>
            <span className="text-ink">Regalos personalizados</span>
          </nav>

          <p className="inline-flex items-center gap-2 rounded-full border border-brand-teal/40 bg-brand-teal/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-ink">
            <Sparkles className="size-4 shrink-0 text-brand-green" aria-hidden />
            {/* Ver la nota del mismo distintivo en la página de grabado. */}
            <span className="text-balance">
              Se arma contigo, no se elige de una lista
            </span>
          </p>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] text-balance text-brand-green sm:text-5xl lg:text-6xl">
            Regalos <Highlight>personalizados</Highlight> en El Salvador
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink sm:text-xl">
            Cajas armadas a mano con lo que tú elijas adentro, el nombre grabado
            a láser y la dedicatoria escrita en la tarjeta. Nada de paquetes
            cerrados: se quita, se agrega y se ajusta hasta que quede como lo
            imaginaste.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={whatsappTo(
                "Hola, quiero armar un regalo personalizado. Es para:",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-4 text-lg font-semibold sm:px-7 text-white transition hover:opacity-90"
            >
              <WhatsAppIcon className="size-5" />
              Armar el mío
            </a>
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-green px-6 py-4 text-lg font-semibold sm:px-7 text-brand-green transition hover:bg-brand-green hover:text-white"
            >
              Ver ideas en el catálogo
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Qué se personaliza                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Qué se puede personalizar
          </h2>
          <Squiggle className="hidden h-5 w-24 text-brand-lime sm:block" />
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMIZABLE.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-3xl border border-line-soft bg-surface-raised p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-cream">
                <Icon className="size-5 text-brand-green" aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold text-brand-green">
                {title}
              </h3>
              <p className="text-base leading-relaxed text-ink">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Tipos de caja                                                     */}
      {/* ---------------------------------------------------------------- */}
      {boxTypes.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <div className="rounded-[2rem] bg-brand-cream/50 p-8 sm:p-10">
            <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
              Tipos de caja
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-muted">
              Cada presentación cambia el tamaño, el empaque y cuántas cosas
              caben. Todas se personalizan.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {boxTypes.map((box) => (
                <li key={box.slug}>
                  <Link
                    href={`/catalogo?tipo-caja=${box.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-2.5 text-base font-medium text-ink transition hover:border-brand-green hover:bg-brand-green hover:text-white"
                  >
                    {box.name}
                    <span className="text-sm opacity-60">{box.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Qué le ponemos adentro (biblioteca real de insumos)               */}
      {/* ---------------------------------------------------------------- */}
      {presets.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
              Qué le ponemos adentro
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              Esto es lo que manejamos. Si buscas algo que no está en la lista,
              pregúntanos: casi siempre se consigue.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((group) => (
              <section
                key={group.category}
                className="rounded-3xl border border-line-soft bg-surface-raised p-7"
              >
                <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-green">
                  <Sparkle className="size-3.5 text-brand-orange" />
                  {group.category}
                </h3>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-base text-ink-muted">
                      · {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Ejemplos reales                                                   */}
      {/* ---------------------------------------------------------------- */}
      <ProductStrip
        title="Regalos que ya armamos"
        intro="Sirven de punto de partida: elige el que más se acerque y lo ajustamos desde ahí."
        products={products}
        href="/catalogo"
      />

      {/* ---------------------------------------------------------------- */}
      {/* Ocasiones                                                         */}
      {/* ---------------------------------------------------------------- */}
      {occasions.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
            Para cada ocasión
          </h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {occasions.map((occasion) => (
              <li key={occasion.slug}>
                <Link
                  href={`/catalogo?ocasion=${occasion.slug}`}
                  className="inline-block rounded-full border border-line bg-surface-raised px-5 py-2.5 text-base font-medium text-ink transition hover:border-brand-green hover:bg-brand-green hover:text-white"
                >
                  Regalos personalizados de {occasion.name.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Cómo se pide                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-brand-green">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Cómo se pide
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span
                  aria-hidden
                  className="font-display text-5xl font-semibold text-brand-lime/40"
                >
                  {i + 1}
                </span>
                <h3 className="mt-1 font-display text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-brand-cream/85">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Presupuesto y condiciones                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold text-brand-green sm:text-4xl">
              Cuánto cuesta
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              El catálogo está ordenado por rangos, así puedes empezar por lo
              que tienes disponible y no por la caja.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {BUDGET_TIERS.map((tier) => (
                <li key={tier.id}>
                  <Link
                    href={`/catalogo?presupuesto=${tier.id}`}
                    className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface-raised p-5 transition hover:border-brand-teal hover:shadow-lg"
                  >
                    <span className="font-display text-lg font-semibold text-brand-green">
                      {tier.name}
                    </span>
                    <span className="text-xl font-bold text-ink">
                      {tier.priceLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <aside className="flex flex-col gap-3 rounded-3xl border border-line-soft bg-brand-cream/40 p-7">
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-green">
              <Stamp className="size-5" aria-hidden />
              Antes de pedir
            </h3>
            <ul className="flex flex-col gap-2 text-base text-ink">
              <li>· Los precios aplican para pago por transferencia bancaria.</li>
              <li>· Los precios no incluyen IVA.</li>
              <li className="flex gap-2">
                <Truck className="mt-1 size-4 shrink-0" aria-hidden />
                El envío a domicilio tiene un costo adicional y sale en horarios
                establecidos; al confirmar el pedido te compartimos los
                disponibles.
              </li>
              <li>
                · Puedes cambiar cualquier opción: agregar y quitar productos
                según tus requerimientos y presupuesto.
              </li>
            </ul>
          </aside>
        </div>
      </section>

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
          ¿Buscabas otra cosa? También hacemos{" "}
          <Link
            href="/grabado-laser-el-salvador"
            className="font-semibold text-brand-green underline underline-offset-4"
          >
            grabado láser en El Salvador
          </Link>{" "}
          sobre acero, madera, vidrio y cerámica.
        </p>
      </section>

      <CtaBand
        title="Cuéntanos qué estás celebrando"
        text="Con la ocasión, la fecha y tu presupuesto te proponemos dos o tres opciones el mismo día."
        message="Hola, quiero un regalo personalizado. Es para:"
      />
    </main>
  );
}
