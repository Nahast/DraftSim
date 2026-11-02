import { describe, expect, test } from "vitest";
import { gradeDraft } from "./grade";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { PlayerView, Position, Rules } from "./types";

let n = 0;
const rules: Rules = { teams: 12, rounds: 15, snake: true, scoring: "ppr", rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 1 };
const pl = (pos: Position, adp: number | null = 10, name = `P${++n}`): PlayerView => ({
  id: `g${n}`, name, team: "AAA", positions: [pos], adp, projection: null,
});
/** Picks taken `after` picks after their ADP, overall numbers 10, 20, 30... */
const mineOf = (positions: Position[], after = 0) =>
  positions.map((pos, i) => ({ player: pl(pos, (i + 1) * 10 - after), overall: (i + 1) * 10 }));
const STARTERS: Position[] = ["QB", "RB", "RB", "WR", "WR", "TE", "RB", "K", "DEF"];

describe("gradeDraft", () => {
  test("a full lineup taken at or after ADP is an A with nothing to fix", () => {
    const g = gradeDraft(mineOf(STARTERS), rules);
    expect(g.letter).toBe("A");
    expect(g.weaknesses).toEqual([]);
    expect(g.score).toBeGreaterThanOrEqual(0.85);
  });

  test("the same roster without QB, K and DEF says so", () => {
    const g = gradeDraft(mineOf(["RB", "RB", "WR", "WR", "TE", "WR", "RB", "WR"]), rules);
    expect(g.weaknesses).toEqual(expect.arrayContaining(["No QB", "No K", "No DEF"]));
    expect(g.letter).not.toBe("A");
  });

  test("an empty draft is a D with a clear message and no NaN", () => {
    const g = gradeDraft([], rules);
    expect(g).toMatchObject({ letter: "D", score: 0, weaknesses: ["You have not drafted anyone yet"], strengths: [], steals: [] });
  });

  test("six running backs is a D that names every missing position", () => {
    const g = gradeDraft(mineOf(Array(6).fill("RB")), rules);
    expect(g.letter).toBe("D");
    expect(g.weaknesses).toEqual(expect.arrayContaining(["No QB", "No WR", "No TE", "No K", "No DEF"]));
    expect(g.weaknesses).not.toContain("No RB");
    expect(Number.isFinite(g.score)).toBe(true);
  });

  test("a player taken 8 picks after his ADP is a steal, one taken 8 picks early is not", () => {
    const steal = gradeDraft([{ player: pl("RB", 12, "Late Value"), overall: 20 }], rules);
    expect(steal.steals).toEqual([{ name: "Late Value", overall: 20, adp: 12 }]);
    const reach = gradeDraft([{ player: pl("RB", 28, "Reach"), overall: 20 }], rules);
    expect(reach.steals).toEqual([]);
  });

  test("players with no ADP at all keep the grade finite", () => {
    const g = gradeDraft(mineOf(STARTERS).map((m) => ({ ...m, player: { ...m.player, adp: null } })), rules);
    expect(Number.isFinite(g.score)).toBe(true);
    expect(["A", "B", "C", "D"]).toContain(g.letter);
  });
});
