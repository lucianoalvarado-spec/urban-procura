import Link from "next/link";
import type { PlanComercial } from "@/lib/data/types";
import { PLAN_LABEL } from "@/lib/nav";

export function UpgradeNotice({
  minimo,
  children,
}: {
  minimo: PlanComercial;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-slate-600">
      <p>
        🔒 Disponible desde el plan <strong>{PLAN_LABEL[minimo]}</strong>.{" "}
        {children ?? "Mejora tu plan para desbloquear esta función."}
      </p>
      <Link
        href={`/registro?plan=${minimo}`}
        className="mt-2 inline-block text-xs font-medium text-[var(--brand-600)] hover:underline"
      >
        Mejorar mi plan →
      </Link>
    </div>
  );
}

export function LockedInline({ minimo }: { minimo: PlanComercial }) {
  return (
    <span
      title={`Disponible desde el plan ${PLAN_LABEL[minimo]}`}
      className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-slate-400"
    >
      🔒 {PLAN_LABEL[minimo]}+
    </span>
  );
}
