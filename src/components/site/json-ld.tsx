/**
 * Datos estructurados (schema.org) para el buscador.
 *
 * Van en un <script type="application/ld+json"> porque es el único formato que
 * Google documenta como recomendado, y se serializa con JSON.stringify: el
 * texto viene de nuestras propias constantes, nunca de la URL ni del usuario,
 * así que no hay nada que un tercero pueda inyectar aquí.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Sustituir "<" evita que una descripción con un signo de menor rompa el
      // cierre del <script> al pintarse en el HTML.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
