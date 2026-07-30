import { obtenerRankingCompetidores, obtenerTopProveedoresHistorico } from "@/lib/data/provider";
import { RankingClient } from "@/components/ranking/ranking-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function RankingPage() {
  const [inicial, topHistorico] = await Promise.all([
    obtenerRankingCompetidores(),
    obtenerTopProveedoresHistorico(),
  ]);

  return <RankingClient inicial={inicial} topHistorico={topHistorico} />;
}
