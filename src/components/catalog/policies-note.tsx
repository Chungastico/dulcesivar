/**
 * Letra chica de cada ficha de producto. Es la misma para todo el catálogo
 * (no depende del producto), así que va fija aquí en vez de un campo que
 * habría que repetir a mano en cada alta.
 */
export function PoliciesNote() {
  return (
    <section className="rounded-2xl border border-line-soft bg-brand-cream/30 p-5">
      <h2 className="text-sm font-semibold text-brand-green">
        Políticas y consideraciones
      </h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">
        <li>· Precios aplican para pagos en transferencia bancaria.</li>
        <li>· Precios no incluyen IVA.</li>
      </ul>
      <p className="mt-3 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Nota:</span> pueden efectuar
        cambios en cualquiera de las opciones de regalos (agregar y quitar
        productos, según sus requerimientos y presupuesto).
      </p>
    </section>
  );
}
