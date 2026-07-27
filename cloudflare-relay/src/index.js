// Relay transparente hacia el Portal de Contrataciones Abiertas del OECE.
//
// Por qué existe: las funciones serverless de Vercel (probado en Node/Lambda y en
// Edge Runtime, con distintas regiones y con User-Agent de navegador real) reciben
// un 403 Forbidden en <600ms de contratacionesabiertas.oece.gob.pe — confirmado con
// un endpoint de diagnóstico temporal que devolvía el error crudo en vez de
// tragárselo. El cuerpo de esa respuesta (plantilla sin resolver, sin headers de
// aplicación) es la firma de un bloqueo a nivel de WAF/API Gateway, no un timeout ni
// un bug de código — el bloqueo es específico de la red de Vercel (o de su ASN),
// porque el mismo fetch funciona sin problema desde una IP residencial/oficina
// normal y desde la infraestructura de Anthropic. Cloudflare Workers corre en una
// red completamente distinta (no AWS Lambda, no la red de Vercel), así que este
// relay solo necesita reenviar la petición desde ahí.
//
// Uso: GET https://<este-worker>.workers.dev/proxy/v1/search?search=PROVIAS
//      reenvía a https://contratacionesabiertas.oece.gob.pe/api/v1/search?search=PROVIAS
//
// Protegido con un token compartido (header x-relay-token) para que no quede como
// un proxy abierto que cualquiera pueda usar para pegarle al OECE en nuestro nombre.

const OECE_BASE = "https://contratacionesabiertas.oece.gob.pe/api";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok");
    }

    if (!url.pathname.startsWith("/proxy/")) {
      return new Response("Not found", { status: 404 });
    }

    if (!env.RELAY_TOKEN || request.headers.get("x-relay-token") !== env.RELAY_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    const targetPath = url.pathname.slice("/proxy".length);
    const targetUrl = `${OECE_BASE}${targetPath}${url.search}`;

    const upstream = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  },
};
