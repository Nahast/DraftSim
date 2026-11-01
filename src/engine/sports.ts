import type { Position, RosterSlot } from "./types";

export const NFL_DEFAULT_SLOTS: RosterSlot[] = [
  { slot: "QB", count: 1 },
  { slot: "RB", count: 2 },
  { slot: "WR", count: 2 },
  { slot: "TE", count: 1 },
  { slot: "FLEX", count: 1 },
  { slot: "K", count: 1 },
  { slot: "DEF", count: 1 },
  { slot: "BENCH", count: 6 },
];

const FLEX_POSITIONS: Position[] = ["RB", "WR", "TE"];

export function slotAccepts(slot: string, p: Position): boolean {
  if (slot === "BENCH") return true;
  if (slot === "FLEX") return FLEX_POSITIONS.includes(p);
  return slot === p;
}
