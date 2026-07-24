import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICULOS_BLOG, obtenerArticulo } from "@/lib/blog/posts";
import { formatFecha } from "@/lib/format";

export function generateStaticParams() {
  return ARTICULOS_BLOG.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articulo = obtenerArticulo(slug);
  return { title: articulo ? `${articulo.titulo} — Urban Procura` : "Urban Procura" };
}

export default async function ArticuloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articulo = obtenerArticulo(slug);
  if (!articulo) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-16 md:px-6">
      <Link href="/blog" className="text-xs font-medium text-slate-500 hover:text-slate-700">
        ← Volver al blog
      </Link>

      <p className="mt-4 text-xs text-slate-400">
        {formatFecha(articulo.fecha)} · {articulo.tiempoLectura} de lectura
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{articulo.titulo}</h1>

      <div className="mt-8 flex flex-col gap-6">
        {articulo.contenido.map((seccion, i) => (
          <div key={i}>
            {seccion.subtitulo && (
              <h2 className="mb-2 text-base font-semibold text-[var(--foreground)]">
                {seccion.subtitulo}
              </h2>
            )}
            <div className="space-y-2">
              {seccion.parrafos.map((p, j) => (
                <p key={j} className="text-sm leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-slate-500">
        ¿Buscas oportunidades reales que calcen con tu empresa?{" "}
        <Link href="/registro" className="font-medium text-[var(--brand-600)] hover:underline">
          Crea tu cuenta gratis
        </Link>{" "}
        y explora procesos reales del SEACE.
      </div>
    </article>
  );
}
