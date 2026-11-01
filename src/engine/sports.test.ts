import { expect, test } from "vitest";
import { NFL_DEFAULT_SLOTS, slotAccepts } from "./sports";

test("FLEX accepts RB, WR, TE only", () => {
  expect(slotAccepts("FLEX", "RB")).toBe(true);
  expect(slotAccepts("FLEX", "WR")).toBe(true);
  expect(slotAccepts("FLEX", "TE")).toBe(true);
  expect(slotAccepts("FLEX", "QB")).toBe(false);
  expect(slotAccepts("FLEX", "K")).toBe(false);
});

test("a position slot accepts only its own position", () => {
  expect(slotAccepts("RB", "RB")).toBe(true);
  expect(slotAccepts("RB", "WR")).toBe(false);
});

test("BENCH accepts everyone", () => {
  expect(slotAccepts("BENCH", "K")).toBe(true);
});

test("default NFL roster is 15 slots", () => {
  expect(NFL_DEFAULT_SLOTS.reduce((n, s) => n + s.count, 0)).toBe(15);
});
