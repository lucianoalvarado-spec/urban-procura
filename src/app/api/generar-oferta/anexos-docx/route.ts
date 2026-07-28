import { NextRequest } from "next/server";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { AnexoGenerado } from "@/lib/generacion-ofertas/anexos-obras";

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

function celda(texto: string, encabezado = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: texto, bold: encabezado })] })],
    width: { size: 100, type: WidthType.AUTO },
  });
}

function tablaAnexo(tabla: NonNullable<AnexoGenerado["tabla"]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: tabla.encabezados.map((h) => celda(h, true)) }),
      ...tabla.filas.map((fila) => new TableRow({ children: fila.map((v) => celda(v)) })),
    ],
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    anexos?: AnexoGenerado[];
    proceso?: ProcesoResumen;
    proveedor?: ProveedorResumen;
  } | null;

  if (!body?.anexos || !body?.proceso || !body?.proveedor) {
    return Response.json({ error: "Faltan los anexos, el proceso o el proveedor." }, { status: 400 });
  }

  const { anexos, proceso, proveedor } = body;
  const aplicables = anexos.filter((a) => a.aplicable);
  const noAplicables = anexos.filter((a) => !a.aplicable);

  const children: (Paragraph | Table)[] = [
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
    new Paragraph({
      children: [
        new TextRun({
          text: "Prellenado con datos del Perfil del proveedor a partir de las Bases Estándar de Licitación Pública de Obras vigentes bajo la Ley N° 32069 (Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la Resolución Directoral N° 0001-2026-EF/54.01). Los campos entre corchetes [CONSIGNAR ...] no se pudieron completar automáticamente — revísalos y complétalos a mano antes de presentar la oferta.",
          italics: true,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Anexos de la oferta", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: proceso.objeto, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({
      text: `${proceso.entidad} · ${proceso.categoria} / ${proceso.tipoProcedimiento} · S/ ${proceso.montoReferencial.toLocaleString("es-PE")}`,
    }),
    new Paragraph({ text: `Presentado por: ${proveedor.razonSocial} (RUC ${proveedor.ruc})` }),
    new Paragraph({ text: "" }),
  ];

  for (const anexo of aplicables) {
    children.push(
      new Paragraph({ text: `Anexo N° ${anexo.numero} — ${anexo.titulo}`, heading: HeadingLevel.HEADING_1 })
    );
    for (const parrafo of anexo.parrafos) {
      children.push(new Paragraph({ text: parrafo || " " }));
    }
    if (anexo.tabla && anexo.tabla.filas.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(tablaAnexo(anexo.tabla));
    }
    children.push(new Paragraph({ text: "" }));
  }

  if (noAplicables.length > 0) {
    children.push(
      new Paragraph({ text: "Anexos que no aplican a esta oferta", heading: HeadingLevel.HEADING_1 })
    );
    for (const anexo of noAplicables) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Anexo N° ${anexo.numero} — ${anexo.titulo}: `, bold: true }),
            new TextRun({ text: anexo.motivoNoAplicable ?? "No aplica." }),
          ],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  const nombreArchivo = `Anexos - ${proceso.objeto.slice(0, 60).replace(/[\\/:*?"<>|]/g, "")}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
