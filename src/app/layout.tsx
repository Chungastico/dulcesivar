import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { site } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Serif de los titulares. Fraunces tiene el eje `SOFT`, que redondea los
 * terminales: la misma letra pasa de "periódico" a "repostería" sin cambiar de
 * familia, que es exactamente el tono de la marca.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT"],
});

export const metadata: Metadata = {
  // Sin esto, cualquier `alternates.canonical` o imagen relativa de las páginas
  // hijas revienta el build en vez de resolverse contra el dominio.
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description:
    "Cajas de regalo armadas a mano, detalles personalizados y grabado láser en El Salvador. Elige la ocasión, cambia lo que lleva adentro y te lo entregamos listo.",
  applicationName: site.name,
  keywords: [
    "regalos personalizados El Salvador",
    "grabado láser El Salvador",
    "cajas de regalo El Salvador",
    "detalles personalizados",
    "regalos corporativos El Salvador",
  ],
  openGraph: {
    type: "website",
    locale: "es_SV",
    siteName: site.name,
    url: site.url,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider localization={esES}>
      <html
        lang="es"
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
