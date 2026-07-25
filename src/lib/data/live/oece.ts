import type { Categoria, EstadoProceso, Proceso, Region, Subcategoria } from "@/lib/data/types";
import { REGIONES } from "@/lib/data/constants";

// Cliente del Portal de Contrataciones Abiertas del OECE (estándar OCDS).
// API oficial y pública, documentada en https://contratacionesabiertas.oece.gob.pe/api
// (Swagger/OAS 3.0). No requiere autenticación. Confirmado en esta sesión con `curl`
// server-to-server — ver docs/prompt-claude-code-urban-procura.md / CLAUDE.md para el
// detalle de cómo se descubrieron los endpoints reales.
//
// Dos niveles de detalle, a propósito:
// - `/search` (lista, usado por `buscarProcesosLive`): rápido, pensado para listas grandes,
//   pero NO trae región estructurada ni documentos — solo lo esencial para una tarjeta.
// - `/record/{ocid}` (detalle, usado por `obtenerProcesoLive`): trae dirección estructurada
//   (departamento/provincia) y los documentos reales (bases, buena pro, contrato). Por eso
//   la Ficha del proceso pide SIEMPRE el detalle, nunca reutiliza el resumen de la lista.

const BASE_URL = "https://contratacionesabiertas.oece.gob.pe/api/v1";

interface OceValor {
  amount?: number;
  currency?: string;
}

interface OcePeriodo {
  startDate?: string;
  endDate?: string;
}

interface OceEntidad {
  id?: string;
  name?: string;
}

interface OceTenderResumen {
  id?: string;
  title?: string;
  description?: string;
  procuringEntity?: OceEntidad;
  mainProcurementCategory?: string;
  procurementMethodDetails?: string;
  procurementMethod?: string;
  status?: string;
  value?: OceValor;
  tenderPeriod?: OcePeriodo;
  datePublished?: string;
}

interface OceCompiledRelease {
  date?: string;
  ocid?: string;
  buyer?: OceEntidad;
  tender?: OceTenderResumen;
}

interface OceResultadoBusqueda {
  compiledRelease?: OceCompiledRelease;
}

interface OceBusquedaResponse {
  results?: OceResultadoBusqueda[];
  count?: number;
}

interface OceDocumento {
  id?: string;
  title?: string;
  documentType?: string;
  format?: string;
  url?: string;
}

interface OceDireccion {
  department?: string;
  region?: string;
  locality?: string;
}

interface OceTenderDetalle extends OceTenderResumen {
  procuringEntity?: OceEntidad;
  documents?: OceDocumento[];
  /** Único campo de cronograma "real" que expone este API además de tenderPeriod —
   * confirmado inspeccionando el JSON completo del detalle: para SEACE V3,
   * `tenderPeriod.endDate` SIEMPRE es igual a la fecha de convocatoria (no la fecha
   * límite real de nada), así que usarlo como "fecha límite" es directamente incorrecto.
   * `enquiryPeriod` (consultas y observaciones) sí es una ventana real y distinta —
   * no es exactamente "registro de participantes" (que no viene en este API), pero en
   * la práctica ambas etapas arrancan el mismo día y son el mejor proxy disponible de
   * "¿sigue vigente este proceso?". No existe `awardPeriod`/`contractPeriod` ni un
   * array `milestones` en ningún registro probado — confirmado con dos procesos reales
   * distintos (ocds-dgv273-seacev3-1235660 y -1231543), mismo resultado en ambos. */
  enquiryPeriod?: OcePeriodo;
}

interface OceParte {
  id?: string;
  name?: string;
  roles?: string[];
  address?: OceDireccion;
}

interface OceReleaseDetalle {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  buyer?: OceEntidad;
  tender?: OceTenderDetalle;
  parties?: OceParte[];
  awards?: { date?: string; documents?: OceDocumento[] }[];
  contracts?: { dateSigned?: string; documents?: OceDocumento[] }[];
}

interface OceRecordResponse {
  records?: { ocid?: string; compiledRelease?: OceReleaseDetalle }[];
}

const RANGO_DIACRITICOS = new RegExp("[̀-ͯ]", "g");

function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(RANGO_DIACRITICOS, "");
}

function mapDepartamento(raw: string | undefined): Region {
  if (!raw) return "Otro";
  const normalizado = quitarAcentos(raw).trim().toUpperCase();
  const encontrado = REGIONES.find((d) => quitarAcentos(d).toUpperCase() === normalizado);
  return encontrado ?? "Otro";
}

