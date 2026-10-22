"use client";

export default function MarketingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-24">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-raised px-6 py-16 text-center">
        <p className="text-lg font-medium text-ink">
          No pudimos cargar esta página.
        </p>
        <p className="text-base text-ink-muted">
          Puede ser algo temporal. Intenta de nuevo en un momento.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
