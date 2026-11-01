import type { DraftState, Rules } from "./types";

/** 1-based draft slot on the clock for a 1-based overall pick. */
export function teamOnClock(overall: number, teams: number, snake: boolean): number {
  const round = Math.floor((overall - 1) / teams);
  const i = (overall - 1) % teams;
  return snake && round % 2 === 1 ? teams - i : i + 1;
}

/** First overall pick strictly after `afterOverall` that belongs to `slot`, or null once the draft is over. */
export function nextPickFor(slot: number, afterOverall: number, rules: Rules): number | null {
  const total = rules.teams * rules.rounds;
  for (let n = afterOverall + 1; n <= total; n++) {
    if (teamOnClock(n, rules.teams, rules.snake) === slot) return n;
  }
  return null;
}

/** Picks before my next turn; 0 when on the clock, Infinity when I have no picks left. */
export function picksUntilMine(state: DraftState, rules: Rules): number {
  const current = state.picks.length + 1;
  const next = nextPickFor(rules.myPosition, current - 1, rules);
  return next === null ? Number.POSITIVE_INFINITY : next - current;
}
