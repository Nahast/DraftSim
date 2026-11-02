import { teamOnClock } from "@/engine/order";
import { botPick } from "@/engine/mock";
import { seeded } from "@/engine/rng";
import type { Pick, RosterSlot, Rules, Scoring } from "@/engine/types";
import { isConflict } from "@/lib/conflict";
import { db } from "@/lib/db";
import { loadPool } from "@/lib/pool";

/** Make every bot pick up to my next turn (or the end). Mock drafts only; safe to call twice or from two tabs. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await db.draft.findUnique({ where: { id } });
  if (!draft) return Response.json({ error: "draft not found" }, { status: 404 });
  if (draft.mode !== "MOCK") return Response.json({ error: "only practice drafts have bots" }, { status: 409 });

  const players = await loadPool(db, { format: draft.scoring as Scoring, teams: draft.teams });
  const rules: Rules = {
    teams: draft.teams, rounds: draft.rounds, snake: draft.snake, scoring: draft.scoring as Scoring,
    rosterSlots: draft.rosterSlots as RosterSlot[], myPosition: draft.myPosition,
  };
  const total = draft.teams * draft.rounds;

  try {
    // Serializable: a second advance racing this one fails or sees the finished picks, so none are duplicated or skipped.
    return Response.json(
      await db.$transaction(
        async (tx) => {
          const picks: Pick[] = await tx.draftPick.findMany({
            where: { draftId: id }, orderBy: { overall: "asc" }, select: { overall: true, team: true, playerId: true },
          });
          let added = 0;
          while (picks.length < total) {
            const overall = picks.length + 1;
            const team = teamOnClock(overall, draft.teams, draft.snake);
            if (team === draft.myPosition) break;
            const playerId = botPick({ players, picks }, rules, team, seeded(`${id}:${overall}`));
            if (!playerId) break; // thin pool: stop rather than fail
            await tx.draftPick.create({ data: { draftId: id, overall, team, playerId, source: "bot" } });
            picks.push({ overall, team, playerId });
            added++;
          }
          return { added, complete: picks.length >= total };
        },
        { isolationLevel: "Serializable", timeout: 20_000 },
      ),
    );
  } catch (e) {
    if (isConflict(e)) return Response.json({ error: "the draft changed, try again" }, { status: 409 });
    throw e;
  }
}
