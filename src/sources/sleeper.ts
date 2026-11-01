import { z } from "zod";
import type { FetchFn, PlayerDTO, PlayerSource } from "./types";

const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

const Row = z.object({
  player_id: z.string().min(1),
  full_name: z.string().min(1).nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  team: z.string().nullish(),
  position: z.string().nullish(),
  fantasy_positions: z.array(z.string()).nullish(),
  status: z.string().nullish(),
  active: z.boolean().nullish(),
});

export function sleeperPlayers(fetchFn: FetchFn = fetch): PlayerSource {
  return {
    sport: "NFL",
    async fetchPlayers() {
      const res = await fetchFn("https://api.sleeper.app/v1/players/nfl");
      if (!res.ok) throw new Error(`Sleeper players HTTP ${res.status}`);
      const body = z.record(z.string(), z.unknown()).parse(await res.json());
      const out: PlayerDTO[] = [];
      for (const raw of Object.values(body)) {
        const row = Row.safeParse(raw);
        if (!row.success || row.data.active === false) continue;
        const r = row.data;
        const name = r.full_name ?? [r.first_name, r.last_name].filter(Boolean).join(" ");
        const positions = (r.fantasy_positions ?? (r.position ? [r.position] : [])).filter((p) =>
          FANTASY_POSITIONS.includes(p),
        );
        if (!name || positions.length === 0) continue;
        out.push({ externalId: r.player_id, name, team: r.team ?? null, positions, status: r.status ?? null });
      }
      return out;
    },
  };
}
