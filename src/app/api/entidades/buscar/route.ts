import { NextRequest } from "next/server";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

// Catálogo real de entidades compradoras del Portal de Contrataciones Abiertas del OECE
// — distinto de `/search` (que lista PROCESOS): este es un directorio de las ~3,316
// entidades registradas (ministerios, programas/organismos adscritos, gobiernos
// regionales, las ~1,874 municipalidades del país, hospitales, universidades, etc.),
// cada una con dirección estructurada y contador de procesos históricos.
//
// GET https://contratacionesabiertas.oece.gob.pe/api/v1/buyers?buyer=&page=&paginateBy=
// El param `buyer` SÍ filtra por texto contra el nombre de la entidad (confirmado con
// curl: `buyer=PROVIAS` → 3 resultados reales, `buyer=SEDAPAL` → 1). Ojo: solo matchea
// el nombre oficial completo, no siglas sueltas que no aparezcan literalmente en él
// (`buyer=PNSR` → 0; hay que buscar "PROGRAMA NACIONAL DE SANEAMIENTO RURAL").
// Otros nombres de param que parecen plausibles (`search`, `q`, `name`, `nombre`) NO
// filtran nada — devuelven el total sin filtrar (3316), a diferencia de `buyer` que sí.

// Igual que /api/procesos/buscar: función serverless propia, necesita su propia región
// y presupuesto de tiempo — no hereda la config de la página que la llama.
export const preferredRegion = "gru1";
export const maxDuration = 30;

// Ver lib/data/live/oece.ts para el porqué del relay: el OECE bloquea el tráfico
// de la red de Vercel a nivel de WAF (confirmado con diagnóstico directo), así que
// en producción esto pasa por un Worker de Cloudflare (cloudflare-relay/) en vez de
// pegarle directo — controlado por OECE_RELAY_URL/OECE_RELAY_TOKEN.
const OECE_RELAY_URL = process.env.OECE_RELAY_URL;
const OECE_RELAY_TOKEN = process.env.OECE_RELAY_TOKEN;
const BASE = OECE_RELAY_URL
  ? `${OECE_RELAY_URL.replace(/\/$/, "")}/proxy/v1`
  : "https://contratacionesabiertas.oece.gob.pe/api/v1";

function oeceHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (OECE_RELAY_URL && OECE_RELAY_TOKEN) headers["x-relay-token"] = OECE_RELAY_TOKEN;
  return headers;
}

interface OceBuyerParty {
  name?: string;
  address?: { department?: string };
}

interface OceBuyerResultado {
  party?: OceBuyerParty;
  total_processes?: number;
}

interface OceBuyersResponse {
  results?: OceBuyerResultado[];
  pagination?: { total_results?: number };
}

export interface EntidadSugerida {
  nombre: string;
  departamento: string | null;
  totalProcesos: number;
}

export interface EntidadesBuscarResultado {
  disponible: boolean;
  total: number;
  entidades: EntidadSugerida[];
}

// Límite generoso: uso normal es tipeo con debounce (varias requests por búsqueda).
const LIMITE = 60;
const VENTANA_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`entidades-buscar:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    const vacio: EntidadesBuscarResultado = { disponible: true, total: 0, entidades: [] };
    return Response.json(vacio);
  }

  try {
    const url = new URL(`${BASE}/buyers`);
    url.searchParams.set("buyer", q);
    url.searchParams.set("page", "1");
    url.searchParams.set("paginateBy", "20");
    url.searchParams.set("format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url.toString(), {
      headers: oeceHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`OECE respondió ${res.status}`);

    const data = (await res.json()) as OceBuyersResponse;
    const entidades: EntidadSugerida[] = (data.results ?? [])
      .map((r) => ({
        nombre: r.party?.name?.trim() ?? "",
        departamento: r.party?.address?.department ?? null,
        totalProcesos: r.total_processes ?? 0,
      }))
      .filter((e) => e.nombre.length > 0);

    const resultado: EntidadesBuscarResultado = {
      disponible: true,
      total: data.pagination?.total_results ?? entidades.length,
      entidades,
    };
    return Response.json(resultado);
  } catch {
    const resultado: EntidadesBuscarResultado = { disponible: false, total: 0, entidades: [] };
    return Response.json(resultado, { status: 200 });
  }
}
