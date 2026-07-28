export function formatMonto(monto: number | null, moneda: string = "S/"): string {
  if (monto === null) return "No publicado por la entidad";
  return `${moneda} ${monto.toLocaleString("es-PE")}`;
}

// Acepta tanto fechas simples ("2026-08-04", de los fixtures mock) como timestamps
// completos con hora y zona ("2026-07-09T10:38:20.843235-05:00", de datos live del OECE).
function parseFecha(iso: string): Date {
  return iso.includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00`);
}

export function formatFecha(iso: string): string {
  return parseFecha(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function diasRestantes(iso: string, referencia: Date = new Date()): number {
  const objetivo = parseFecha(iso);
  const hoy = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const diffMs = objetivo.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDiasRestantes(iso: string, referencia?: Date): string {
  const dias = diasRestantes(iso, referencia);
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}
