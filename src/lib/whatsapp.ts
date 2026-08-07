/**
 * Enlace de WhatsApp con el mensaje ya escrito.
 *
 * Se incluye la URL del producto para que ella sepa de cuál le escriben sin
 * tener que preguntar: en un catálogo con decenas de cajas parecidas, "quiero
 * esta" no alcanza.
 */
const PHONE = process.env.NEXT_PUBLIC_WHATSAPP ?? "50376815829";

export function whatsappLink(productName: string, productUrl?: string): string {
  const message = [
    `¡Hola! Me interesa el regalo «${productName}» del catálogo.`,
    productUrl ? `\n${productUrl}` : "",
  ].join("");
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}
