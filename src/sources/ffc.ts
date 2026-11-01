import { z } from "zod";
import type { FetchFn, Format, RankingDTO, RankingSource } from "./types";

const FFC_FORMAT: Record<Format, string> = { std: "standard", half: "half-ppr", ppr: "ppr" };

const Row = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  team: z.string().nullish(),
  adp: z.number(),
});
const Body = z.object({
  status: z.literal("Success"),
  meta: z.object({ teams: z.number().int().positive() }).optional(),
  players: z.array(z.unknown()),
});

export function ffcRankings(fetchFn: FetchFn = fetch): RankingSource {
  return {
    sport: "NFL",
    async fetchRankings({ season, teams, format }) {
      const url = `https://fantasyfootballcalculator.com/api/v1/adp/${FFC_FORMAT[format]}?teams=${teams}&year=${season}`;
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`FFC ADP HTTP ${res.status}`);
      const body = Body.parse(await res.json());
      const out: RankingDTO[] = [];
      for (const raw of body.players) {
        const row = Row.safeParse(raw);
        if (!row.success) continue;
        const { name, team, adp, position } = row.data;
        // FFC serves 12-team ADP whatever size is requested, so trust the response.
        out.push({ name, team: team ?? null, position: position === "PK" ? "K" : position, adp, teams: body.meta?.teams ?? teams, format, season });
      }
      return out;
    },
  };
}
