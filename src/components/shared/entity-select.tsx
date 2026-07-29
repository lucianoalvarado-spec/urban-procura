"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { EntidadSugerida, EntidadesBuscarResultado } from "@/app/api/entidades/buscar/route";

const LIMITE_SUGERENCIAS_ENTIDAD = 20;

// Busca contra el catálogo completo de ~3,316 entidades registradas en el Portal
// (`/api/entidades/buscar`, proxy de `/api/v1/buyers`) — no contra un lote local de
// procesos, de otro modo entidades sin un proceso reciente en ese lote nunca
// aparecerían como opción aunque existan y publiquen normalmente. Extraído de
// explorador-client.tsx para reusarlo en Ranking, Historial de la entidad, etc.
export function EntitySelect({
  label,
  value,
  onChange,
  placeholder = "Escribe para buscar (ej. ministerio, municipalidad)",
  sugerenciasLocales = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sugerenciasLocales?: string[];
}) {
  const inputId = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [sugerenciasCatalogo, setSugerenciasCatalogo] = useState<EntidadSugerida[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setSugerenciasCatalogo(null);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const timeout = setTimeout(() => {
      fetch(`/api/entidades/buscar?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: EntidadesBuscarResultado) => {
          if (cancelado) return;
          setSugerenciasCatalogo(data.disponible ? data.entidades : []);
        })
        .catch(() => {
          if (!cancelado) setSugerenciasCatalogo([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(timeout);
      setBuscando(false);
    };
  }, [texto]);

  const sugerenciasFallback = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const base = q
      ? sugerenciasLocales.filter((o) => o.toLowerCase().includes(q))
      : sugerenciasLocales;
    return base.slice(0, LIMITE_SUGERENCIAS_ENTIDAD);
  }, [sugerenciasLocales, texto]);

  const elegir = (opcion: string) => {
    onChange(opcion);
    setTexto("");
    setSugerenciasCatalogo(null);
    setAbierto(false);
  };

  const usandoCatalogo = texto.trim().length >= 2;
  const sugerencias = usandoCatalogo ? (sugerenciasCatalogo ?? []) : null;

  return (
    <div className="relative flex flex-col gap-1 text-xs font-medium text-slate-500">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={abierto ? texto : value}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      />
      {abierto && (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-64 w-full min-w-[320px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {sugerenciasLocales.length > 0 && (
            <button
              type="button"
              onMouseDown={() => elegir("")}
              className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-[var(--surface-muted)]"
            >
              Todas
            </button>
          )}
          {!usandoCatalogo &&
            sugerenciasFallback.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onMouseDown={() => elegir(opcion)}
                className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                {opcion}
              </button>
            ))}
          {usandoCatalogo && buscando && (
            <p className="px-3 py-2 text-xs text-slate-400">Buscando en el catálogo del OECE…</p>
          )}
          {usandoCatalogo &&
            !buscando &&
            sugerencias?.map((e) => (
              <button
                key={e.nombre}
                type="button"
                onMouseDown={() => elegir(e.nombre)}
                className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                {e.nombre}
                {e.departamento && (
                  <span className="ml-1 text-xs text-slate-400">({e.departamento})</span>
                )}
              </button>
            ))}
          {!usandoCatalogo && sugerenciasLocales.length > 0 && sugerenciasFallback.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias en el lote actual</p>
          )}
          {usandoCatalogo && !buscando && sugerencias?.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">
              Sin coincidencias en el catálogo del OECE
            </p>
          )}
        </div>
      )}
    </div>
  );
}
