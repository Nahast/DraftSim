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
  if (!best) return Response.json([]);

  // FFC serves one league size, so use the available size closest to the request.
  const sizes = await db.playerRanking.groupBy({
    by: ["teams"], where: { source: "ffc", format, season: best.season },
  });
  const size = sizes.map((s) => s.teams).filter((t): t is number => t !== null)
    .sort((a, b) => Math.abs(a - teams) - Math.abs(b - teams))[0];

  const rows = await db.playerRanking.findMany({
    where: { source: "ffc", format, season: best.season, teams: size },
    include: { player: true },
    orderBy: { adp: "asc" },
  });
  const players: PlayerView[] = rows.map((r) => ({
    id: r.player.id, name: r.player.name, team: r.player.team,
    positions: r.player.positions as Position[], adp: r.adp, projection: r.projection,
  }));
  return Response.json(players);
}
