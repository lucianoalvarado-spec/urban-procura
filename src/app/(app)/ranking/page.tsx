import { obtenerRankingCompetidores } from "@/lib/data/provider";
import { RankingClient } from "@/components/ranking/ranking-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function RankingPage() {
  const inicial = await obtenerRankingCompetidores();

  return <RankingClient inicial={inicial} />;
}
