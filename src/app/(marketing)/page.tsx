import Link from "next/link";
import { PLANES } from "@/lib/plan";
import { obtenerEstadisticas } from "@/lib/data/provider";

const FEATURES = [
  {
    titulo: "Explorador inteligente",
    texto: "Filtra por región, entidad, rubro, monto y tipo de procedimiento. Todo lo publicado, en un solo lugar.",
  },
  {
    titulo: "Matching automático",
    texto: "Cada proceso se compara con tu perfil: qué coincide, qué falta, y qué tan bueno es el match — no solo un número.",
  },
  {
    titulo: "Ficha inteligente del proceso",
    texto: "¿Me conviene participar? Requisitos, documentos, cronograma y riesgos, en una sola pantalla.",
  },
  {
    titulo: "CRM de oportunidades",
    texto: "De \"por revisar\" a \"buena pro\": haz seguimiento de cada proceso sin depender de una hoja de cálculo.",
  },
];

export default async function LandingPage() {
  const estadisticas = await obtenerEstadisticas();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center md:px-6 md:py-24">
        <span className="inline-block rounded-full bg-[var(--brand-50)] px-3 py-1 text-xs font-medium text-[var(--brand-700)]">
          Modo demo · datos de muestra
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
          Deja de perseguir licitaciones. Encuentra las que te convienen.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 md:text-lg">
          Urban Procura es el sistema operativo para proveedores del Estado peruano: explora
          procesos, descubre tu compatibilidad y haz seguimiento de tus oportunidades en un solo
          lugar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="w-full rounded-lg bg-[var(--brand-600)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-700)] sm:w-auto"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-slate-700 hover:bg-[var(--surface-muted)] sm:w-auto"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {estadisticas && (
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
          <div className="grid grid-cols-2 gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:grid-cols-4">
            {[
              { valor: estadisticas.procesos, etiqueta: "Procesos de contratación" },
              { valor: estadisticas.entidades, etiqueta: "Entidades compradoras" },
              { valor: estadisticas.proveedores, etiqueta: "Proveedores adjudicados" },
              { valor: estadisticas.contratos, etiqueta: "Contratos" },
            ].map((stat) => (
              <div key={stat.etiqueta} className="text-center">
                <p className="text-3xl font-bold text-[var(--foreground)] md:text-4xl">
                  {stat.valor.toLocaleString("es-PE")}
                </p>
                <p className="mt-1 text-sm text-slate-600">{stat.etiqueta}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Datos en vivo del{" "}
            <a
              href="https://contratacionesabiertas.oece.gob.pe/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Portal de Contrataciones Abiertas del OECE
            </a>{" "}
            (SEACE V2 y V3) en el año {estadisticas.anio}.
          </p>
        </section>
      )}

      <section className="border-y border-[var(--border)] bg-[var(--surface)] py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-center text-xl font-semibold text-[var(--foreground)]">
            No es un buscador de licitaciones. Es tu copiloto para decidir.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.titulo} className="rounded-xl border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{f.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Un plan para cada etapa</h2>
          <p className="mt-2 text-sm text-slate-600">
            Empieza gratis para conocer la plataforma. Sin tarjeta de crédito.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{plan.nombre}</h3>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{plan.precio}</p>
              <p className="mt-2 text-xs text-slate-500">{plan.resumen}</p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-600">
                {plan.incluye.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[var(--brand-600)]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/registro?plan=${plan.id}`}
                className="mt-5 rounded-lg border border-[var(--brand-500)] px-4 py-2 text-center text-xs font-medium text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              >
                {plan.id === "free" ? "Empezar gratis" : `Elegir ${plan.nombre}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--brand-600)] py-14">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-xl font-semibold text-white">¿Listo para dejar de perseguir licitaciones?</h2>
          <Link
            href="/registro"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-[var(--brand-700)] hover:bg-slate-50"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </div>
  );
}
