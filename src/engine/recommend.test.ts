import { describe, expect, test } from "vitest";
import { recommend } from "./recommend";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { DraftState, PlayerView, Position, Rules } from "./types";

let n = 0;
const pl = (positions: Position, adp: number | null, projection: number | null = null, name?: string): PlayerView => ({
  id: `p${++n}`, name: name ?? `P${n}`, team: "AAA", positions: [positions], adp, projection,
});
const rules = (over: Partial<Rules> = {}): Rules => ({
  teams: 12, rounds: 15, snake: true, scoring: "ppr",
  rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 1, ...over,
});
/** Mine = slot 1; everyone else's filler picks are slot 2. */
const draft = (players: PlayerView[], mine: PlayerView[] = [], others: PlayerView[] = []): DraftState => ({
  players: [...players, ...mine, ...others],
  picks: [
    ...mine.map((p, i) => ({ overall: i + 1, team: 1, playerId: p.id })),
    ...others.map((p, i) => ({ overall: mine.length + i + 1, team: 2, playerId: p.id })),
  ],
});

describe("recommend", () => {
  test("recommends the position I have no player at, and says so", () => {
    const wrs = [pl("WR", 10), pl("WR", 11), pl("WR", 12)];
    const rb = pl("RB", 10);
    const wr = pl("WR", 10);
    const out = recommend(draft([rb, wr], wrs), rules({ myPosition: 1 }), 2);
    expect(out[0].player.id).toBe(rb.id);
    expect(out[0].reason).toContain("RB");
  });

  test("with only ADP data, a top-ranked running back beats a tight end drafted much later", () => {
    const rb = pl("RB", 2);
    const wr = pl("WR", 3);
    const te = pl("TE", 40);
    const rest = Array.from({ length: 30 }, (_, i) => pl("TE", 100 + i));
    const out = recommend(draft([te, rb, wr, ...rest]), rules({ myPosition: 6 }), 3);
    expect(out.slice(0, 2).map((r) => r.player.id)).toEqual([rb.id, wr.id]);
  });

  test("never recommends a second kicker", () => {
    const k1 = pl("K", 120);
    const pool = [pl("K", 1), pl("RB", 30), pl("WR", 31), pl("QB", 32), pl("TE", 33)];
    const out = recommend(draft(pool, [k1]), rules(), 3);
    expect(out.map((r) => r.player.positions[0])).not.toContain("K");
  });

  test("prefers the player who will not last to my next pick", () => {
    const early = pl("RB", 20, 150);
    const late = pl("RB", 90, 150);
    const fillers = Array.from({ length: 20 }, () => pl("QB", 200));
    const out = recommend(draft([early, late], [], fillers), rules({ teams: 30, myPosition: 30 }), 2);
    expect(out[0].player.id).toBe(early.id);
    expect(out[0].survival).toBeLessThan(out[1].survival);
  });

  test("likelyGone is survival below one half", () => {
    const out = recommend(draft([pl("RB", 5), pl("RB", 150)]), rules({ myPosition: 12 }), 2);
    for (const r of out) expect(r.likelyGone).toBe(r.survival < 0.5);
  });

  test("empty pool returns []", () => {
    expect(recommend(draft([]), rules())).toEqual([]);
  });

  test("with every starter slot full only bench-eligible picks come back", () => {
    const mine = [pl("QB", 1), pl("RB", 2), pl("RB", 3), pl("WR", 4), pl("WR", 5), pl("TE", 6), pl("WR", 7), pl("K", 8), pl("DEF", 9)];
    const pool = [pl("QB", 40), pl("RB", 41), pl("K", 42), pl("DEF", 43)];
    const out = recommend(draft(pool, mine), rules(), 5);
    expect(out.length).toBeGreaterThan(0);
    expect(out.map((r) => r.player.positions[0])).not.toContain("K");
    expect(out.map((r) => r.player.positions[0])).not.toContain("DEF");
  });

  test("a player with no ADP and no projection is finite and ranked last in his position", () => {
    const known = [pl("RB", 10), pl("RB", 50)];
    const unknown = pl("RB", null);
    const out = recommend(draft([...known, unknown]), rules(), 10);
    expect(out.at(-1)!.player.id).toBe(unknown.id);
    for (const r of out) expect(Number.isFinite(r.score)).toBe(true);
  });

  test("back to back picks: on the clock, survival is judged at the following pick", () => {
    const mine12 = rules({ myPosition: 12 });
    const fillers = Array.from({ length: 11 }, () => pl("QB", 200));
    const target = pl("RB", 12);
    const out = recommend(draft([target], [], fillers), mine12, 1);
    expect(out[0].survival).toBeLessThan(0.9);
  });
});

describe("recommend at my final pick", () => {
  test("nothing comes after it, so survival is 1 and nobody is flagged likely gone", () => {
    const r = rules({ teams: 2, rounds: 1, myPosition: 2 });
    const first = pl("QB", 1);
    const pool = [pl("RB", 2), pl("WR", 3), pl("TE", 4)];
    const out = recommend({ players: [first, ...pool], picks: [{ overall: 1, team: 1, playerId: first.id }] }, r, 3);
    expect(out.length).toBeGreaterThan(0);
    for (const rec of out) {
      expect(rec.survival).toBe(1);
      expect(rec.likelyGone).toBe(false);
    }
  });
});
