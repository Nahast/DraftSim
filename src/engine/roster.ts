import { slotAccepts } from "./sports";
import type { PlayerView, Rules } from "./types";

/** Remaining capacity per slot after greedily seating my picks (own position, then FLEX, then BENCH). */
export function openSlots(mine: PlayerView[], rules: Rules): Map<string, number> {
  const open = new Map(rules.rosterSlots.map((s) => [s.slot, s.count]));
  for (const p of mine) {
    const pos = p.positions[0];
    const seat = [pos, "FLEX", "BENCH"].find((s) => (open.get(s) ?? 0) > 0 && slotAccepts(s, pos));
    if (seat) open.set(seat, open.get(seat)! - 1);
  }
  return open;
}

/** Starting slots still empty, one entry per empty seat, in roster order. */
export function stillNeeded(open: Map<string, number>, rules: Rules): string[] {
  return rules.rosterSlots
    .filter((s) => s.slot !== "BENCH")
    .flatMap((s) => Array<string>(open.get(s.slot) ?? 0).fill(s.slot));
}
