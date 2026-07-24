import { listEntidades, listRegiones } from "@/lib/data/provider";
import { PerfilClient } from "@/components/perfil/perfil-client";

export default async function PerfilPage() {
  const entidades = listEntidades();
  const regiones = listRegiones();

  return <PerfilClient entidadesDisponibles={entidades} regionesDisponibles={regiones} />;
}
