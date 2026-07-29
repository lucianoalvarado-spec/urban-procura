import { NextRequest } from "next/server";
import type { Categoria } from "@/lib/data/types";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";
import { esRucValido } from "@/lib/validation";

// Tercera parte de la integración RNP/SEACE (ver src/app/api/rnp/route.ts para el
// perfil general y src/app/api/rnp/experiencia/route.ts para los contratos "Publicada
// en el SEACE"). Esta trae la tarjeta que en la Ficha Única del Proveedor de OSCE se
// llama "Acreditada en el RNP": obras/consultorías de obras que el proveedor acreditó
// directamente ante el RNP (no necesariamente publicadas como proceso en el SEACE).
//
// Documentado en CLAUDE.md como pendiente porque una sesión anterior probó este mismo
// endpoint sin los query params correctos y recibió "Error en plataforma del servicio".
// El fix: el endpoint exige *todos* estos params (extraídos del bundle de perfilprov-ui,
// servicio "expprovService" en el módulo con clave "oO84"), no solo pageSize/pageNumber:
//   GET https://eap.oece.gob.pe/expprov-bus/1.0/experiencia/{ruc}/?q=&pageSize=&pageNumber=&t=&vista=
// donde t=1 → "EJECUTOR DE OBRAS", t=2 → "CONSULTOR DE OBRAS" (los otros valores de
// lscIdTipReg, 3 y 4, corresponden a bienes/servicios y no tienen tarjeta de "obras").
//
// El código de "rnp" que exige el endpoint de documentos NO viene como campo propio en
// la respuesta — hay que extraerlo de `pathName`, que tiene la forma
// "/RNP/Proveedores/{ruc}/{rnp} EJECUTOR DE OBRAS/.../{codObra}". Confirmado con
// RUC 20100114187 (ICCGSA): rnp "00931".
//   GET https://eap.oece.gob.pe/expprov-bus/1.0/experiencia/{ruc}/{rnp}/{codObra}/?ctx=0
// Cada documento trae dos URLs (`url` y `urlEstampa`); `url` responde 404, solo
// `urlEstampa` (el PDF con estampado/sello oficial) descarga de verdad — usar esa.

export const preferredRegion = "gru1";
export const maxDuration = 30;

const BASE = "https://eap.oece.gob.pe/expprov-bus/1.0";
const LIMITE_OBRAS = 12;

interface OsceMiembroConsorcio {
  nomRzsProv: string;
}

interface OsceObraResumen {
  codObra: string;
  nomObra: string | null;
  descObra: string | null;
  nomEntCont: string | null;
  fecContrato: string | null;
  fecCulminacion: string | null;
  mtoContrato: number | null;
  esConsorcio: "SI" | "NO" | null;
  miembrosConsorcio: OsceMiembroConsorcio[] | null;
  pathName: string;
}

interface OsceExperienciaResponse {
  searchInfo: { hitsAll: number | null } | null;
  listaObras: OsceObraResumen[] | null;
}

interface OsceDocumentoObra {
  titulo: string | null;
  nameDoc: string | null;
  url: string;
  urlEstampa: string;
}

interface OsceDocumentosResponse {
  documentos: OsceDocumentoObra[] | null;
}

export interface ObraImportable {
  codObra: string;
  cliente: string;
  objeto: string;
  categoria: Categoria;
  monto: number;
  fecha: string | null;
  consorcio: boolean;
  documentos: { nombre: string; url: string }[];
}

export interface ExperienciaObrasResultado {
  disponible: boolean;
  ruc: string;
  total: number;
  obras: ObraImportable[];
  mensaje: string;
}

function extraerRnp(pathName: string, ruc: string): string | null {
  const m = pathName.match(new RegExp(`^/RNP/Proveedores/${ruc}/(\\d+)\\s`));
  return m ? m[1] : null;
}