function mapCategoria(cat: string | undefined, texto: string): Categoria {
  const textoNorm = texto.toLowerCase();
  if (cat === "works") {
    return textoNorm.includes("consultor") ? "Consultoría de Obras" : "Obra";
  }
  if (cat === "services") {
    return textoNorm.includes("consultor") && textoNorm.includes("obra")
      ? "Consultoría de Obras"
      : "Servicios";
  }
  return "Bienes";
}

function mapSubcategoria(categoria: Categoria, texto: string): Subcategoria {
  const textoNorm = texto.toLowerCase();
  if (categoria === "Bienes") return "Suministro de bienes";
  if (categoria === "Obra") return "Ejecución de obra";
  if (categoria === "Consultoría de Obras") {
    if (textoNorm.includes("expediente") && textoNorm.includes("supervis"))
      return "Supervisión de expediente técnico";
    if (textoNorm.includes("expediente")) return "Elaboración de expediente técnico";
    if (textoNorm.includes("supervis")) return "Supervisión de obra";
    return "Consultoría de obra";
  }
  return "Servicio general";
}

function mapEstado(tags: string[] | undefined, tenderStatus: string | undefined): EstadoProceso {
  if (tenderStatus === "cancelled" || tenderStatus === "withdrawn") return "Nulo";
  if (tenderStatus === "unsuccessful") return "Desierto";
  const t = tags ?? [];
  if (t.includes("contract") || t.includes("award")) return "Buena pro otorgada";
  if (t.includes("tender")) return "En proceso de selección";
  return "Convocado";
}

function resumenAProceso(item: OceResultadoBusqueda): Proceso | null {
  const cr = item.compiledRelease;
  const tender = cr?.tender;
  if (!cr?.ocid || !tender) return null;

  const objeto = tender.title?.trim() || tender.description?.trim() || "Proceso sin título";
  const descripcion = tender.description?.trim() || objeto;
  const categoria = mapCategoria(tender.mainProcurementCategory, `${objeto} ${descripcion}`);

  return {
    id: cr.ocid,
    entidad: cr.buyer?.name || tender.procuringEntity?.name || "Entidad no especificada",
    region: "Otro", // el resumen de /search no trae dirección estructurada; se completa en la ficha
    objeto,
    descripcion,
    categoria,
    subcategoria: mapSubcategoria(categoria, `${objeto} ${descripcion}`),
    tipoProcedimiento: tender.procurementMethodDetails || "No especificado",
    estado: mapEstado(undefined, tender.status),
    monedaSimbolo: "S/",
    montoReferencial: tender.value?.amount ?? 0,
    fechaPublicacion: tender.datePublished || cr.date || new Date().toISOString(),
    fechaLimitePresentacion:
      tender.tenderPeriod?.endDate || tender.datePublished || cr.date || new Date().toISOString(),
    experienciaMinimaRequerida: 0,
    especialistasRequeridos: [],
    documentos: [],
    cronograma: [],
    riesgos: [],
    fuente: "live",
    fuenteUrl: `https://contratacionesabiertas.oece.gob.pe/proceso/${cr.ocid}`,
  };
}

const TIPO_DOC_LABEL: Record<string, string> = {
  biddingDocuments: "Bases",
  awardNotice: "Documentos de otorgamiento de buena pro",
  contractSigned: "Contrato firmado",
  tenderNotice: "Aviso de convocatoria",
  clarifications: "Consultas y observaciones",
};

