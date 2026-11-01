import type { Sport } from "@/generated/prisma/enums";

export type Format = "std" | "half" | "ppr";

export type PlayerDTO = {
  externalId: string;
  name: string;
  team: string | null;
  positions: string[];
  status: string | null;
};

export type RankingDTO = {
  name: string;
  team: string | null;
  position: string;
  adp: number;
  teams: number;
  format: Format;
  season: number;
};

export type FetchFn = typeof fetch;

export interface PlayerSource {
  sport: Sport;
  fetchPlayers(): Promise<PlayerDTO[]>;
}

export interface RankingSource {
  sport: Sport;
  fetchRankings(opts: { season: number; teams: number; format: Format }): Promise<RankingDTO[]>;
}
