import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-slate-500 md:px-6">
        <p>
          Urban Procura está en fase de demostración: el perfil, las preferencias y el CRM que ves
          son datos de muestra. El Explorador, la Ficha del proceso y la búsqueda por RUC sí
          consultan en tiempo real al SEACE/OSCE/OECE — pero no somos una entidad oficial ni
          estamos afiliados a esas instituciones.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/legal" className="underline hover:text-slate-700">
            Aviso legal
          </Link>
          <Link href="/terminos" className="underline hover:text-slate-700">
            Términos y Condiciones
          </Link>
          <Link href="/libro-reclamaciones" className="underline hover:text-slate-700">
            Libro de Reclamaciones
          </Link>
          <Link href="/blog" className="underline hover:text-slate-700">
            Blog
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Urban Procura. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