async function buscarPorTipo(ruc: string, t: 1 | 2): Promise<{ hits: number; obras: OsceObraResumen[] }> {
  const res = await fetch(
    `${BASE}/experiencia/${ruc}/?q=&pageSize=${LIMITE_OBRAS}&pageNumber=1&t=${t}&vista=1`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`OSCE respondió ${res.status}`);
  const data = (await res.json()) as OsceExperienciaResponse;
  return { hits: data.searchInfo?.hitsAll ?? 0, obras: data.listaObras ?? [] };
}

// Cada request acá dispara 2 búsquedas + hasta LIMITE_OBRAS*2 fetches de detalle en
// paralelo al OSCE, el mayor factor de amplificación de las tres rutas de RNP.
const LIMITE = 10;
const VENTANA_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`rnp-obras:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const ruc = request.nextUrl.searchParams.get("ruc")?.trim() ?? "";

  if (!esRucValido(ruc)) {
    const resultado: ExperienciaObrasResultado = {
      disponible: true,
      ruc,
      total: 0,
      obras: [],
      mensaje: "El RUC debe tener 11 dígitos.",
    };
    return Response.json(resultado, { status: 400 });
  }

  try {
    const [ejecutor, consultor] = await Promise.all([
      buscarPorTipo(ruc, 1),
      buscarPorTipo(ruc, 2),
    ]);

    const combinadas = [
      ...ejecutor.obras.map((o) => ({ obra: o, categoria: "Obra" as Categoria })),
      ...consultor.obras.map((o) => ({ obra: o, categoria: "Consultoría de Obras" as Categoria })),
    ].slice(0, LIMITE_OBRAS);

    const detalles = await Promise.allSettled(
      combinadas.map(({ obra }) => {
        const rnp = extraerRnp(obra.pathName, ruc);
        if (!rnp) return Promise.resolve(null);
        return fetch(
          `${BASE}/experiencia/${ruc}/${rnp}/${encodeURIComponent(obra.codObra)}/?ctx=0`,
          { headers: { Accept: "application/json" }, cache: "no-store" }
        ).then((r) => (r.ok ? (r.json() as Promise<OsceDocumentosResponse>) : null));
      })
    );

    const importables: ObraImportable[] = combinadas.map(({ obra, categoria }, i) => {
      const settled = detalles[i];
      const detalle = settled.status === "fulfilled" ? settled.value : null;
      const documentos = (detalle?.documentos ?? []).map((doc) => ({
        nombre: doc.titulo ?? doc.nameDoc ?? "Documento",
        url: doc.urlEstampa,
      }));

      const consorcio = obra.esConsorcio === "SI";
      const miembros = obra.miembrosConsorcio ?? [];
      const objeto =
        consorcio && miembros.length > 0
          ? `${obra.descObra ?? obra.nomObra ?? "Sin descripción"} (Consorcio: ${miembros
              .map((m) => m.nomRzsProv)
              .join(", ")})`
          : obra.descObra ?? obra.nomObra ?? "Sin descripción";

      return {
        codObra: obra.codObra,
        cliente: obra.nomEntCont ?? "Entidad no especificada",
        objeto,
        categoria,
        monto: obra.mtoContrato ?? 0,
        fecha: obra.fecContrato ?? obra.fecCulminacion ?? null,
        consorcio,
        documentos,
      };
    });

    const total = (ejecutor.hits ?? 0) + (consultor.hits ?? 0);
    const resultado: ExperienciaObrasResultado = {
      disponible: true,
      ruc,
      total,
      obras: importables,
      mensaje:
        importables.length > 0
          ? `Encontramos ${total} obra(s) acreditada(s) en el RNP.`
          : "No encontramos obras acreditadas en el RNP para este RUC.",
    };
    return Response.json(resultado);
  } catch {
    const resultado: ExperienciaObrasResultado = {
      disponible: false,
      ruc,
      total: 0,
      obras: [],
      mensaje: "No pudimos conectarnos con el RNP ahora mismo. Intenta más tarde o agrega tu experiencia manualmente.",
    };
    return Response.json(resultado, { status: 200 });
  }
}
