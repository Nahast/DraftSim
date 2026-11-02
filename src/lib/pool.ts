import type { PrismaClient } from "@/generated/prisma/client";
import type { PlayerView, Position, Scoring } from "@/engine/types";

/** Every NFL player with ADP from the best-covered season, ranked players first; unranked players last. */
export async function loadPool(db: PrismaClient, { format, teams }: { format: Scoring; teams: number }): Promise<PlayerView[]> {
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
  return players;
}
