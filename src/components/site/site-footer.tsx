import Link from "next/link";

import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social";
import { Scallop } from "@/components/site/decor";
import { getOccasionLinks } from "@/lib/marketing";
import {
  FOOTER_OCCASION_LIMIT,
  NAV_LINKS,
  phoneDisplay,
  site,
  whatsappTo,
} from "@/lib/site";

const FOOTER_WHATSAPP = whatsappTo(
  "Hola, vengo del sitio web y quiero información sobre sus regalos.",
);

export async function SiteFooter() {
  // Las ocasiones se consultan en vez de escribirse a mano: los nombres reales
  // los pone ella desde el panel ("Birthday Boy", "Padrinos, Bride y damas de
  // honor"), y una lista fija aquí enlazaría a filtros que no existen.
  const occasions = await getOccasionLinks(FOOTER_OCCASION_LIMIT);

  return (
    <footer className="mt-auto text-brand-cream">
      {/* El festón hace de costura entre la página y el pie, en vez del corte
          recto de siempre. */}
      <Scallop className="h-6 w-full text-brand-green" />

      <div className="bg-brand-green">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex w-fit items-center justify-center rounded-2xl bg-surface-raised px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG local. */}
              <img src="/logo.svg" alt={site.name} className="h-10 w-auto" />
            </div>
            <p className="max-w-xs text-base text-brand-cream/85">
              Cajas de regalo armadas a mano, detalles personalizados y grabado
              láser. Hecho en El Salvador.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={FOOTER_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                className="flex size-11 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:brightness-110"
              >
                <WhatsAppIcon className="size-5" />
              </a>
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Síguenos en Instagram"
                className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white transition hover:brightness-110"
              >
                <InstagramIcon className="size-5" />
              </a>
            </div>
          </div>

          <nav aria-labelledby="pie-explorar" className="flex flex-col gap-3">
            <h2
              id="pie-explorar"
              className="font-display text-lg font-semibold text-brand-lime"
            >
              Explorar
            </h2>
            <Link href="/" className="text-base text-brand-cream/85 hover:text-white">
              Inicio
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base text-brand-cream/85 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/enlaces"
              className="text-base text-brand-cream/85 hover:text-white"
            >
              Enlaces rápidos
            </Link>
          </nav>

          {occasions.length > 0 ? (
            <nav aria-labelledby="pie-ocasiones" className="flex flex-col gap-3">
              <h2
                id="pie-ocasiones"
                className="font-display text-lg font-semibold text-brand-lime"
              >
                Por ocasión
              </h2>
              {occasions.map((occasion) => (
                <Link
                  key={occasion.slug}
                  href={`/catalogo?ocasion=${occasion.slug}`}
                  className="text-base text-brand-cream/85 hover:text-white"
                >
                  {occasion.name}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-brand-lime">
              Contacto
            </h2>
            <a
              href={FOOTER_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-brand-cream/85 hover:text-white"
            >
              WhatsApp {phoneDisplay}
            </a>
            <a
              href={site.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-brand-cream/85 hover:text-white"
            >
              Instagram {site.instagramHandle}
            </a>
            <p className="text-base text-brand-cream/85">El Salvador</p>
            <p className="mt-2 text-sm text-brand-cream/70">
              Precios de lista para pago por transferencia bancaria; no incluyen
              IVA. El envío a domicilio tiene costo adicional.
            </p>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-5 py-6 text-sm text-brand-cream/70 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>
              © {new Date().getFullYear()} {site.name}. Todos los derechos
              reservados.
            </p>
            <p>{site.tagline}.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
