import { NextRequest } from "next/server";
import type { Categoria } from "@/lib/data/types";

// Segunda parte de la integración RNP/SEACE (ver src/app/api/rnp/route.ts para el
// perfil general). Esta trae el historial de contratos "Publicada en el SEACE" que
// se ve en la Ficha Única del Proveedor de OSCE, con documentos reales (PDF).
//
// Endpoints reales descubiertos igual que el de /api/rnp — extraídos del bundle de
// perfilprov-ui, confirmados server-to-server en esta sesión:
//   GET https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{ruc}/contrataciones?pageSize=&pageNumber=
//   GET https://eap.oece.gob.pe/perfilprov-bus/1.0/contratacion/{codContProv}/ficha
// El segundo trae fecha real del contrato (fecBaseCont), % de consorcio y, cuando la
// entidad los publicó, links directos a los PDF del contrato en eap.oece.gob.pe/.../docs/seace/...
//
// La otra tarjeta de la ficha de OSCE ("Acreditada en el RNP", obras del expprov-bus)
// vive en su propio proxy: src/app/api/rnp/obras/route.ts (ver comentario ahí para el
// contrato de parámetros que faltaba en el primer intento).

export const preferredRegion = "gru1";
export const maxDuration = 30;

const BASE = "https://eap.oece.gob.pe/perfilprov-bus/1.0";
const LIMITE_CONTRATOS = 12;

interface OsceContratoResumen {
  codContProv: string;
  desCatObj2: string | null;
  desContProv: string | null;
  nomEntCont: string | null;
  montoOrigen: number | null;
}

interface OsceContratacionesResponse {
  searchInfo: { hitsAll: number } | null;
  contratacionesT01: OsceContratoResumen[] | null;
}

interface OsceParticipante {
  numRuc: string;
  porcProvCont: number;
}

interface OsceDocumento {
  desDoc: string | null;
  urlDoc: string;
}

interface OsceClaseDocumento {
  nomClaseDoc: string | null;
  docT01s: OsceDocumento[] | null;
}

interface OsceContratoDetalle {
  datosContF01: {
    fecBaseCont: string | null;
    esConsorcio: boolean;
    provContT01s: OsceParticipante[] | null;
  } | null;
  docsContF01: { claseDocF01s: OsceClaseDocumento[] | null } | null;
}

export interface ContratoImportable {
  codContProv: string;
  cliente: string;
  objeto: string;
  categoria: Categoria;
  monto: number;
  fecha: string | null;
  consorcio: boolean;
  porcentajeParticipacion?: number;
  documentos: { nombre: string; url: string }[];
}

export interface ExperienciaOsceResultado {
  disponible: boolean;
  ruc: string;
  total: number;
  contratos: ContratoImportable[];
  mensaje: string;
}

function mapCategoria(desCatObj2: string): Categoria {
  const valor = desCatObj2.toUpperCase();
  if (valor.includes("CONSULTOR")) return "Consultoría de Obras";
  if (valor.includes("OBRA")) return "Obra";
  if (valor.includes("BIEN")) return "Bienes";
  return "Servicios";
}

function esRucValido(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}

export async function GET(request: NextRequest) {
  const ruc = request.nextUrl.searchParams.get("ruc")?.trim() ?? "";

  if (!esRucValido(ruc)) {
    const resultado: ExperienciaOsceResultado = {
      disponible: true,
      ruc,
      total: 0,
      contratos: [],
      mensaje: "El RUC debe tener 11 dígitos.",
    };
    return Response.json(resultado, { status: 400 });
  }

  try {
    const listRes = await fetch(
      `${BASE}/ficha/${ruc}/contrataciones?pageSize=${LIMITE_CONTRATOS}&pageNumber=1`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!listRes.ok) throw new Error(`OSCE respondió ${listRes.status}`);

    const listData = (await listRes.json()) as OsceContratacionesResponse;
    const contratos = listData.contratacionesT01 ?? [];

    const detalles = await Promise.allSettled(
      contratos.map((c) =>
        fetch(`${BASE}/contratacion/${encodeURIComponent(c.codContProv)}/ficha`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }).then((r) => (r.ok ? (r.json() as Promise<OsceContratoDetalle>) : null))
      )
    );

    const importables: ContratoImportable[] = contratos.map((c, i) => {
      const settled = detalles[i];
      const detalle = settled.status === "fulfilled" ? settled.value : null;
      const datos = detalle?.datosContF01 ?? null;
      const participacion = (datos?.provContT01s ?? []).find((p) => p.numRuc === ruc);
      const documentos = (detalle?.docsContF01?.claseDocF01s ?? []).flatMap((clase) =>
        (clase.docT01s ?? []).map((doc) => ({
          nombre: doc.desDoc ?? clase.nomClaseDoc ?? "Documento",
          url: doc.urlDoc,
        }))
      );

      return {
        codContProv: c.codContProv,
        cliente: c.nomEntCont ?? "Entidad no especificada",
        objeto: c.desContProv ?? "Sin descripción",
        categoria: mapCategoria(c.desCatObj2 ?? ""),
        monto: c.montoOrigen ?? 0,
        fecha: datos?.fecBaseCont ?? null,
        consorcio: Boolean(datos?.esConsorcio),
        porcentajeParticipacion: participacion?.porcProvCont,
        documentos,
      };
    });

    const resultado: ExperienciaOsceResultado = {
      disponible: true,
      ruc,
      total: listData.searchInfo?.hitsAll ?? importables.length,
      contratos: importables,
      mensaje:
        importables.length > 0
          ? `Encontramos ${listData.searchInfo?.hitsAll ?? importables.length} contrato(s) publicados en el SEACE.`
          : "No encontramos contratos publicados en el SEACE para este RUC.",
    };
    return Response.json(resultado);
  } catch {
    const resultado: ExperienciaOsceResultado = {
      disponible: false,
      ruc,
      total: 0,
      contratos: [],
      mensaje: "No pudimos conectarnos con el SEACE ahora mismo. Intenta más tarde o agrega tu experiencia manualmente.",
    };
    return Response.json(resultado, { status: 200 });
  }
}
