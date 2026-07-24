import Link from "next/link";
import { LibroReclamacionesForm } from "@/components/marketing/libro-reclamaciones-form";

export const metadata = {
  title: "Libro de Reclamaciones — Urban Procura",
};

export default function LibroReclamacionesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
      <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-700">
        ← Volver al inicio
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Libro de Reclamaciones</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Conforme a la normativa de protección al consumidor, este establecimiento cuenta con un
        Libro de Reclamaciones a tu disposición. Aquí puedes registrar un{" "}
        <strong>reclamo</strong> (disconformidad con un producto o servicio) o una{" "}
        <strong>queja</strong> (malestar respecto a la atención recibida) sobre Urban Procura.
      </p>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs leading-relaxed text-slate-600">
        <p className="font-medium text-slate-700">Datos del proveedor</p>
        <p className="mt-1">
          Urban Procura · Plataforma de demostración para proveedores del Estado peruano. No
          contamos con RUC ni domicilio legal registrado todavía — esta plataforma está en fase de
          demostración (ver{" "}
          <Link href="/legal" className="underline">
            aviso legal
          </Link>
          ).
        </p>
        <p className="mt-2">
          El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a treinta (30)
          días calendario. La formulación de un reclamo o queja no impide acudir a otras vías de
          solución de controversias, ni es requisito previo para interponer una denuncia ante el
          INDECOPI.
        </p>
      </div>

      <div className="mt-8">
        <LibroReclamacionesForm />
      </div>
    </div>
  );
}
