import { listProcesos } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

export default async function ExploradorPage() {
  const procesos = await listProcesos();

  const entidades = Array.from(new Set(procesos.map((p) => p.entidad))).sort();
  const regiones = Array.from(new Set(procesos.map((p) => p.region))).sort();

  return <ExploradorClient procesos={procesos} entidades={entidades} regiones={regiones} />;
}
