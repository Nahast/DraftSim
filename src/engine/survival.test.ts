import { describe, expect, test } from "vitest";
import { survivalChance } from "./survival";
import type { PlayerView } from "./types";

const p = (adp: number | null): PlayerView => ({
  id: "x", name: "X", team: "AAA", positions: ["RB"], adp, projection: null,
});

describe("survivalChance", () => {
  test("early ADP almost never lasts 20 more picks", () => {
    expect(survivalChance(p(5), 20, 10)).toBeLessThan(0.05);
  });
  test("late ADP almost always lasts", () => {
    expect(survivalChance(p(60), 20, 10)).toBeGreaterThan(0.9);
  });
  test("on the clock means certain", () => {
    expect(survivalChance(p(1), 0, 10)).toBe(1);
  });
  test("unknown ADP is a coin flip, never NaN", () => {
    expect(survivalChance(p(null), 10, 10)).toBe(0.5);
  });
  test("no picks left for me means nothing survives to it", () => {
    expect(survivalChance(p(100), Infinity, 10)).toBe(0);
  });
});
