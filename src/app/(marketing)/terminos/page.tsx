import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones — Urban Procura",
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-700">
        ← Volver al inicio
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
        Términos y Condiciones
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última actualización: {new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}.
        Al crear una cuenta en Urban Procura, aceptas estos términos. Léelos junto con nuestro{" "}
        <Link href="/legal" className="underline">
          aviso legal y fuentes de datos
        </Link>
        , que explica en detalle qué datos son reales y de dónde salen.
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">1. Qué es Urban Procura hoy</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Urban Procura es, en esta etapa, una plataforma en fase de demostración. Algunas
          funciones consultan fuentes reales en tiempo real (ver aviso legal); otras — tu perfil
          de proveedor, preferencias y seguimiento de oportunidades — se guardan únicamente en el
          navegador que usas (localStorage), no en un servidor. Eso significa que hoy no hay
          multiusuario real: si cambias de navegador o de equipo, no verás la misma información.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">2. Tu cuenta</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          El registro actual no crea una cuenta autenticada contra un servidor: no validamos tu
          contraseña contra ningún backend todavía. Eres responsable de la veracidad de los datos
          que ingresas (RUC, correo, teléfono). No debes usar la plataforma para fines ilícitos ni
          para intentar vulnerar, sobrecargar o automatizar accesos no autorizados a las fuentes de
          terceros que consultamos (OSCE, OECE, SEACE).
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">3. Planes y precios</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Los precios mostrados en la página de planes son referenciales para esta etapa de
          demostración. Todavía no procesamos cobros reales: elegir un plan de pago no genera un
          cargo a ninguna tarjeta ni medio de pago.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          4. Datos de terceros y responsabilidad
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Los procesos de contratación, montos, plazos y datos del RNP que se muestran provienen
          de fuentes públicas del Estado peruano (SEACE, OSCE, OECE). No verificamos su exactitud
          ni somos responsables de decisiones que tomes basándote en ellos — siempre valida la
          información crítica directamente en la fuente oficial antes de presentar una oferta.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">5. Propiedad intelectual</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          El diseño, marca y código de Urban Procura nos pertenecen. Los datos de contrataciones
          públicas que mostramos son de dominio público o están licenciados por sus publicadores
          (ver aviso legal para el detalle de cada fuente).
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">6. Cambios a estos términos</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Podemos actualizar estos términos a medida que la plataforma evolucione de demo a
          producto con backend real, autenticación y cobros. Cuando eso ocurra, lo indicaremos
          claramente en la plataforma.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">7. Ley aplicable</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Estos términos se rigen por las leyes de la República del Perú. Para reclamos o quejas
          sobre el servicio, puedes usar nuestro{" "}
          <Link href="/libro-reclamaciones" className="underline">
            Libro de Reclamaciones
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
