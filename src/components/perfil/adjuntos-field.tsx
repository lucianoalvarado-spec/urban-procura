"use client";

import { useRef, useState } from "react";
import type { DocumentoAdjunto } from "@/lib/data/types";
import { generarId } from "@/lib/id";

const TAMANO_MAXIMO = 3 * 1024 * 1024; // 3 MB — localStorage no da para más por archivo

function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdjuntosField({
  label = "Documentos adjuntos",
  documentos,
  onChange,
  accept,
  maxArchivos,
}: {
  label?: string;
  documentos: DocumentoAdjunto[];
  onChange: (documentos: DocumentoAdjunto[]) => void;
  accept?: string;
  maxArchivos?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const limiteAlcanzado = maxArchivos !== undefined && documentos.length >= maxArchivos;

  const adjuntar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const nuevos: DocumentoAdjunto[] = [];
    const espacioDisponible =
      maxArchivos !== undefined ? Math.max(0, maxArchivos - documentos.length) : Infinity;
    for (const file of Array.from(files)) {
      if (nuevos.length >= espacioDisponible) {
        setError(`Solo se permite${maxArchivos === 1 ? " 1 archivo" : `n ${maxArchivos} archivos`} — "${file.name}" no se adjuntó.`);
        break;
      }
      if (file.size > TAMANO_MAXIMO) {
        setError(`"${file.name}" pesa más de 3 MB — no se adjuntó.`);
        continue;
      }
      const dataUrl = await leerComoDataUrl(file);
      nuevos.push({
        id: generarId("adj"),
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        dataUrl,
      });
    }
    if (nuevos.length > 0) onChange([...documentos, ...nuevos]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const eliminar = (id: string) => {
    onChange(documentos.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={limiteAlcanzado}
          title={limiteAlcanzado ? `Ya adjuntaste el máximo de ${maxArchivos} archivo${maxArchivos === 1 ? "" : "s"} — eliminá el actual para cambiarlo` : undefined}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Adjuntar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={maxArchivos === undefined || maxArchivos > 1}
          accept={accept}
          aria-label={label}
          className="hidden"
          onChange={(e) => adjuntar(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {documentos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {documentos.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
            >
              <a
                href={doc.dataUrl}
                download={doc.nombre}
                className="min-w-0 truncate text-[var(--brand-600)] hover:underline"
              >
                {doc.nombre}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-slate-400">{formatTamano(doc.tamano)}</span>
                <button
                  type="button"
                  onClick={() => eliminar(doc.id)}
                  className="font-medium text-slate-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
