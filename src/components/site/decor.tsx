/**
 * Los adornos de las páginas de venta.
 *
 * Son SVG en línea y no imágenes: pesan bytes en vez de peticiones, heredan el
 * color con `currentColor` y siguen viéndose bien en cualquier pantalla. Todos
 * llevan `aria-hidden`, porque no dicen nada que el texto no diga ya.
 */

/** Onda festoneada, como el borde de un papel de repostería. */
export function Scallop({ className }: { className?: string }) {
  // 16 arcos de 90 unidades = las 1440 del viewBox. Se estira sin recortarse
  // gracias a preserveAspectRatio="none". La línea base está en y=12 y cada
  // arco sube hasta y=0; de la base para abajo queda relleno macizo, así el
  // borde festoneado se recorta contra el color de la sección de arriba.
  const arcs = Array.from({ length: 16 }, () => "q 45 -24 90 0").join(" ");

  return (
    <svg
      viewBox="0 0 1440 32"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <path d={`M0 12 ${arcs} V32 H0 Z`} fill="currentColor" />
    </svg>
  );
}

/** Trazo ondulado suelto, del tipo que se dibuja a mano al lado de un título. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 28" fill="none" aria-hidden className={className}>
      <path
        d="M3 20C14 4 26 4 37 14s23 10 34-2 22-8 33 4"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Estrella de destello, para marcar lo que está bueno sin poner un emoji. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path
        d="M16 0c1.2 8.6 6.2 13.6 16 15-9.8 1.4-14.8 6.4-16 15-1.2-8.6-6.2-13.6-16-15C9.8 13.6 14.8 8.6 16 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Arco tipo arcoíris. Se usa detrás de los titulares, muy grande y tenue. */
export function Arc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 84" fill="none" aria-hidden className={className}>
      <path
        d="M8 80a72 72 0 0 1 144 0"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Resaltador: una franja de color detrás de una palabra del titular, torcida
 * como si la hubieran pasado a mano.
 *
 * El texto va en su propio <span> posicionado en vez de subir la franja con un
 * z-index negativo: un `-z-10` se cuela por detrás del fondo de la sección y la
 * franja desaparece en cuanto la sección tiene color propio. Aquí basta el
 * orden del DOM — el segundo elemento posicionado pinta encima.
 *
 * Solo sobre fondo claro: el lima con texto blanco encima da 2.32:1.
 */
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden
        className="absolute inset-x-[-0.15em] bottom-[0.04em] h-[0.5em] -rotate-1 rounded-sm bg-brand-lime/85"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/**
 * Etiqueta de regalo: esquina cortada y agujero para el cordón. Es el motivo
 * que se repite en los pasos y en las tarjetas de servicio — la marca vende
 * cajas envueltas, así que la forma sale del producto y no de una plantilla.
 */
export function GiftTag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative [clip-path:polygon(0_22%,22%_0,100%_0,100%_100%,0_100%)] ${className}`}
    >
      <span
        aria-hidden
        className="absolute left-[9%] top-[9%] size-2.5 rounded-full border-2 border-current opacity-40"
      />
      {children}
    </div>
  );
}
