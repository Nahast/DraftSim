import { db } from "@/lib/db";
import { ingestNfl } from "@/lib/ingest";
import { ffcRankings } from "@/sources/ffc";
import { sleeperPlayers } from "@/sources/sleeper";

export const currentSeason = () => Number(process.env.ADP_SEASON ?? new Date().getUTCFullYear());

export const runNflIngest = () =>
  ingestNfl({ players: sleeperPlayers(), rankings: ffcRankings(), db, now: new Date(), season: currentSeason() });
