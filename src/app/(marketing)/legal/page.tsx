import Link from "next/link";

export const metadata = {
  title: "Aviso legal y fuentes de datos — Urban Procura",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-700">
        ← Volver al inicio
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
        Aviso legal y fuentes de datos
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Esta página resume, en un solo lugar, qué datos de Urban Procura son reales y de qué
        fuente salen, cuáles son de muestra, y qué límites nos pusimos al integrar cada fuente
        externa. No reemplaza asesoría legal — es una descripción técnica y honesta de cómo
        funciona la plataforma.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Urban Procura no es una entidad oficial
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Urban Procura es un proyecto independiente. No está afiliado, respaldado ni operado por
          el OSCE, el OECE, el SEACE, el Estado peruano ni ninguna entidad pública. Cuando
          mostramos datos de esas fuentes, son una copia de lo que esas instituciones publicaron
          — nosotros no verificamos ni garantizamos su exactitud, y no somos responsables de
          decisiones tomadas a partir de ellos.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Qué es real y qué es de muestra, módulo por módulo
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
          <li>
            <strong className="text-[var(--foreground)]">Explorador y Ficha del proceso:</strong>{" "}
            procesos reales del Portal de Contrataciones Abiertas del OECE, en vivo. Si la fuente
            no responde, la pantalla lo indica visiblemente y muestra procesos de muestra en su
            lugar — nunca se degrada en silencio.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Registro y Perfil (búsqueda por RUC):</strong>{" "}
            consulta en vivo el Registro Nacional de Proveedores (RNP) del OSCE y el historial de
            contratos del SEACE. Mismo principio: si falla, se ofrece un formulario manual y se
            avisa.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">
              Perfil (el resto), preferencias y CRM de oportunidades:
            </strong>{" "}
            100% datos de muestra o ingresados por ti, guardados solo en tu navegador
            (localStorage). No hay backend ni base de datos todavía — no son multiusuario ni se
            comparten con nadie.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Verificación de correo en /registro:</strong>{" "}
            simulada. No se envía ningún correo real; el código se muestra en pantalla y está
            rotulado como modo demo.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Fuentes externas que usamos
        </h2>

        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <p>
            <strong className="text-[var(--foreground)]">
              Portal de Contrataciones Abiertas del OECE
            </strong>{" "}
            (
            <a
              href="https://contratacionesabiertas.oece.gob.pe/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              contratacionesabiertas.oece.gob.pe
            </a>
            ): API pública, documentada y oficial, publicada bajo el estándar OCDS (Open
            Contracting Data Standard) con licencia{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Creative Commons Atribución 4.0 (CC BY 4.0)
            </a>
            , que exige incluir un enlace a la fuente original al reutilizar los datos — por eso
            cada proceso muestra un enlace directo a su ficha en el portal del OECE. Su{" "}
            <a
              href="https://contratacionesabiertas.oece.gob.pe/downloads/politica_publicacion.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              política de publicación
            </a>{" "}
            confirma actualizaciones diarias directo desde el SEACE.
          </p>

          <p>
            <strong className="text-[var(--foreground)]">
              Registro Nacional de Proveedores (RNP) del OSCE
            </strong>{" "}
            y el historial de contratos asociado: a diferencia del Portal de Contrataciones
            Abiertas, este es un endpoint que no está documentado públicamente para integraciones
            de terceros — lo identificamos inspeccionando el código del buscador oficial del OSCE
            (
            <a
              href="https://apps.osce.gob.pe/perfilprov-ui/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              apps.osce.gob.pe/perfilprov-ui
            </a>
            ), que consulta ese mismo endpoint para mostrar la misma información. Responde sin
            autenticación ni captcha, y no está bloqueado por el <code>robots.txt</code> de ese
            dominio. Aun así, es una zona gris legal: no tenemos un convenio ni autorización
            directa del OSCE/OECE para este uso. Si la fuente cambiara sus condiciones de acceso o
            nos pidieran dejar de usarlo, lo haríamos de inmediato.
          </p>

          <p>
            <strong className="text-[var(--foreground)]">SUNAT:</strong> no integrada. La
            plataforma no consulta, automatiza ni intenta evadir el captcha de SUNAT bajo ninguna
            circunstancia — es una autoridad tributaria y esa barrera es deliberada, no un límite
            técnico por resolver. Si en el futuro se necesitara ese dato, se haría mediante un
            proveedor externo con licencia, nunca scrapeando el sitio de SUNAT directamente.
          </p>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Verificamos <code>robots.txt</code> antes de cada integración
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Antes de conectar cualquier fuente, revisamos su <code>robots.txt</code>: los dominios
          del RNP y del historial de contratos (<code>apps.osce.gob.pe</code>,{" "}
          <code>eap.oece.gob.pe</code>) solo restringen las rutas de cuaderno de obra digital, que
          no usamos. El Portal de Contrataciones Abiertas es una API pública documentada, así que
          esa restricción no aplica de la misma forma — es un servicio pensado explícitamente para
          consumo programático de terceros, con su propia política de publicación como marco de
          uso.
        </p>
      </section>

      <p className="mt-10 text-xs text-slate-400">
        ¿Preguntas sobre esta página o sobre cómo usamos algún dato en particular? Escríbenos
        desde la sección de contacto de tu plan, o revisa el código: Urban Procura documenta cada
        integración de datos abiertamente.
      </p>
    </div>
  );
}
