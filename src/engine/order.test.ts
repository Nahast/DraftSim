import { describe, expect, test } from "vitest";
import { nextPickFor, picksUntilMine, teamOnClock } from "./order";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { DraftState, Rules } from "./types";

const rules = (over: Partial<Rules> = {}): Rules => ({
  teams: 12, rounds: 15, snake: true, scoring: "ppr",
  rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 3, ...over,
});
const stateWith = (n: number): DraftState => ({
  players: [],
  picks: Array.from({ length: n }, (_, i) => ({ overall: i + 1, team: 1, playerId: `p${i}` })),
});

describe("teamOnClock", () => {
  test("snake reverses on even rounds", () => {
    expect(teamOnClock(1, 12, true)).toBe(1);
    expect(teamOnClock(12, 12, true)).toBe(12);
    expect(teamOnClock(13, 12, true)).toBe(12);
    expect(teamOnClock(24, 12, true)).toBe(1);
  });
  test("linear repeats the same order", () => {
    expect(teamOnClock(13, 12, false)).toBe(1);
  });
  test("two teams alternate 1,2,2,1", () => {
    expect([1, 2, 3, 4].map((n) => teamOnClock(n, 2, true))).toEqual([1, 2, 2, 1]);
  });
});

describe("nextPickFor", () => {
  test("last slot picks back to back at the turn", () => {
    expect(nextPickFor(12, 12, rules())).toBe(13);
  });
  test("null after the final round", () => {
    expect(nextPickFor(3, 12 * 15, rules())).toBeNull();
  });
});

describe("picksUntilMine", () => {
  test("counts picks before my turn", () => {
    expect(picksUntilMine(stateWith(0), rules())).toBe(2);
  });
  test("zero when on the clock", () => {
    expect(picksUntilMine(stateWith(2), rules())).toBe(0);
  });
  test("slot 12 on the turn is on the clock twice running", () => {
    const r = rules({ myPosition: 12 });
    expect(picksUntilMine(stateWith(11), r)).toBe(0);
    expect(picksUntilMine(stateWith(12), r)).toBe(0);
  });
});
