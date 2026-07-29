// Relay local hacia el Portal de Contrataciones Abiertas del OECE.
//
// Por qué existe: el OECE bloquea el tráfico de proveedores cloud conocidos a nivel
// de WAF — confirmado que Vercel (Node/Lambda y Edge) y Cloudflare Workers (con y sin
// Smart Placement) reciben 403 consistentemente, mientras que una IP residencial/de
// oficina normal (esta misma máquina) funciona sin problema. Este servidor corre en
// tu propia PC — sale a internet con tu IP real de Perú — y Cloudflare Tunnel lo
// expone de forma segura para que Vercel pueda llamarlo (ver README.md).
//
// Misma lógica que cloudflare-relay/src/index.js (el Worker, que sirvió para
// diagnosticar pero no para resolverlo): reenvía /proxy/<path> a
// contratacionesabiertas.oece.gob.pe/api/<path>, protegido con un token compartido.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Carga simple de .env (sin dependencias) — RELAY_TOKEN y PORT opcional.
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const linea of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = (match[2] ?? "").trim();
  }
}

const PORT = Number(process.env.PORT) || 8787;
const RELAY_TOKEN = process.env.RELAY_TOKEN;
const OECE_BASE = "https://contratacionesabiertas.oece.gob.pe/api";

if (!RELAY_TOKEN) {
  console.error("Falta RELAY_TOKEN — creá un archivo .env en esta carpeta con:");
  console.error("RELAY_TOKEN=el-mismo-valor-que-vas-a-poner-en-Vercel");
  process.exit(1);
}

// Comparación en tiempo constante — un `!==` directo filtra por temporización cuántos
// caracteres iniciales coinciden, en teoría suficiente para reconstruir el token a
// fuerza bruta. timingSafeEqual exige buffers del mismo largo, así que primero
// descartamos por longitud (ese único bit sí se filtra, pero es aceptable: es mucha
// menos información que filtrar carácter por carácter).
function tokenValido(recibido) {
  if (typeof recibido !== "string" || recibido.length !== RELAY_TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recibido), Buffer.from(RELAY_TOKEN));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (!url.pathname.startsWith("/proxy/")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (!tokenValido(req.headers["x-relay-token"])) {
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }

  const targetPath = url.pathname.slice("/proxy".length);
  const targetUrl = `${OECE_BASE}${targetPath}${url.search}`;

  try {
    const upstream = await fetch(targetUrl, { headers: { Accept: "application/json" } });
    const body = await upstream.text();
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    });
    res.end(body);
    console.log(`${new Date().toISOString()} ${targetPath} -> ${upstream.status}`);
  } catch (err) {
    // El detalle del error se queda en el log local — el caller (Vercel) ya sabe que
    // esta ruta pasa por el relay, no necesita ver el mensaje interno del fetch.
    console.error("Error reenviando al OECE:", err);
    res.writeHead(502);
    res.end(JSON.stringify({ error: "No se pudo conectar con el OECE" }));
  }
});

server.listen(PORT, () => {
  console.log(`Relay local escuchando en http://localhost:${PORT}`);
  console.log(`Prueba: curl -H "x-relay-token: ${RELAY_TOKEN}" http://localhost:${PORT}/proxy/v1/indexCountData?format=json`);
});
