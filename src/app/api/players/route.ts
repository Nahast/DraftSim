import { db } from "@/lib/db";
import type { PlayerView, Position } from "@/engine/types";
import { z } from "zod";

const Query = z.object({
  sport: z.literal("NFL").default("NFL"),
  format: z.enum(["std", "half", "ppr"]).default("ppr"),
  teams: z.coerce.number().int().min(2).max(20).default(12),
});

export async function GET(req: Request) {
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return Response.json({ error: q.error.flatten() }, { status: 400 });
  const { format, teams } = q.data;

  // The newest season can be too thin to use, so take the season with the most rows (newest on a tie).
  const seasons = await db.playerRanking.groupBy({
    by: ["season"], where: { source: "ffc", format }, _count: { _all: true },
  });
  const best = seasons.sort((a, b) => b._count._all - a._count._all || b.season - a.season)[0];

  // FFC serves one league size, so use the available size closest to the request.
  let adpById = new Map<string, { adp: number | null; projection: number | null }>();
  if (best) {
    const sizes = await db.playerRanking.groupBy({ by: ["teams"], where: { source: "ffc", format, season: best.season } });
    const size = sizes.map((s) => s.teams).filter((t): t is number => t !== null)
      .sort((a, b) => Math.abs(a - teams) - Math.abs(b - teams))[0];
    const rows = await db.playerRanking.findMany({ where: { source: "ffc", format, season: best.season, teams: size } });
    adpById = new Map(rows.map((r) => [r.playerId, { adp: r.adp, projection: r.projection }]));
  }

  // Every player is in the pool, ranked or not: a deep pick of an unranked player must still be loggable,
  // otherwise every later pick lands on the wrong team.
  const all = await db.player.findMany({ where: { sport: "NFL" }, orderBy: { name: "asc" } });
  const players: PlayerView[] = all.map((p) => ({
    id: p.id, name: p.name, team: p.team, positions: p.positions as Position[],
    adp: adpById.get(p.id)?.adp ?? null, projection: adpById.get(p.id)?.projection ?? null,
  }));
  players.sort((a, b) => (a.adp ?? Infinity) - (b.adp ?? Infinity));
  return Response.json(players);
}
