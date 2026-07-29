import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Página no encontrada</h1>
      <p className="text-sm text-slate-500">La página que buscas no existe o se movió de lugar.</p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
