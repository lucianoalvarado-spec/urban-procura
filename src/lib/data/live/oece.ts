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

// El OECE bloquea el tráfico de la red de Vercel a nivel de WAF (403 en <600ms,
// confirmado con un endpoint de diagnóstico temporal — ver CLAUDE.md, sección
// "Despliegue"). Ni timeout/región/runtime/User-Agent lo resuelven: hace falta pedir
// estos endpoints desde otra red. Si `OECE_RELAY_URL` está configurada (un Worker de
// Cloudflare que hace de proxy transparente, ver cloudflare-relay/), se usa esa base
// en vez de pegarle directo al OECE — así producción usa el relay y el desarrollo
// local (donde el bloqueo no aplica) sigue funcionando sin necesitarlo.
const OECE_RELAY_URL = process.env.OECE_RELAY_URL;
const OECE_RELAY_TOKEN = process.env.OECE_RELAY_TOKEN;
const BASE_URL = OECE_RELAY_URL
  ? `${OECE_RELAY_URL.replace(/\/$/, "")}/proxy/v1`
  : "https://contratacionesabiertas.oece.gob.pe/api/v1";

function oeceHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (OECE_RELAY_URL && OECE_RELAY_TOKEN) headers["x-relay-token"] = OECE_RELAY_TOKEN;
  return headers;
}

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

interface OceAward {
  date?: string;
  status?: string;
  value?: OceValor;
  suppliers?: OceEntidad[];
  documents?: OceDocumento[];
}

