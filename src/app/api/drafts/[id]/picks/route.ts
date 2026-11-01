import { teamOnClock } from "@/engine/order";
import { db } from "@/lib/db";
import { LogPick } from "@/lib/schemas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = LogPick.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const draft = await db.draft.findUnique({ where: { id }, select: { teams: true, rounds: true, snake: true } });
  if (!draft) return Response.json({ error: "draft not found" }, { status: 404 });
  const player = await db.player.findUnique({ where: { id: body.data.playerId }, select: { id: true } });
  if (!player) return Response.json({ error: "player not found" }, { status: 404 });

  const overall = (await db.draftPick.count({ where: { draftId: id } })) + 1;
  if (overall > draft.teams * draft.rounds) return Response.json({ error: "draft is complete" }, { status: 409 });
  const team = body.data.team ?? teamOnClock(overall, draft.teams, draft.snake);
  if (team > draft.teams) return Response.json({ error: "team out of range" }, { status: 400 });

  try {
    const pick = await db.draftPick.create({
      data: { draftId: id, overall, team, playerId: player.id, source: "manual" },
      select: { overall: true, team: true, playerId: true, source: true },
    });
    return Response.json(pick, { status: 201 });
  } catch (e) {
    // Unique (draftId, overall) or (draftId, playerId): someone else got there first, or the player is already taken.
    if ((e as { code?: string }).code === "P2002") {
      return Response.json({ error: "that pick or player is already recorded" }, { status: 409 });
    }
    throw e;
  }
}
