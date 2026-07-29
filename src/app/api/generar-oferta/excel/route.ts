import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import type { AnexoGenerado } from "@/lib/generacion-ofertas/anexos-obras";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

export const preferredRegion = "gru1";
export const maxDuration = 30;

interface ProcesoResumen {
  objeto: string;
  entidad: string;
}

const LIMITE = 20;
const VENTANA_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limite = rateLimit(`generar-oferta-excel:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const body = (await request.json().catch(() => null)) as {
    anexos?: AnexoGenerado[];
    proceso?: ProcesoResumen;
  } | null;

  if (!body?.anexos || !body?.proceso) {
    return Response.json({ error: "Faltan los anexos o el proceso." }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urban Procura";
  workbook.created = new Date();

  const resumen = workbook.addWorksheet("Anexos");
  resumen.columns = [
    { header: "N°", key: "numero", width: 6 },
    { header: "Anexo", key: "titulo", width: 60 },
    { header: "¿Aplica?", key: "aplica", width: 12 },
    { header: "Motivo si no aplica", key: "motivo", width: 50 },
  ];
  resumen.getRow(1).font = { bold: true };
  for (const anexo of body.anexos) {
    resumen.addRow({
      numero: anexo.numero,
      titulo: anexo.titulo,
      aplica: anexo.aplicable ? "Sí" : "No",
      motivo: anexo.motivoNoAplicable ?? "",
    });
  }
  resumen.insertRow(1, [
    `BORRADOR — REQUIERE REVISIÓN HUMANA — ${body.proceso.objeto} (${body.proceso.entidad})`,
  ]);
  resumen.getRow(1).font = { bold: true, color: { argb: "FFB45309" } };

  for (const anexo of body.anexos) {
    if (!anexo.aplicable || !anexo.tabla) continue;
    const hoja = workbook.addWorksheet(`Anexo ${anexo.numero}`.slice(0, 31));
    hoja.addRow([anexo.titulo]).font = { bold: true, size: 12 };
    hoja.addRow([]);
    const headerRow = hoja.addRow(anexo.tabla.encabezados);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    });
    for (const fila of anexo.tabla.filas) {
      hoja.addRow(fila);
    }
    hoja.columns.forEach((col) => {
      col.width = 22;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const nombreArchivo = `Anexos - ${body.proceso.objeto.slice(0, 60).replace(/[\\/:*?"<>|]/g, "")}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
