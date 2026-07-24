export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 md:px-6">
      Modo demo: el perfil, las preferencias y el CRM son de muestra. El Explorador, la Ficha del
      proceso y el RUC en Registro/Perfil sí consultan en tiempo real al OECE — si la fuente
      falla, cada pantalla lo indica y muestra datos de muestra en su lugar.
    </div>
  );
}
