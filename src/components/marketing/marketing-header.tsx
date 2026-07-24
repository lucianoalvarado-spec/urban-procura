import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-600)] text-sm font-bold text-white">
            UP
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">Urban Procura</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/#planes"
            className="hidden px-3 py-2 text-slate-600 hover:text-slate-900 sm:inline"
          >
            Planes
          </Link>
          <Link href="/login" className="px-3 py-2 text-slate-600 hover:text-slate-900">
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-[var(--brand-600)] px-3.5 py-2 font-medium text-white hover:bg-[var(--brand-700)]"
          >
            Crear cuenta gratis
          </Link>
        </nav>
      </div>
    </header>
  );
}
