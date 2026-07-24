"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, PLAN_LABEL } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-600)] text-sm font-bold text-white">
          UP
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Urban Procura</p>
          <p className="text-[11px] leading-tight text-slate-500">Modo demo</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.titulo} className="mb-5">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.titulo}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-[var(--brand-50)] font-medium text-[var(--brand-700)]"
                          : "text-slate-600 hover:bg-[var(--surface-muted)]"
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.proximamente ? (
                        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          Próx.
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium text-slate-400">
                          {PLAN_LABEL[item.plan]}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
