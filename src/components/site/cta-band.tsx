import Link from "next/link";

import { WhatsAppIcon } from "@/components/icons/social";
import { Sparkle, Squiggle } from "@/components/site/decor";
import { whatsappTo } from "@/lib/site";

/**
 * El cierre de cada página. Repite la misma decisión —escribir o seguir
 * viendo— para que nadie tenga que subir hasta el inicio a buscar el botón.
 */
export function CtaBand({
  title,
  text,
  message,
  secondaryHref = "/catalogo",
  secondaryLabel = "Ver el catálogo",
}: {
  title: string;
  text: string;
  /** Mensaje que llega por WhatsApp; dice de qué página viene la persona. */
  message: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand-green px-6 py-14 text-center sm:px-12">
        <Sparkle className="absolute -left-4 top-8 size-24 text-brand-lime/20" />
        <Sparkle className="absolute -right-6 bottom-4 size-32 text-brand-teal/20" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
          <Squiggle className="h-5 w-24 text-brand-lime" />
          <h2 className="font-display text-3xl font-semibold text-balance text-white sm:text-4xl">
            {title}
          </h2>
          <p className="text-lg text-balance text-brand-cream/90">{text}</p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappTo(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-4 text-lg font-semibold sm:px-7 text-ink transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-5" />
              Escribir por WhatsApp
            </a>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-full border-2 border-brand-cream/60 px-6 py-4 text-lg font-semibold sm:px-7 text-white transition hover:bg-white/10"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
