import { PlanBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import type { PlanComercial } from "@/lib/data/types";

export function Proximamente({
  titulo,
  pregunta,
  plan,
  descripcion,
}: {
  titulo: string;
  pregunta: string;
  plan: PlanComercial;
  descripcion: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{titulo}</h1>
        <PlanBadge plan={plan} />
      </div>
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm font-medium text-[var(--brand-700)]">{pregunta}</p>
          <p className="text-sm leading-relaxed text-slate-600">{descripcion}</p>
          <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-slate-500">
            Este módulo todavía no está construido. Está en el mapa de Urban Procura y se
            desarrollará en una próxima iteración.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
