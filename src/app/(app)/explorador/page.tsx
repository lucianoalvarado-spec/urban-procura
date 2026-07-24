import { listEntidades, listProcesos, listRegiones } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

export default async function ExploradorPage() {
  const [procesos, entidades, regiones] = await Promise.all([
    listProcesos(),
    Promise.resolve(listEntidades()),
    Promise.resolve(listRegiones()),
  ]);

  return <ExploradorClient procesos={procesos} entidades={entidades} regiones={regiones} />;
}
