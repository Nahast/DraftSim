import { describe, expect, test } from "vitest";
import { botPick, simulateRest } from "./mock";
import { openSlots } from "./roster";
import { seeded } from "./rng";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { DraftState, PlayerView, Position, Rules } from "./types";

let n = 0;
const pl = (pos: Position, adp: number | null): PlayerView => ({
  id: `p${++n}`, name: `P${n}`, team: "AAA", positions: [pos], adp, projection: null,
});
const rules = (over: Partial<Rules> = {}): Rules => ({
  teams: 12, rounds: 15, snake: true, scoring: "ppr", rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 1, ...over,
});
const noNoise = () => 0.5;
/** Pool of `size` players with ADP 1..size cycling through realistic positions. */
const POSITIONS: Position[] = ["QB", "RB", "WR", "RB", "WR", "WR", "TE", "RB", "WR", "QB", "RB", "WR", "WR", "RB", "TE", "WR", "RB", "K", "DEF", "WR"];
const pool = (size: number): PlayerView[] => Array.from({ length: size }, (_, i) => pl(POSITIONS[i % POSITIONS.length], i + 1));
/** `count` filler picks by team 2, with their players, so the draft clock is at the round I want. */
const withFiller = (players: PlayerView[], count: number): DraftState => {
  const filler = Array.from({ length: count }, () => pl("WR", 500));
  return { players: [...players, ...filler], picks: filler.map((p, i) => ({ overall: i + 1, team: 2, playerId: p.id })) };
};

describe("botPick", () => {
  test("with no noise takes the lowest-ADP player the team can seat", () => {
    const best = pl("RB", 1);
    const state: DraftState = { players: [pl("WR", 5), best, pl("QB", 3)], picks: [] };
    expect(botPick(state, rules(), 1, noNoise)).toBe(best.id);
  });

  test("never takes a player the roster cannot seat", () => {
    const r = rules({ teams: 2, rounds: 2, rosterSlots: [{ slot: "QB", count: 1 }, { slot: "RB", count: 1 }] });
    const qb1 = pl("QB", 1);
    const state: DraftState = { players: [qb1, pl("QB", 2), pl("QB", 3), pl("RB", 50)], picks: [{ overall: 1, team: 1, playerId: qb1.id }] };
    const taken = botPick(state, r, 1, noNoise);
    expect(state.players.find((p) => p.id === taken)!.positions[0]).toBe("RB");
  });

  test("passes on a kicker in round 5 of 15 but takes one in round 14", () => {
    const k = pl("K", 1);
    const rb = pl("RB", 2);
    const r = rules({ teams: 2 });
    const early = withFiller([k, rb], 8); // overall 9 is round 5
    expect(botPick(early, r, 1, noNoise)).toBe(rb.id);
    const late = withFiller([k, rb], 26); // overall 27 is round 14
    expect(botPick(late, r, 1, noNoise)).toBe(k.id);
  });

  test("returns null with a full roster, an empty pool, or only unranked players", () => {
    const r = rules({ teams: 2, rounds: 1, rosterSlots: [{ slot: "QB", count: 1 }] });
    const qb = pl("QB", 1);
    expect(botPick({ players: [qb, pl("QB", 2)], picks: [{ overall: 1, team: 1, playerId: qb.id }] }, r, 1, noNoise)).toBeNull();
    expect(botPick({ players: [], picks: [] }, rules(), 1, noNoise)).toBeNull();
    expect(botPick({ players: [pl("RB", null), pl("WR", null)], picks: [] }, rules(), 1, noNoise)).toBeNull();
  });

  test("same seed gives the same pick, different seeds sometimes differ", () => {
    const state: DraftState = { players: Array.from({ length: 10 }, (_, i) => pl("RB", i + 1)), picks: [] };
    expect(botPick(state, rules(), 1, seeded("x"))).toBe(botPick(state, rules(), 1, seeded("x")));
    const picks = new Set(Array.from({ length: 20 }, (_, i) => botPick(state, rules(), 1, seeded(`s${i}`))));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe("simulateRest", () => {
  test("20 seeds of a full 12 x 15 draft: unique players, every pick seated, no early K or DEF", () => {
    const r = rules();
    const players = pool(260);
    const byId = new Map(players.map((p) => [p.id, p]));
    for (let s = 0; s < 20; s++) {
      const picks = simulateRest({ players, picks: [] }, r, `s${s}`);
      expect(picks).toHaveLength(180);
      expect(new Set(picks.map((p) => p.playerId)).size).toBe(180);
      for (let team = 1; team <= 12; team++) {
        const mine = picks.filter((p) => p.team === team).map((p) => byId.get(p.playerId)!);
        const open = [...openSlots(mine, r).values()].reduce((a, b) => a + b, 0);
        expect(open).toBe(15 - mine.length);
      }
      for (const p of picks) {
        const pos = byId.get(p.playerId)!.positions[0];
        if (pos === "K" || pos === "DEF") expect(p.overall).toBeGreaterThan(12 * 13);
      }
    }
  });

  test("a pool of 60 players returns fewer picks and does not throw", () => {
    const picks = simulateRest({ players: pool(60), picks: [] }, rules(), "thin");
    expect(picks.length).toBeLessThan(180);
    expect(picks.length).toBeGreaterThan(0);
  });

  test("continues from existing picks and numbers them from the next overall", () => {
    const players = pool(260);
    const first = { overall: 1, team: 1, playerId: players[0].id };
    const rest = simulateRest({ players, picks: [first] }, rules(), "c");
    expect(rest[0].overall).toBe(2);
    expect(rest[0].team).toBe(2);
    expect(rest.some((p) => p.playerId === first.playerId)).toBe(false);
  });
});
