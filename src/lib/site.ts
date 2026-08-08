/**
 * Datos del negocio que se repiten en cabecera, pie, metadatos y JSON-LD.
 *
 * Viven en un solo lugar porque un teléfono o un handle desactualizado en una
 * de las páginas de aterrizaje es peor que no tenerlo: Google lee el JSON-LD y
 * la persona lee el pie, y si no coinciden pierde la confianza justo cuando
 * iba a escribir.
 */

import { publicEnv } from "@/lib/env";

export const site = {
  name: "DulceSivar",
  /** Cómo se lee la marca en una frase, para descripciones y JSON-LD. */
  tagline: "Regalos personalizados y grabado láser en El Salvador",
  url: publicEnv.siteUrl,
  instagram: "https://www.instagram.com/dulcesivar/",
  instagramHandle: "@dulcesivar",
  /** Código de país + número, sin +, espacios ni guiones. */
  phone: process.env.NEXT_PUBLIC_WHATSAPP ?? "50376815829",
  country: "El Salvador",
} as const;

/** Número en formato legible para humanos: +503 7681 5829. */
export const phoneDisplay = `+${site.phone.slice(0, 3)} ${site.phone.slice(
  3,
  7,
)} ${site.phone.slice(7)}`;

/**
 * Enlace de WhatsApp con el mensaje ya escrito. Distinto al de producto
 * (src/lib/whatsapp.ts): aquí no hay una caja concreta, así que el mensaje
 * dice de qué página viene y así ella sabe qué le van a preguntar.
 */
export function whatsappTo(message: string): string {
  return `https://wa.me/${site.phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Bloque Open Graph de una página de venta.
 *
 * Existe porque Next no fusiona `openGraph`: en cuanto una página declara el
 * suyo, reemplaza entero el del layout raíz y se pierden `og:site_name`,
 * `og:locale`, `og:type` y —lo importante— la imagen de app/opengraph-image,
 * que es lo que se ve al pegar el enlace en WhatsApp. Aquí se repiten esos
 * campos una sola vez.
 */
export function pageOpenGraph({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Ruta absoluta del sitio, con barra inicial. */
  path: string;
}) {
  return {
    type: "website" as const,
    locale: "es_SV",
    siteName: site.name,
    title,
    description,
    url: path,
    images: "/opengraph-image",
  };
}

export const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/regalos-personalizados-el-salvador", label: "Regalos personalizados" },
  { href: "/grabado-laser-el-salvador", label: "Grabado láser" },
] as const;

/** Cuántas ocasiones enlaza el pie. Más que esto y deja de ser un pie. */
export const FOOTER_OCCASION_LIMIT = 6;
