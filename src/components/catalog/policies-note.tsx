
export function PoliciesNote() {
  return (
    <section className="rounded-2xl border border-line-soft bg-brand-cream/30 p-5">
      <h2 className="text-sm font-semibold text-brand-green">
        Políticas y consideraciones
      </h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">
        <li>· Precios aplican para pagos en transferencia bancaria.</li>
        <li>· Precios no incluyen IVA.</li>
        <li>· Envio a domicilio por un costo adicional</li>
        <li>· Realizamos nuestros envíos en horarios establecidos. Al confirmar tu pedido, te compartiremos los horarios disponibles para que elijas el que mejor te convenga.</li>
      </ul>
      <p className="mt-3 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Nota:</span> pueden efectuar
        cambios en cualquiera de las opciones de regalos (agregar y quitar
        productos, según sus requerimientos y presupuesto).
      </p>
    </section>
  );
}