interface OceReleaseDetalle {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  buyer?: OceEntidad;
  tender?: OceTenderDetalle;
  parties?: OceParte[];
  awards?: OceAward[];
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
    // `|| null`, no `?? null`: el OECE publica `amount: 0` literal (confirmado con curl)
    // cuando la entidad no llenó el campo en el SEACE — un proceso real nunca tiene
    // valor referencial genuinamente cero, así que 0 se trata igual que ausente.
    montoReferencial: tender.value?.amount || null,
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
    formato: d.format,
  }));
  const documentosAward = (release.awards ?? []).flatMap((a) =>
    (a.documents ?? []).map((d) => ({
      tipo: TIPO_DOC_LABEL[d.documentType ?? ""] ?? d.title ?? "Documento de buena pro",
      disponible: true,
      url: d.url ?? "",
      formato: d.format,
    }))
  );
  const documentosContrato = (release.contracts ?? []).flatMap((c) =>
    (c.documents ?? []).map((d) => ({
      tipo: TIPO_DOC_LABEL[d.documentType ?? ""] ?? d.title ?? "Contrato",
      disponible: true,
      url: d.url ?? "",
      formato: d.format,
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

  // Cuando ya hay buena pro, el award trae el/los proveedor(es) ganador(es) y el monto
  // adjudicado — si hay más de un award (consorcios, ítems separados) tomamos el de
  // mayor valor como el principal, que es lo que se muestra en Ranking/Historial.
  const awardConGanador = (release.awards ?? [])
    .filter((a) => (a.suppliers ?? []).length > 0)
    .sort((a, b) => (b.value?.amount ?? 0) - (a.value?.amount ?? 0))[0];
  const adjudicacion = awardConGanador
    ? {
        proveedorGanador:
          (awardConGanador.suppliers ?? []).map((s) => s.name).filter(Boolean).join(" / ") ||
          "Proveedor no especificado",
        montoAdjudicado: awardConGanador.value?.amount || null,
      }
    : undefined;

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
    montoReferencial: tender.value?.amount || null,
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
    adjudicacion,
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
      headers: oeceHeaders(),
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
      headers: oeceHeaders(),
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

export interface AdjudicacionResumen {
  procesoId: string;
  entidad: string;
  objeto: string;
  categoria: Categoria;
  tipoProcedimiento: string;
  fecha: string;
  proveedorGanador: string;
  montoAdjudicado: number | null;
  fuenteUrl: string;
}

// Ni Ranking de competidores ni Historial de la entidad tienen un endpoint propio en el
// OECE — se arman pidiendo un lote de candidatos a /search y trayendo el detalle
// (/record/{ocid}) de cada uno, porque solo el detalle expone al proveedor ganador
// (awards[].suppliers). El resumen de /search nunca marca estado "Buena pro otorgada"
// (no trae `tag`, ver resumenAProceso), así que no hay forma de filtrar candidatos de
// antemano — se descartan después de pedir el detalle, quedándonos solo con los que sí
// tienen `adjudicacion`. Acotado a un lote chico porque cada detalle es su propio fetch.
const LIMITE_CANDIDATOS_ADJUDICACION = 20;

async function detallarAdjudicaciones(candidatos: Proceso[]): Promise<AdjudicacionResumen[]> {
  const detalles = await Promise.allSettled(candidatos.map((p) => obtenerProcesoLive(p.id)));
  const resultados: AdjudicacionResumen[] = [];
  for (const settled of detalles) {
    if (settled.status !== "fulfilled" || !settled.value) continue;
    const proceso = settled.value;
    const adjudicacion = proceso.adjudicacion;
    if (!adjudicacion) continue;
    resultados.push({
      procesoId: proceso.id,
      entidad: proceso.entidad,
      objeto: proceso.objeto,
      categoria: proceso.categoria,
      tipoProcedimiento: proceso.tipoProcedimiento,
      fecha:
        proceso.cronograma.find((e) => e.etapa === "Otorgamiento de buena pro")?.fecha ??
        proceso.fechaPublicacion,
      proveedorGanador: adjudicacion.proveedorGanador,
      montoAdjudicado: adjudicacion.montoAdjudicado,
      fuenteUrl: proceso.fuenteUrl ?? "",
    });
  }
  return resultados;
}

export async function rankingCompetidoresLive(
  categoria?: Categoria
): Promise<AdjudicacionResumen[] | null> {
  try {
    const candidatos = await buscarProcesosLive({
      categoria,
      paginateBy: LIMITE_CANDIDATOS_ADJUDICACION,
    });
    if (!candidatos || candidatos.length === 0) return null;
    const resultados = await detallarAdjudicaciones(candidatos);
    return resultados.length > 0 ? resultados : null;
  } catch {
    return null;
  }
}

export async function historialEntidadLive(entidad: string): Promise<AdjudicacionResumen[] | null> {
  try {
    const candidatos = await buscarProcesosLive({
      query: entidad,
      paginateBy: LIMITE_CANDIDATOS_ADJUDICACION,
    });
    if (!candidatos || candidatos.length === 0) return null;
    // `search` es texto libre y puede traer procesos de entidades con nombres
    // parecidos — nos quedamos con los que calzan con el nombre elegido si hay alguno.
    const deLaEntidad = candidatos.filter((p) =>
      p.entidad.toUpperCase().includes(entidad.toUpperCase())
    );
    const resultados = await detallarAdjudicaciones(
      deLaEntidad.length > 0 ? deLaEntidad : candidatos
    );
    return resultados.length > 0 ? resultados : null;
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
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${BASE_URL}/indexCountData?format=json`, {
      headers: oeceHeaders(),
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
function fetchBuyersPage(page: number): Promise<OceBuyersResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  return fetch(`${BASE_URL}/buyers?page=${page}&paginateBy=1000&format=json`, {
    headers: oeceHeaders(),
    signal: controller.signal,
    next: { revalidate: 21600 },
  })
    .then((r) => (r.ok ? (r.json() as Promise<OceBuyersResponse>) : null))
    .finally(() => clearTimeout(timeout));
}

// Catálogo completo de entidades (3,316, en 4 páginas de 1000) — compartido por el
// mapa histórico (obtenerProcesosPorRegionLive) y el mapa activo
// (obtenerProcesosActivosPorRegionLive, ver más abajo), ambos necesitan el mismo cruce
// entidad→departamento y no tiene sentido pedirlo dos veces por separado.
async function fetchTodosBuyers(): Promise<OceBuyerResumen[] | null> {
  const dataPrimera = await fetchBuyersPage(1);
  if (!dataPrimera) return null;
  const totalPaginas = dataPrimera.pagination?.num_pages ?? 1;

  const resto = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, i) => fetchBuyersPage(i + 2))
  );

  return [dataPrimera, ...resto].flatMap((pagina) => pagina?.results ?? []);
}

export async function obtenerProcesosPorRegionLive(): Promise<Partial<Record<Region, number>> | null> {
  try {
    const buyers = await fetchTodosBuyers();
    if (!buyers) return null;

    const acumulado: Partial<Record<Region, number>> = {};
    for (const buyer of buyers) {
      const region = mapDepartamento(buyer.party?.address?.department);
      if (region === "Otro") continue;
      acumulado[region] = (acumulado[region] ?? 0) + (buyer.total_processes ?? 0);
    }
    return Object.keys(acumulado).length > 0 ? acumulado : null;
  } catch {
    return null;
  }
}

function normalizarNombreEntidad(nombre: string): string {
  return quitarAcentos(nombre).trim().toUpperCase();
}

function fetchMuestraActivaPage(page: number, anio: number): Promise<OceBusquedaResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const url = new URL(`${BASE_URL}/search`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("paginateBy", "250");
  url.searchParams.set("format", "json");
  url.searchParams.set("year", String(anio));
  return fetch(url.toString(), {
    headers: oeceHeaders(),
    signal: controller.signal,
    next: { revalidate: 21600 },
  })
    .then((r) => (r.ok ? (r.json() as Promise<OceBusquedaResponse>) : null))
    .finally(() => clearTimeout(timeout));
}

// "Activo" = procesos convocados recientemente, no "con plazo genuinamente abierto
// ahora mismo" (esa alternativa no es viable barata: tender.status casi nunca viene
// poblado en /search — ver spec docs/superpowers/specs/2026-07-29-...). No existe un
// endpoint que dé "procesos por región de este año" directo, así que tomamos una
// muestra de /search?year=<actual> (20 páginas × paginateBy=250 = 5,000 de un total de
// ~42,000 ese año). IMPORTANTE: verificado contra la API real que el OECE devuelve los
// resultados en orden fijo (aparentemente recency-first dentro del índice), así que
// estas 20 páginas cubren en la práctica solo las ~3 semanas más recientes de
// convocatorias, NO una muestra representativa del año completo — cada región queda
// aprox. en 1/8 de su cifra anual real. Por eso el mapa se rotula como "actividad
// reciente", no "este año" (ver peru-map-card.tsx). Aumentar la cobertura a año
// completo requeriría ~43 páginas y excede el presupuesto de tiempo — fuera de alcance.
// paginateBy=250 (en vez de 1000) mantiene cada página bajo el límite de 2MB de la
// fetch cache de Next.js, para que `revalidate: 21600` sí aplique (con 1000 cada página
// pesa ~2.64MB y Next descarta el cacheo en silencio) — mismo total de muestra (5,000),
// solo cambia la granularidad de página. Cruzamos el nombre de la entidad compradora de
// cada resultado contra el mismo catálogo de /buyers que ya usa el mapa histórico
// (fetchTodosBuyers). Es una muestra, no el conteo exacto — se documenta en el
// tooltip/subtítulo del mapa.
const PAGINAS_MUESTRA_ACTIVA = 20;

export async function obtenerProcesosActivosPorRegionLive(): Promise<
  Partial<Record<Region, number>> | null
> {
  try {
    const anio = new Date().getFullYear();
    const [buyers, ...paginasMuestra] = await Promise.all([
      fetchTodosBuyers(),
      ...Array.from({ length: PAGINAS_MUESTRA_ACTIVA }, (_, i) =>
        fetchMuestraActivaPage(i + 1, anio)
      ),
    ]);
    if (!buyers) return null;
    // Nunca renderizar números "seguros" construidos con solo una parte de la muestra
    // intentada — si 1-4 de las PAGINAS_MUESTRA_ACTIVA fallaron (timeout/no-ok, más
    // probable en producción por pasar por el relay local/Cloudflare Tunnel), es
    // preferible no mostrar el mapa a mostrar un conteo confiablemente incompleto sin
    // avisar (mismo principio de "nunca degradar en silencio" que fetchTodosBuyers).
    if (paginasMuestra.some((pagina) => pagina === null)) return null;

    const regionPorEntidad = new Map<string, Region>();
    for (const buyer of buyers) {
      const nombre = buyer.party?.name;
      const region = mapDepartamento(buyer.party?.address?.department);
      if (!nombre || region === "Otro") continue;
      regionPorEntidad.set(normalizarNombreEntidad(nombre), region);
    }

    const acumulado: Partial<Record<Region, number>> = {};
    for (const pagina of paginasMuestra) {
      for (const item of pagina?.results ?? []) {
        const nombreEntidad =
          item.compiledRelease?.buyer?.name || item.compiledRelease?.tender?.procuringEntity?.name;
        if (!nombreEntidad) continue;
        const region = regionPorEntidad.get(normalizarNombreEntidad(nombreEntidad));
        if (!region) continue;
        acumulado[region] = (acumulado[region] ?? 0) + 1;
      }
    }
    return Object.keys(acumulado).length > 0 ? acumulado : null;
  } catch {
    return null;
  }
}
