"use client";

import Link from "next/link";
import { useProveedor } from "@/lib/state/proveedor-context";
import { setPlan } from "@/lib/state/plan-store";
import { PLAN_LABEL } from "@/lib/nav";
import type { PlanComercial } from "@/lib/data/types";

const PLANES: PlanComercial[] = ["free", "basico", "profesional", "premium"];

export function Topbar() {
  const { proveedor } = useProveedor();

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">
          {proveedor.nombreComercial}
        </p>
        <p className="truncate text-xs text-slate-500">RUC {proveedor.ruc}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Plan
          <select
            value={proveedor.plan}
            onChange={(e) => setPlan(e.target.value as PlanComercial)}
            title="Cambiar de plan (solo para explorar la demo)"
            className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
          >
            {PLANES.map((plan) => (
              <option key={plan} value={plan}>
                {PLAN_LABEL[plan]}
              </option>
            ))}
          </select>
        </label>
        <Link href="/" className="text-xs font-medium text-slate-400 hover:text-slate-600">
          Salir
        </Link>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-semibold text-[var(--brand-700)]">
          {proveedor.representanteLegal
            .split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("")}
        </div>
      </div>
    </header>
  );
}
