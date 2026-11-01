import { db } from "@/lib/db";
import { ingestNfl } from "@/lib/ingest";
import { ffcRankings } from "@/sources/ffc";
import { sleeperPlayers } from "@/sources/sleeper";

export const currentSeason = () => Number(process.env.ADP_SEASON ?? new Date().getUTCFullYear());

// FFC's newest season is often too thin to use (2026: 2 PPR rows), so keep the previous season too.
// /api/players picks, per format, the season with the most rows.
export async function runNflIngest() {
  const season = currentSeason();
  const run = (s: number) =>
    ingestNfl({ players: sleeperPlayers(), rankings: ffcRankings(), db, now: new Date(), season: s });
  const previous = await run(season - 1);
  const latest = await run(season);
  return {
    players: latest.players,
    rankings: previous.rankings + latest.rankings,
    unmatched: previous.unmatched + latest.unmatched,
    errors: [...previous.errors, ...latest.errors],
  };
}
