export function formatMonto(monto: number, moneda: string = "S/"): string {
  return `${moneda} ${monto.toLocaleString("es-PE")}`;
}

export function formatFecha(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function diasRestantes(iso: string, referencia: Date = new Date()): number {
  const objetivo = new Date(`${iso}T00:00:00`);
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
