import { permanentRedirect } from "next/navigation";

/**
 * La raíz no tiene contenido propio: es el catálogo lo que se comparte y lo
 * que la gente espera ver al entrar al dominio. Se usa permanentRedirect (308)
 * y no redirect (307/303) a propósito, para que los buscadores indexen
 * /catalogo como la URL canónica en vez de la raíz vacía.
 */
export default function Home() {
  permanentRedirect("/catalogo");
}
