import { NextRequest } from "next/server";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { BorradorOferta } from "@/app/api/generar-oferta/route";

export const preferredRegion = "gru1";
export const maxDuration = 30;

interface ProcesoResumen {
  objeto: string;
  entidad: string;
  categoria: string;
  tipoProcedimiento: string;
  montoReferencial: number;
}

interface ProveedorResumen {
  razonSocial: string;
  ruc: string;
}

function listaOParrafo(items: string[], vacioTexto: string): Paragraph[] {
  if (items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: vacioTexto, italics: true })] })];
  }
  return items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } }));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    borrador?: BorradorOferta;
    proceso?: ProcesoResumen;
    proveedor?: ProveedorResumen;
  } | null;

  if (!body?.borrador || !body?.proceso || !body?.proveedor) {
    return Response.json({ error: "Falta información para generar el documento." }, { status: 400 });
  }

  const { borrador, proceso, proveedor } = body;

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN HUMANA ANTES DE PRESENTARSE",
                bold: true,
                color: "B45309",
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Propuesta técnica", heading: HeadingLevel.TITLE }),
          new Paragraph({ text: proceso.objeto, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: `${proceso.entidad} · ${proceso.categoria} / ${proceso.tipoProcedimiento} · S/ ${proceso.montoReferencial.toLocaleString("es-PE")}`,
          }),
          new Paragraph({
            text: `Presentado por: ${proveedor.razonSocial} (RUC ${proveedor.ruc})`,
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "1. Presentación de la empresa", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: borrador.presentacionEmpresa }),

          new Paragraph({ text: "2. Experiencia relevante", heading: HeadingLevel.HEADING_1 }),
          ...listaOParrafo(borrador.experienciaRelevante, "Sin experiencia registrada."),

          new Paragraph({ text: "3. Personal clave propuesto", heading: HeadingLevel.HEADING_1 }),
          ...listaOParrafo(borrador.personalPropuesto, "Sin personal clave registrado."),

          new Paragraph({ text: "4. Equipamiento propuesto", heading: HeadingLevel.HEADING_1 }),
          ...listaOParrafo(borrador.equipamientoPropuesto, "Sin equipamiento registrado."),

          new Paragraph({ text: "5. Propuesta técnica y metodología", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: borrador.propuestaTecnica }),

          new Paragraph({ text: "6. Cronograma tentativo", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: borrador.cronogramaTentativo }),

          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: borrador.generadoConIA
                  ? "Propuesta técnica y cronograma redactados con asistencia de IA (Claude) a partir del perfil del proveedor y el análisis de bases. Este es un borrador: revísalo, corrígelo y complétalo con tu equipo técnico antes de presentarlo a la entidad."
                  : "Este borrador se armó con una plantilla básica a partir de tu perfil, sin asistencia de IA. Complétalo con tu equipo técnico antes de presentarlo a la entidad.",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const nombreArchivo = `Borrador oferta - ${proceso.objeto.slice(0, 60).replace(/[\\/:*?"<>|]/g, "")}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
