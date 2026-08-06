export type ContentItem = { label: string; quantity: number };

/**
 * Convierte una lista pegada como texto en ítems con cantidad.
 *
 * Existe porque el catálogo actual vive en Canva, y sus listas "INCLUYE" ya
 * están escritas. Reescribir cada línea a mano en el formulario sería el
 * cuello de botella de toda la carga; pegarlas de golpe no.
 *
 * Formatos que acepta (todos aparecen en el catálogo real):
 *   "• 1 Vaso Transparente"  -> 1  "Vaso Transparente"
 *   "12 rosas"               -> 12 "rosas"
 *   "2 libras uva verde"     -> 2  "libras uva verde"
 *   "Mini ramo de flores"    -> 1  "Mini ramo de flores"
 */
export function parseContentList(text: string): ContentItem[] {
  return text
    .split(/\r?\n/)
    // Quita viñetas de cualquier tipo: al copiar de Canva o Word vienen mezcladas.
    .map((raw) => raw.replace(/^[\s•·*\-–—]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,3})\s+(.*)$/);
      if (match) {
        const quantity = Number(match[1]);
        const label = match[2].trim();
        // Un número suelto sin texto detrás no es una cantidad, es el ítem.
        if (quantity >= 1 && quantity <= 999 && label) {
          return { quantity, label };
        }
      }
      return { quantity: 1, label: line };
    });
}
