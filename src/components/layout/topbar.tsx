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
    <header className="flex h-14 items-center justify-between border-b-[3px] border-[var(--brand-600)] bg-[var(--navy)] px-4 text-[#F2F4F1] md:px-6">
      <div className="flex min-w-0 items-center gap-6">
        <div className="min-w-0">
          <p className="font-heading text-[10px] uppercase tracking-wider text-[#9FB4C2]">Proveedor</p>
          <p className="truncate text-sm font-medium">{proveedor.nombreComercial}</p>
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="font-heading text-[10px] uppercase tracking-wider text-[#9FB4C2]">RUC</p>
          <p className="truncate font-mono text-sm">{proveedor.ruc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[#9FB4C2]">
          Plan
          <select
            value={proveedor.plan}
            onChange={(e) => setPlan(e.target.value as PlanComercial)}
            title="Cambiar de plan (solo para explorar la demo)"
            className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white focus:border-[var(--brand-500)] focus:outline-none"
          >
            {PLANES.map((plan) => (
              <option key={plan} value={plan} className="text-[var(--foreground)]">
                {PLAN_LABEL[plan]}
              </option>
            ))}
          </select>
        </label>
        <Link href="/" className="text-xs font-medium text-[#9FB4C2] hover:text-white">
          Salir
        </Link>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-600)] text-xs font-semibold text-white">
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
