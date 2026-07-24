export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-slate-500 md:px-6">
        <p>
          Urban Procura está en fase de demostración: los procesos, montos y el perfil de
          proveedor que ves son datos de muestra, no información oficial del SEACE, OSCE/OECE ni
          de ninguna entidad pública. No estamos afiliados a esas instituciones.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Urban Procura. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
