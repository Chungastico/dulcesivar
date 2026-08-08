import { Plus } from "lucide-react";

export type FaqItem = { question: string; answer: string };

/**
 * El acordeón es <details>/<summary> nativo: abre y cierra sin JavaScript, así
 * que el contenido está en el HTML desde el primer byte. Eso importa aquí más
 * que en otros lados, porque el bloque de preguntas es justo el que Google
 * puede mostrar como fragmento enriquecido.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group overflow-hidden rounded-2xl border border-line-soft bg-surface-raised open:border-brand-teal"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-semibold text-ink marker:hidden">
            {item.question}
            <Plus
              className="size-5 shrink-0 text-brand-green transition group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="px-5 pb-5 text-base leading-relaxed text-ink-muted">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

/** El mismo contenido, en el formato que lee el buscador. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
