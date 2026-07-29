"use client";

import { useEffect } from "react";

// Cubre las rutas fuera de (app)/(marketing) — hoy solo /imprimir-oferta — y sirve de
// respaldo si un error se escapa antes de llegar al error.tsx más específico de cada
// grupo de rutas.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Algo salió mal</h1>
      <p className="text-sm text-slate-500">
        Ocurrió un error inesperado en esta página. Intenta de nuevo.
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
