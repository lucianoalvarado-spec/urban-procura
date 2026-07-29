// Rate limiting simple en memoria, sin dependencias externas (no hay Redis/KV
// configurado todavía). Best-effort a propósito: en Vercel cada instancia serverless
// tiene su propio Map, así que bajo mucho tráfico repartido en instancias distintas
// no es un límite global exacto — pero sí frena el caso común de abuso (un script
// reusando la misma conexión/instancia tibia) sin agregar infraestructura nueva.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Evita que el Map crezca sin límite si entran muchas IPs distintas: limpia entradas
// vencidas cada vez que el mapa supera este tamaño.
const LIMITE_ENTRADAS = 5000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > LIMITE_ENTRADAS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function clienteIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocido";
}

export function respuestaLimiteExcedido(resultado: RateLimitResult): Response {
  const segundos = Math.max(1, Math.ceil((resultado.resetAt - Date.now()) / 1000));
  return Response.json(
    { error: `Demasiadas solicitudes. Intenta de nuevo en ${segundos} segundo(s).` },
    { status: 429, headers: { "Retry-After": String(segundos) } }
  );
}
