import { teamOnClock } from "./order";
import { gaussian, seeded } from "./rng";
import { openSlots } from "./roster";
import { slotAccepts } from "./sports";
import { BOT_LATE_ROUNDS, BOT_NOISE_BASE, BOT_NOISE_SLOPE } from "./weights";
import type { DraftState, Pick, Rules } from "./types";

/**
 * Player the bot on `team` takes at overall `state.picks.length + 1`: the lowest ADP plus noise among
 * ranked players its roster can still seat. Null when nobody qualifies.
 */
export function botPick(state: DraftState, rules: Rules, team: number, rng: () => number): string | null {
  const round = Math.ceil((state.picks.length + 1) / rules.teams);
  const late = round > rules.rounds - BOT_LATE_ROUNDS;
  const taken = new Set(state.picks.map((p) => p.playerId));
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const mine = state.picks.filter((p) => p.team === team).flatMap((p) => byId.get(p.playerId) ?? []);
  const open = openSlots(mine, rules);

  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const p of state.players) {
    if (taken.has(p.id) || p.adp === null) continue;
    const pos = p.positions[0];
    const direct = (open.get(pos) ?? 0) > 0;
    if (pos === "K" || pos === "DEF") {
      if (!direct || !late) continue;
    } else if (!direct && !["FLEX", "BENCH"].some((s) => (open.get(s) ?? 0) > 0 && slotAccepts(s, pos))) continue;
    const score = p.adp + gaussian(rng) * (BOT_NOISE_BASE + p.adp * BOT_NOISE_SLOPE);
    if (score < bestScore) { bestScore = score; best = p.id; }
  }
  return best;
}

/** Every remaining pick for all teams, mine included, until the draft ends or the team on the clock has nobody to take. */
export function simulateRest(state: DraftState, rules: Rules, seed: string): Pick[] {
  const rng = seeded(seed);
  const total = rules.teams * rules.rounds;
  const sim: DraftState = { players: state.players, picks: [...state.picks] };
  const added: Pick[] = [];
  while (sim.picks.length < total) {
    const overall = sim.picks.length + 1;
    const team = teamOnClock(overall, rules.teams, rules.snake);
    const playerId = botPick(sim, rules, team, rng);
    if (!playerId) break;
    const pick = { overall, team, playerId };
    sim.picks.push(pick);
    added.push(pick);
  }
  return added;
}
