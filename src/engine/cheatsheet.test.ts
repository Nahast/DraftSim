import { describe, expect, test } from "vitest";
import { buildPlan, buildTiers, planSummary, type PlanRow } from "./cheatsheet";
import { simulateRest } from "./mock";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { DraftState, PlayerView, Position, Rules } from "./types";

let n = 0;
const pl = (pos: Position, adp: number | null): PlayerView => ({
  id: `c${++n}`, name: `C${n}`, team: "AAA", positions: [pos], adp, projection: null,
});
const rules = (over: Partial<Rules> = {}): Rules => ({
  teams: 12, rounds: 15, snake: true, scoring: "ppr", rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 5, ...over,
});
const POSITIONS: Position[] = ["QB", "RB", "WR", "RB", "WR", "WR", "TE", "RB", "WR", "QB", "RB", "WR", "WR", "RB", "TE", "WR", "RB", "K", "DEF", "WR"];
const pool = (size: number) => Array.from({ length: size }, (_, i) => pl(POSITIONS[i % POSITIONS.length], i + 1));

describe("buildTiers", () => {
  test("ADPs 1, 2, 3, 12, 13, 30 split into three tiers; unranked players are left out", () => {
    const rbs = [1, 2, 3, 12, 13, 30].map((a) => pl("RB", a));
    const tiers = buildTiers([...rbs, pl("RB", null), pl("WR", 5)], "RB");
    expect(tiers.map((t) => t.tier)).toEqual([1, 2, 3]);
    expect(tiers.map((t) => t.players.map((p) => p.adp))).toEqual([[1, 2, 3], [12, 13], [30]]);
  });
  test("an empty list gives no tiers", () => {
    expect(buildTiers([], "QB")).toEqual([]);
  });
});

describe("buildPlan", () => {
  test("a 12-team slot-5 draft plans overall 5, 20, 29 with distinct players and alternates", () => {
    const rows = buildPlan({ players: pool(260), picks: [] }, rules());
    expect(rows.slice(0, 3).map((r) => r.overall)).toEqual([5, 20, 29]);
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((r) => r.pick.id)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.alternates.length).toBeLessThanOrEqual(2);
      expect(r.alternates.map((a) => a.id)).not.toContain(r.pick.id);
      expect(r.round).toBe(Math.ceil(r.overall / 12));
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });

  test("is repeatable", () => {
    const state = { players: pool(260), picks: [] };
    expect(buildPlan(state, rules())).toEqual(buildPlan(state, rules()));
  });

  test("started from a draft where I have made 3 picks it returns only my remaining ones", () => {
    const players = pool(260);
    const first = simulateRest({ players, picks: [] }, rules(), "x").slice(0, 29);
    const rows = buildPlan({ players, picks: first }, rules());
    expect(rows).toHaveLength(12);
    expect(rows[0].overall).toBe(44);
    for (const r of rows) expect(first.some((p) => p.playerId === r.pick.id)).toBe(false);
  });

  test("thin data: 10 players give fewer rows and no throw; an empty pool gives none; 2 teams works", () => {
    expect(buildPlan({ players: pool(10), picks: [] }, rules()).length).toBeLessThan(15);
    expect(buildPlan({ players: [], picks: [] }, rules())).toEqual([]);
    const two = buildPlan({ players: pool(60), picks: [] }, rules({ teams: 2, myPosition: 1 }));
    expect(two.length).toBeGreaterThan(0);
    expect(two[0].overall).toBe(1);
  });
});

describe("planSummary", () => {
  const row = (round: number, pos: Position): PlanRow => ({
    round, overall: round, pick: pl(pos, round), alternates: [], reason: "x",
  });
  test("a 15-row plan gives 3 non-empty sentences, the first naming rounds 1 to 3 in order", () => {
    const rows = Array.from({ length: 15 }, (_, i) => row(i + 1, POSITIONS[i]));
    const s = planSummary(rows);
    expect(s).toHaveLength(3);
    for (const line of s) expect(line.length).toBeGreaterThan(0);
    expect(s[0]).toBe("Rounds 1 to 3: quarterback, running back, wide receiver.");
  });
  test("no rows gives 3 strings that lead with the data warning", () => {
    const s = planSummary([]);
    expect(s).toHaveLength(3);
    expect(s[0]).toBe("We need more player data to plan your picks.");
    for (const line of s) expect(line.length).toBeGreaterThan(0);
  });
  test("when early rounds are already done, the sentence says so instead of being empty", () => {
    const rows = Array.from({ length: 6 }, (_, i) => row(i + 10, "RB"));
    const s = planSummary(rows);
    expect(s).toHaveLength(3);
    expect(s[0]).toContain("no picks left");
  });
});
