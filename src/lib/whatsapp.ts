/**
 * Enlace de WhatsApp con el mensaje ya escrito.
 *
 * Se incluye la URL del producto para que ella sepa de cuál le escriben sin
 * tener que preguntar: en un catálogo con decenas de cajas parecidas, "quiero
 * esta" no alcanza.
 */
const PHONE = process.env.NEXT_PUBLIC_WHATSAPP ?? "50376815829";

export function whatsappLink(productName: string, productUrl?: string): string {
  // Redactado como si lo escribiera la clienta que compra, no como aviso del
  // sitio: así el mensaje que le llega a DulceSivar suena a pedido real.
  const message = [
    `Hola, este es el arreglo que deseo: «${productName}».`,
    productUrl ? `\n${productUrl}` : "",
  ].join("");
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}
