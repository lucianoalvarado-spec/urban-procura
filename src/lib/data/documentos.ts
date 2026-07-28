import type { DocumentoRepositorio } from "@/lib/data/types";
import { diasRestantes } from "@/lib/format";

// Vencimiento de documentos habilitantes (RNP, poderes, certificados, declaraciones)
// — la causa #1 de descalificación de ofertas según nuestro propio blog. El dato ya
// existía en el Perfil (DocumentoRepositorio.fechaVigencia) pero nada lo usaba para
// avisar; esto lo convierte en algo accionable en Alertas y en el propio Perfil.

export interface DocumentoConVigencia {
  documento: DocumentoRepositorio & { fechaVigencia: string };
  dias: number;
}

const VENTANA_VIGENCIA_DIAS = 30;

// Incluye vencidos a propósito (dias negativos) — un documento ya vencido es más
// urgente que uno por vencer, no menos.
export function documentosPorVencer(
  documentos: DocumentoRepositorio[],
  ventanaDias: number = VENTANA_VIGENCIA_DIAS
): DocumentoConVigencia[] {
  return documentos
    .filter((d): d is DocumentoRepositorio & { fechaVigencia: string } => Boolean(d.fechaVigencia))
    .map((documento) => ({ documento, dias: diasRestantes(documento.fechaVigencia) }))
    .filter(({ dias }) => dias <= ventanaDias)
    .sort((a, b) => a.dias - b.dias);
}

export function estiloVigencia(dias: number): string {
  if (dias < 0) return "border-l-4 border-l-red-600";
  if (dias <= 7) return "border-l-4 border-l-red-500";
  if (dias <= 14) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-[var(--brand-300)]";
}

export function etiquetaVigencia(dias: number): string {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día(s)`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} día(s)`;
}

export function textoVigencia(dias: number): string {
  if (dias < 0) return "text-red-700";
  if (dias <= 7) return "text-red-600";
  if (dias <= 14) return "text-amber-700";
  return "text-slate-600";
}
