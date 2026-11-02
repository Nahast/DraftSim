import { botPick } from "./mock";
import { teamOnClock } from "./order";
import { POSITION_NAME, recommend } from "./recommend";
import { PLAN_ALTERNATES, TIER_GAP_BASE, TIER_GAP_SLOPE } from "./weights";
import type { DraftState, PlayerView, Position, Rules } from "./types";

/** Players of one position grouped into tiers: a new tier starts where ADP jumps. Unranked players are left out. */
export function buildTiers(players: PlayerView[], position: Position): { tier: number; players: PlayerView[] }[] {
  const ranked = players.filter((p) => p.positions[0] === position && p.adp !== null).sort((a, b) => a.adp! - b.adp!);
  const tiers: { tier: number; players: PlayerView[] }[] = [];
  for (const p of ranked) {
    const last = tiers.at(-1);
    const prev = last?.players.at(-1)?.adp ?? null;
    if (last && prev !== null && p.adp! - prev <= TIER_GAP_BASE + prev * TIER_GAP_SLOPE) last.players.push(p);
    else tiers.push({ tier: tiers.length + 1, players: [p] });
  }
  return tiers;
}

export type PlanRow = { round: number; overall: number; pick: PlayerView; alternates: PlayerView[]; reason: string };

/**
 * One row per remaining pick of mine. Other teams pick by plain ADP (no noise, so the plan is repeatable)
 * and I pick what the recommendation engine would. Stops early when the pool runs out.
 */
export function buildPlan(state: DraftState, rules: Rules): PlanRow[] {
  const total = rules.teams * rules.rounds;
  const sim: DraftState = { players: state.players, picks: [...state.picks] };
  const rows: PlanRow[] = [];
  while (sim.picks.length < total) {
    const overall = sim.picks.length + 1;
    const team = teamOnClock(overall, rules.teams, rules.snake);
    let playerId: string | null;
    if (team === rules.myPosition) {
      const recs = recommend(sim, rules, 1 + PLAN_ALTERNATES);
      if (recs.length === 0) break;
      const [top, ...rest] = recs;
      rows.push({ round: Math.ceil(overall / rules.teams), overall, pick: top.player, alternates: rest.map((r) => r.player), reason: top.reason });
      playerId = top.player.id;
    } else {
      playerId = botPick(sim, rules, team, () => 0.5); // rng 0.5 is the no-noise pick
    }
    if (!playerId) break;
    sim.picks.push({ overall, team, playerId });
  }
  return rows;
}

const NO_DATA = "We need more player data to plan your picks.";

function describe(rows: PlanRow[]): string {
  const names = rows.map((r) => POSITION_NAME[r.pick.positions[0]]);
  if (names.length <= 4) return names.join(", ");
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].map(([n, c]) => `${c} ${n}${c > 1 ? "s" : ""}`).join(", ");
}

/** Three plain sentences: early rounds (1 to 3), the middle rounds, and the last rounds. */
export function planSummary(rows: PlanRow[]): string[] {
  if (rows.length === 0) {
    return [NO_DATA, "Check back after the next data update.", "You can still pick from the recommendations in the draft room."];
  }
  const maxRound = Math.max(...rows.map((r) => r.round));
  const lateStart = Math.max(4, maxRound - 2);
  const band = (name: string, from: number, to: number): string => {
    if (from > to) return `No ${name} rounds in this draft.`;
    const label = from === to ? `Round ${from}` : `Rounds ${from} to ${to}`;
    const inBand = rows.filter((r) => r.round >= from && r.round <= to);
    return inBand.length ? `${label}: ${describe(inBand)}.` : `${label}: no picks left to plan.`;
  };
  return [band("early", 1, 3), band("middle", 4, lateStart - 1), band("last", lateStart, maxRound)];
}