function releaseADetalleProceso(release: OceReleaseDetalle): Proceso | null {
  const tender = release.tender;
  const ocid = release.ocid;
  if (!ocid || !tender) return null;

  const objeto = tender.title?.trim() || tender.description?.trim() || "Proceso sin título";
  const descripcion = tender.description?.trim() || objeto;
  const categoria = mapCategoria(tender.mainProcurementCategory, `${objeto} ${descripcion}`);
  const idComprador = release.buyer?.id ?? tender.procuringEntity?.id;
  const parteCompradora =
    (release.parties ?? []).find((p) => p.id === idComprador && p.address) ??
    (release.parties ?? []).find((p) => p.roles?.includes("procuringEntity") && p.address) ??
    (release.parties ?? []).find((p) => p.address);
  const direccion = parteCompradora?.address;

  const documentosTender = (tender.documents ?? []).map((d) => ({
    tipo: TIPO_DOC_LABEL[d.documentType ?? ""] ?? d.title ?? "Documento",
    disponible: true,
    url: d.url ?? "",
  }));
  const documentosAward = (release.awards ?? []).flatMap((a) =>
    (a.documents ?? []).map((d) => ({
      tipo: TIPO_DOC_LABEL[d.documentType ?? ""] ?? d.title ?? "Documento de buena pro",
      disponible: true,
      url: d.url ?? "",
    }))
  );
  const documentosContrato = (release.contracts ?? []).flatMap((c) =>
    (c.documents ?? []).map((d) => ({
      tipo: TIPO_DOC_LABEL[d.documentType ?? ""] ?? d.title ?? "Contrato",
      disponible: true,
      url: d.url ?? "",
    }))
  );

  // `tenderPeriod.endDate` NO se usa como etapa propia: para SEACE V3 siempre coincide
  // con la fecha de convocatoria (ver nota en OceTenderDetalle), listarla aparte solo
  // duplicaría "Publicación de la convocatoria" con una etiqueta engañosa.
  const cronograma = [
    tender.datePublished && { etapa: "Publicación de la convocatoria", fecha: tender.datePublished },
    tender.enquiryPeriod?.startDate && {
      etapa: "Inicio de consultas y observaciones",
      fecha: tender.enquiryPeriod.startDate,
    },
    tender.enquiryPeriod?.endDate && {
      etapa: "Fin de consultas y observaciones",
      fecha: tender.enquiryPeriod.endDate,
    },
    ...(release.awards ?? [])
      .filter((a) => a.date)
      .map((a) => ({ etapa: "Otorgamiento de buena pro", fecha: a.date as string })),
    ...(release.contracts ?? [])
      .filter((c) => c.dateSigned)
      .map((c) => ({ etapa: "Firma de contrato", fecha: c.dateSigned as string })),
  ].filter((e): e is { etapa: string; fecha: string } => Boolean(e));

  return {
    id: ocid,
    entidad: release.buyer?.name || tender.procuringEntity?.name || "Entidad no especificada",
    region: mapDepartamento(direccion?.department),
    objeto,
    descripcion,
    categoria,
    subcategoria: mapSubcategoria(categoria, `${objeto} ${descripcion}`),
    tipoProcedimiento: tender.procurementMethodDetails || "No especificado",
    estado: mapEstado(release.tag, tender.status),
    monedaSimbolo: "S/",
    montoReferencial: tender.value?.amount ?? 0,
    fechaPublicacion: tender.datePublished || release.date || new Date().toISOString(),
    // Preferimos enquiryPeriod.endDate (real, distinto por proceso) sobre
    // tenderPeriod.endDate (siempre = fecha de convocatoria en SEACE V3, así que un
    // proceso recién publicado aparecía "vencido" el mismo día).
    fechaLimitePresentacion:
      tender.enquiryPeriod?.endDate ||
      tender.tenderPeriod?.endDate ||
      tender.datePublished ||
      release.date ||
      new Date().toISOString(),
    experienciaMinimaRequerida: 0,
    especialistasRequeridos: [],
    documentos: [...documentosTender, ...documentosAward, ...documentosContrato],
    cronograma,
    riesgos: [],
    fuente: "live",
    fuenteUrl: `https://contratacionesabiertas.oece.gob.pe/proceso/${ocid}`,
  };
}

export interface BusquedaLiveParams {
  query?: string;
  categoria?: Categoria;
  paginateBy?: number;
  /** Año de convocatoria (param real de /search, confirmado con curl: year=2026 reduce
   * total_results de ~2.7M a los ~41,924 procesos de ese año). Por defecto, el año actual
   * — sin esto, un `search` de texto libre (ej. el nombre de una entidad) compite con dos
   * décadas de historial y Elasticsearch no prioriza por fecha, así que procesos recién
   * convocados quedan enterrados y nunca aparecen dentro del paginateBy. */
  anio?: number;
}

const CATEGORIA_A_OCDS: Record<Categoria, string | undefined> = {
  Bienes: "goods",
  Obra: "works",
  Servicios: "services",
  "Consultoría de Obras": undefined, // no existe como categoría OCDS propia en esta fuente
};

