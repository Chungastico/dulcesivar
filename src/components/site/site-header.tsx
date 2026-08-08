"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/social";
import { NAV_LINKS, site, whatsappTo } from "@/lib/site";

const HEADER_WHATSAPP = whatsappTo(
  "Hola, vengo del sitio web y quiero información sobre sus regalos.",
);

export function SiteHeader() {
  const pathname = usePathname();
  // El panel móvil se cierra al tocar cualquiera de sus enlaces. Se hace en el
  // onClick y no en un efecto sobre la ruta: en el App Router la cabecera no
  // se vuelve a montar al navegar, y cerrar desde un efecto encadena un render
  // de más en cada visita.
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-5 py-3 lg:px-8">
        <Link href="/" className="shrink-0" aria-label={`${site.name} — inicio`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local,
              no necesita el optimizador de next/image. */}
          <img src="/logo.svg" alt="DulceSivar" className="h-10 w-auto" />
        </Link>

        <nav
          aria-label="Principal"
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-base font-medium transition ${
                  active
                    ? "bg-brand-cream text-brand-green"
                    : "text-ink hover:bg-brand-cream/60 hover:text-brand-green"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <a
          href={HEADER_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-base font-semibold text-white transition hover:opacity-90 lg:ml-0 lg:inline-flex"
        >
          <WhatsAppIcon className="size-4" />
          Escríbenos
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-movil"
          className="ml-auto inline-flex size-11 items-center justify-center rounded-full border border-line text-brand-green lg:hidden"
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="menu-movil"
          className="border-t border-line-soft bg-surface px-5 pb-5 pt-2 lg:hidden"
        >
          <nav aria-label="Principal (móvil)" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="border-b border-line-soft py-3.5 text-lg font-medium text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <a
            href={HEADER_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3.5 text-lg font-semibold text-white"
          >
            <WhatsAppIcon className="size-5" />
            Escríbenos por WhatsApp
          </a>
        </div>
      ) : null}
    </header>
  );
}
