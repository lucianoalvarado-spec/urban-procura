import { notFound } from "next/navigation";
import { getProceso } from "@/lib/data/provider";
import { FichaClient } from "@/components/ficha/ficha-client";

export const preferredRegion = "gru1";

export default async function FichaProcesoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proceso = await getProceso(id);

  if (!proceso) notFound();

  return <FichaClient proceso={proceso} />;
}
