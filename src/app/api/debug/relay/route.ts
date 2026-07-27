// Endpoint de diagnóstico TEMPORAL — igual que /api/debug/oece (ya eliminado), esta
// vez para el relay: el Worker de Cloudflare responde 200 con datos reales cuando se
// lo llama directo con curl, pero la app en producción sigue mostrando datos de
// muestra — esto revela si las env vars llegan a la función y qué responde
// exactamente el relay cuando la app lo llama con su propio código (oeceHeaders()/
// BASE_URL de lib/data/live/oece.ts). Borrar una vez diagnosticado.
export const preferredRegion = "gru1";
export const maxDuration = 30;

export async function GET() {
  const relayUrl = process.env.OECE_RELAY_URL ?? null;
  const relayToken = process.env.OECE_RELAY_TOKEN ?? null;

  const diagnostico: Record<string, unknown> = {
    OECE_RELAY_URL_presente: Boolean(relayUrl),
    OECE_RELAY_URL_valor: relayUrl,
    OECE_RELAY_TOKEN_presente: Boolean(relayToken),
    OECE_RELAY_TOKEN_longitud: relayToken?.length ?? 0,
  };

  if (!relayUrl) {
    return Response.json({ ...diagnostico, error: "OECE_RELAY_URL no está configurada" });
  }

  const base = `${relayUrl.replace(/\/$/, "")}/proxy/v1`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (relayToken) headers["x-relay-token"] = relayToken;

  try {
    const inicio = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${base}/indexCountData?format=json`, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const bodyTexto = await res.text();

    return Response.json({
      ...diagnostico,
      url_llamada: `${base}/indexCountData?format=json`,
      status: res.status,
      ok: res.ok,
      bodyPreview: bodyTexto.slice(0, 300),
      tiempoMs: Date.now() - inicio,
    });
  } catch (err) {
    const error = err as Error;
    return Response.json({
      ...diagnostico,
      url_llamada: `${base}/indexCountData?format=json`,
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? String(err),
    });
  }
}
