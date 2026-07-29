"use client";

import { useEffect, useState } from "react";
import type { Proceso } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";

// Buscador reutilizable de procesos contra la búsqueda en vivo del OECE
// (/api/procesos/buscar) — usado por Comparador, Análisis de bases con IA y
// Generación de ofertas para elegir un proceso puntual sin depender del lote fijo
// que trae cada página al cargar.
export function ProcesoSearchBox({
  onSelect,
  excludeIds = [],
  placeholder = "Buscar por objeto, entidad o descripción — ej. PROVIAS, SEDAPAL",
}: {
  onSelect: (proceso: Proceso) => void;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Proceso[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResultados(null);
      setFallo(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const timeout = setTimeout(() => {
      fetch(`/api/procesos/buscar?search=${encodeURIComponent(q)}&paginateBy=20`)
        .then((r) => r.json())
        .then((data: { disponible: boolean; procesos: Proceso[] }) => {
          if (cancelado) return;
          setResultados(data.disponible ? data.procesos : []);
          setFallo(!data.disponible);
        })
        .catch(() => {
          if (cancelado) return;
          setResultados([]);
          setFallo(true);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(timeout);
      setBuscando(false);
    };
  }, [query]);

  const visibles = (resultados ?? []).filter((p) => !excludeIds.includes(p.id));
  const mostrarPanel = query.trim().length >= 3;

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
      />
      {mostrarPanel && (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {buscando && <p className="px-3 py-2 text-xs text-slate-400">Buscando…</p>}
          {!buscando && fallo && (
            <p className="px-3 py-2 text-xs text-amber-700">
              No pudimos conectarnos con el Portal de Contrataciones Abiertas del OECE ahora mismo.
            </p>
          )}
          {!buscando && !fallo && visibles.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados para &quot;{query}&quot;.</p>
          )}
          {!buscando &&
            visibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="block w-full border-b border-[var(--border)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--surface-muted)]"
              >
                <p className="line-clamp-1 text-sm font-medium text-[var(--foreground)]">{p.objeto}</p>
                <p className="text-xs text-slate-400">
                  {p.entidad} · {formatMonto(p.montoReferencial)}
                </p>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
