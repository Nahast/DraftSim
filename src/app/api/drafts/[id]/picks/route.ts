import { teamOnClock } from "@/engine/order";
import { isConflict } from "@/lib/conflict";
import { db } from "@/lib/db";
import { LogPick } from "@/lib/schemas";

const select = { overall: true, team: true, playerId: true, source: true } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = LogPick.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const draft = await db.draft.findUnique({ where: { id }, select: { teams: true, rounds: true, snake: true, mode: true, myPosition: true } });
  if (!draft) return Response.json({ error: "draft not found" }, { status: 404 });
  const player = await db.player.findUnique({ where: { id: body.data.playerId }, select: { id: true } });
  if (!player) return Response.json({ error: "player not found" }, { status: 404 });
  const mock = draft.mode === "MOCK";
  if (mock && body.data.team !== undefined && body.data.team !== draft.myPosition) {
    return Response.json({ error: "in a practice draft you only pick for your own team" }, { status: 400 });
  }
  if (body.data.team && body.data.team > draft.teams) return Response.json({ error: "team out of range" }, { status: 400 });

  try {
    // Serializable, so a pick racing an undo (or another pick) cannot leave a gap in the pick numbers.
    const pick = await db.$transaction(
      async (tx) => {
        const overall = (await tx.draftPick.count({ where: { draftId: id } })) + 1;
        if (overall > draft.teams * draft.rounds) return null;
        const team = body.data.team ?? teamOnClock(overall, draft.teams, draft.snake);
        if (mock && team !== draft.myPosition) return "not-your-turn" as const;
        return tx.draftPick.create({ data: { draftId: id, overall, team, playerId: player.id, source: "manual" }, select });
      },
      { isolationLevel: "Serializable" },
    );
    if (pick === "not-your-turn") return Response.json({ error: "the bots are still picking" }, { status: 409 });
    if (!pick) return Response.json({ error: "draft is complete" }, { status: 409 });
    return Response.json(pick, { status: 201 });
  } catch (e) {
    if (isConflict(e)) return Response.json({ error: "that pick or player is already recorded, try again" }, { status: 409 });
    throw e;
  }
}
