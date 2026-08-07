"use client";

/**
 * Indicador de pasos del formulario de producto.
 *
 * El formulario completo mostraba foto, datos, contenido y clasificación a la
 * vez: demasiado de golpe para quien carga productos a diario y no es técnico.
 * Partirlo en pasos deja una sola decisión en pantalla y hace visible cuánto
 * falta.
 */
export type Step = {
  id: number;
  label: string;
  hint: string;
};

export function StepIndicator({
  steps,
  current,
  furthest,
  onGo,
}: {
  steps: Step[];
  current: number;
  /** Hasta dónde llegó: no se puede saltar a un paso aún no habilitado. */
  furthest: number;
  onGo: (id: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface-raised p-2">
      {steps.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        const reachable = step.id <= furthest;

        return (
          <li key={step.id} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(step.id)}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition ${
                active
                  ? "bg-brand-green text-white"
                  : reachable
                    ? "text-ink hover:bg-brand-cream/60"
                    : "cursor-not-allowed text-ink-muted/60"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-white text-brand-green"
                    : done
                      ? "bg-brand-teal text-white"
                      : "border-2 border-line bg-surface-raised text-ink-muted"
                }`}
              >
                {done ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    aria-hidden
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm font-medium">
                  {step.label}
                </span>
                <span
                  className={`truncate text-xs ${active ? "text-white/80" : "text-ink-muted"}`}
                >
                  {step.hint}
                </span>
              </span>
            </button>
            {i < steps.length - 1 ? (
              <span aria-hidden className="hidden h-px w-3 bg-line lg:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
