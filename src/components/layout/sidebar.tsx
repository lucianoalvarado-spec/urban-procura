"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, PLAN_LABEL } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 bg-[var(--navy)] md:flex md:flex-col">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="shrink-0">
          <polygon points="13,1 24,7 24,19 13,25 2,19 2,7" stroke="var(--brand-600)" strokeWidth="1.6" />
          <path
            d="M8 13 L11.5 17 L18 8"
            stroke="#F2F4F1"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="min-w-0">
          <p className="font-heading truncate text-sm font-bold tracking-wide text-white">URBAN PROCURA</p>
          <p className="truncate text-[10px] text-[#9FB4C2]">Proveedores del Estado</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.titulo} className="mb-5">
            <p className="font-heading px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#7C93A3]">
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
                        "group flex items-center justify-between gap-2 border-l-2 px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "border-[var(--brand-600)] bg-white/[0.06] font-medium text-white"
                          : "border-transparent text-[#CFE0E8] hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.proximamente ? (
                        <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#9FB4C2]">
                          Próx.
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium text-[#7C93A3]">
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