export async function buscarProcesosLive(params: BusquedaLiveParams = {}): Promise<Proceso[] | null> {
  try {
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.set("page", "1");
    url.searchParams.set("paginateBy", String(params.paginateBy ?? 60));
    url.searchParams.set("format", "json");
    url.searchParams.set("year", String(params.anio ?? new Date().getFullYear()));
    if (params.query) url.searchParams.set("search", params.query);
    const catOcds = params.categoria ? CATEGORIA_A_OCDS[params.categoria] : undefined;
    if (catOcds) url.searchParams.set("category", catOcds);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceBusquedaResponse;
    const procesos = (data.results ?? [])
      .map(resumenAProceso)
      .filter((p): p is Proceso => p !== null);

    return procesos.length > 0 ? procesos : null;
  } catch {
    return null;
  }
}

export function esIdProcesoLive(id: string): boolean {
  return id.startsWith("ocds-");
}

export async function obtenerProcesoLive(ocid: string): Promise<Proceso | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${BASE_URL}/record/${encodeURIComponent(ocid)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceRecordResponse;
    const release = data.records?.[0]?.compiledRelease;
    if (!release) return null;

    return releaseADetalleProceso(release);
  } catch {
    return null;
  }
}

interface OceConteoAnio {
  year: number;
  buyers: number;
  suppliers: number;
  ocids: number;
  contracts: number;
}

interface OceIndexCountData {
  years?: OceConteoAnio[];
}

export interface EstadisticasOece {
  anio: number;
  procesos: number;
  entidades: number;
  proveedores: number;
  contratos: number;
}

// Mismo endpoint que alimenta los 4 contadores de la portada del Portal de
// Contrataciones Abiertas (confirmado viendo sus propias peticiones de red):
// GET /api/v1/indexCountData — no acepta filtro por año pese al nombre de sus params;
// siempre devuelve el desglose completo por año en `years[]`, hay que buscar el actual.
export async function obtenerEstadisticasLive(): Promise<EstadisticasOece | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${BASE_URL}/indexCountData?format=json`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceIndexCountData;
    const anioActual = new Date().getFullYear();
    const delAnio = (data.years ?? []).find((y) => y.year === anioActual);
    if (!delAnio) return null;

    return {
      anio: delAnio.year,
      procesos: delAnio.ocids,
      entidades: delAnio.buyers,
      proveedores: delAnio.suppliers,
      contratos: delAnio.contracts,
    };
  } catch {
    return null;
  }
}

interface OceBuyerParty {
  name?: string;
  address?: { department?: string };
}

interface OceBuyerResumen {
  party?: OceBuyerParty;
  total_processes?: number;
}

interface OceBuyersResponse {
  results?: OceBuyerResumen[];
  pagination?: { num_pages?: number };
}

// No existe un endpoint oficial "procesos por región" (revisamos el tablero de
// Procesos de Contratación del propio portal — sus filtros son entidad/año/mes/
// sistema/categoría/procedimiento/etapa, sin región). Lo calculamos nosotros: cada
// entidad en /api/v1/buyers trae `total_processes` (histórico, todos los años) y
// `party.address.department` — sumamos el primero agrupado por el segundo. Confirmado
// con curl que el campo coincide con la columna "Procesos" que el propio portal
// muestra en /entidades para esa misma entidad.
// El catálogo completo son 3,316 entidades; con paginateBy=1000 son solo 4 páginas.
// Es una llamada pesada para pedirla en cada carga del Dashboard, así que se cachea
// (revalidate) en vez de no-store como el resto de este archivo — estos totales no
// cambian de un minuto a otro.
export async function obtenerProcesosPorRegionLive(): Promise<Partial<Record<Region, number>> | null> {
  try {
    const primera = await fetch(`${BASE_URL}/buyers?page=1&paginateBy=1000&format=json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 21600 },
    });
    if (!primera.ok) return null;
    const dataPrimera = (await primera.json()) as OceBuyersResponse;
    const totalPaginas = dataPrimera.pagination?.num_pages ?? 1;

    const resto = await Promise.all(
      Array.from({ length: totalPaginas - 1 }, (_, i) =>
        fetch(`${BASE_URL}/buyers?page=${i + 2}&paginateBy=1000&format=json`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 21600 },
        }).then((r) => (r.ok ? (r.json() as Promise<OceBuyersResponse>) : null))
      )
    );

    const acumulado: Partial<Record<Region, number>> = {};
    for (const pagina of [dataPrimera, ...resto]) {
      for (const buyer of pagina?.results ?? []) {
        const region = mapDepartamento(buyer.party?.address?.department);
        if (region === "Otro") continue;
        acumulado[region] = (acumulado[region] ?? 0) + (buyer.total_processes ?? 0);
      }
    }
    return Object.keys(acumulado).length > 0 ? acumulado : null;
  } catch {
    return null;
  }
}
