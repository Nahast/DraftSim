import { nextPickFor, teamOnClock } from "./order";
import { openSlots } from "./roster";
import { slotAccepts } from "./sports";
import { survivalChance } from "./survival";
import {
  BENCH_PENALTY, FLEX_BOOST, LIKELY_GONE_BELOW, NEED_BOOST, RANK_VALUE_BASE, SCARCITY_WEIGHT, SURVIVAL_WEIGHT,
} from "./weights";
import type { DraftState, PlayerView, Position, Rules } from "./types";

export type Recommendation = {
  player: PlayerView;
  score: number;
  reason: string;
  likelyGone: boolean;
  survival: number;
};

const POSITION_NAME: Record<Position, string> = {
  QB: "quarterback", RB: "running back", WR: "wide receiver", TE: "tight end", K: "kicker", DEF: "defense",
};

// ponytail: per-player value, mixes projection and ADP-derived value if a pool has both; split by source if that happens.
const valueOf = (p: PlayerView): number =>
  p.projection ?? (p.adp === null ? 0 : RANK_VALUE_BASE - p.adp);

export function recommend(state: DraftState, rules: Rules, limit = 3): Recommendation[] {
  const taken = new Set(state.picks.map((p) => p.playerId));
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const available = state.players.filter((p) => !taken.has(p.id));
  if (available.length === 0) return [];

  const mine = state.picks
    .filter((p) => p.team === rules.myPosition)
    .sort((a, b) => a.overall - b.overall)
    .flatMap((p) => byId.get(p.playerId) ?? []);
  const open = openSlots(mine, rules);

  const current = state.picks.length + 1;
  const onClock = teamOnClock(current, rules.teams, rules.snake) === rules.myPosition;
  // On the clock, judge survival at my following pick, not this one.
  const next = nextPickFor(rules.myPosition, onClock ? current : current - 1, rules);
  const until = next === null ? Number.POSITIVE_INFINITY : next - current;

  const directCount = (pos: Position) => rules.rosterSlots.find((s) => s.slot === pos)?.count ?? 0;
  const byPos = new Map<Position, PlayerView[]>();
  for (const p of available) {
    const pos = p.positions[0];
    byPos.set(pos, [...(byPos.get(pos) ?? []), p]);
  }
  for (const list of byPos.values()) list.sort((a, b) => valueOf(b) - valueOf(a));
  const replacement = (pos: Position): number => {
    const list = byPos.get(pos) ?? [];
    const rank = Math.max(1, rules.teams * directCount(pos));
    return list.length ? valueOf(list[Math.min(rank, list.length) - 1]) : 0;
  };

  const out: Recommendation[] = [];
  for (const p of available) {
    const pos = p.positions[0];
    const direct = open.get(pos) ?? 0;
    const flex = (open.get("FLEX") ?? 0) > 0 && slotAccepts("FLEX", pos);
    const bench = (open.get("BENCH") ?? 0) > 0;
    // A kicker or defense on the bench is wasted: only seat them in their own slot.
    if (!direct && (pos === "K" || pos === "DEF")) continue;
    if (!direct && !flex && !bench) continue;

    const need = direct ? NEED_BOOST : flex ? FLEX_BOOST : -BENCH_PENALTY;
    const remaining = byPos.get(pos)!.length;
    const scarcity = SCARCITY_WEIGHT * Math.max(0, 1 - remaining / Math.max(1, rules.teams * directCount(pos)));
    const survival = survivalChance(p, until, current);
    const score = valueOf(p) - replacement(pos) + need + scarcity + SURVIVAL_WEIGHT * (1 - survival);

    const haveAtPos = mine.filter((m) => m.positions[0] === pos).length;
    const reason =
      direct && haveAtPos === 0
        ? byPos.get(pos)![0] === p
          ? `Best ${POSITION_NAME[pos]} left. You have no ${pos} yet.`
          : `Fills your empty ${pos} spot. You have no ${pos} yet.`
        : survival < LIKELY_GONE_BELOW
          ? `${p.name} is unlikely to still be there at your next pick.`
          : scarcity > SCARCITY_WEIGHT / 2
            ? `${POSITION_NAME[pos]}s are running low: only ${remaining} left.`
            : "Best player left by ranking.";
    out.push({ player: p, score, reason, likelyGone: survival < LIKELY_GONE_BELOW, survival });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
