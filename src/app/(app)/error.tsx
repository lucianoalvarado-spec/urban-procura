"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">No pudimos cargar esta pantalla</h1>
      <p className="text-sm text-slate-500">
        Puede ser un problema temporal con alguna fuente de datos externa (OECE, OSCE) o un error
        pasajero. Intenta de nuevo.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
      >
        Reintentar
      </button>
    </div>
  );
}
