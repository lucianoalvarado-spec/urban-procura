import type { NivelMatch, PlanComercial } from "@/lib/data/types";
import { PLAN_LABEL } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-heading inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}

const MATCH_STYLES: Record<NivelMatch, string> = {
  alto: "bg-[var(--match-alto-bg)] text-[var(--match-alto)]",
  medio: "bg-[var(--match-medio-bg)] text-[var(--match-medio)]",
  bajo: "bg-[var(--match-bajo-bg)] text-[var(--match-bajo)]",
};

const MATCH_LABEL: Record<NivelMatch, string> = {
  alto: "Match alto",
  medio: "Match medio",
  bajo: "Match bajo",
};

export function MatchBadge({ nivel, score }: { nivel: NivelMatch; score: number }) {
  return (
    <Badge className={MATCH_STYLES[nivel]}>
      {MATCH_LABEL[nivel]} · {score}%
    </Badge>
  );
}

const PLAN_STYLES: Record<PlanComercial, string> = {
  free: "bg-[var(--plan-free-bg)] text-[var(--plan-free)]",
  basico: "bg-[var(--plan-basico-bg)] text-[var(--plan-basico)]",
  profesional: "bg-[var(--plan-profesional-bg)] text-[var(--plan-profesional)]",
  premium: "bg-[var(--plan-premium-bg)] text-[var(--plan-premium)]",
};

export function PlanBadge({ plan }: { plan: PlanComercial }) {
  return <Badge className={PLAN_STYLES[plan]}>{PLAN_LABEL[plan]}</Badge>;
}
