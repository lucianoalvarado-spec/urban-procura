"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/cn";

const PRINCIPALES = NAV_GROUPS[0].items;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 md:hidden">
      {PRINCIPALES.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-[var(--brand-600)] text-white"
                : "bg-[var(--surface-muted)] text-slate-600"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
