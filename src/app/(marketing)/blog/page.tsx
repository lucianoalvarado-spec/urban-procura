import Link from "next/link";
import { ARTICULOS_BLOG } from "@/lib/blog/posts";
import { formatFecha } from "@/lib/format";

export const metadata = {
  title: "Blog — Urban Procura",
};

export default function BlogPage() {
  const articulos = [...ARTICULOS_BLOG].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Blog</h1>
      <p className="mt-2 text-sm text-slate-500">
        Guías prácticas sobre contrataciones públicas en Perú: RNP, SEACE, y cómo decidir en qué
        procesos participar.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {articulos.map((articulo) => (
          <Link
            key={articulo.slug}
            href={`/blog/${articulo.slug}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:bg-[var(--surface-muted)]"
          >
            <p className="text-xs text-slate-400">
              {formatFecha(articulo.fecha)} · {articulo.tiempoLectura} de lectura
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
              {articulo.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{articulo.resumen}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
