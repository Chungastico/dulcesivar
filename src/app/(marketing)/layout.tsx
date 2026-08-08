import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Marco del sitio público: cabecera, contenido y pie.
 *
 * Es un grupo de rutas —los paréntesis no aparecen en la URL— porque no todo
 * lo público lleva este marco: /enlaces es una página de bio para Instagram,
 * donde una barra de navegación estorba, y /admin tiene el suyo propio.
 */
export default function MarketingLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
