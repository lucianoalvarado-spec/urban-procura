// Endpoint de diagnóstico TEMPORAL — no forma parte del producto. Se agregó para poder
// ver desde afuera el error real que las funciones de Vercel reciben al intentar
// conectarse al OECE (timeout, DNS, conexión rechazada, 403 del WAF, etc.), porque
// esta sesión de Claude Code no tiene acceso a los Function/Runtime Logs de Vercel.
// Ver la nota en CLAUDE.md ("Despliegue") — borrar esta ruta una vez diagnosticado.
// Prueba: el runtime "edge" de Vercel corre sobre una red distinta a las funciones
// serverless normales (Node/AWS Lambda, región iad1 confirmada por este mismo endpoint)
// — si el bloqueo del OECE es por rango de IP de AWS, edge podría no estar bloqueado.
export const runtime = "edge";
export const preferredRegion = "gru1";
export const maxDuration = 30;

const URL_OECE = "https://contratacionesabiertas.oece.gob.pe/api/v1/indexCountData?format=json";

export async function GET() {
  const inicio = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(URL_OECE, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    const bodyTexto = await res.text();

    return Response.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyPreview: bodyTexto.slice(0, 500),
      tiempoMs: Date.now() - inicio,
      region: process.env.VERCEL_REGION ?? null,
    });
  } catch (err) {
    const error = err as Error;
    return Response.json(
      {
        ok: false,
        errorName: error?.name ?? null,
        errorMessage: error?.message ?? String(err),
        errorCause: error?.cause ? String(error.cause) : null,
        tiempoMs: Date.now() - inicio,
        region: process.env.VERCEL_REGION ?? null,
      },
      { status: 200 }
    );
  }
}
