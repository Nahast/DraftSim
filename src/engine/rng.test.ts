import { expect, test } from "vitest";
import { gaussian, seeded } from "./rng";

const take = (r: () => number, n: number) => Array.from({ length: n }, r);

test("same seed gives the same sequence, different seeds differ", () => {
  expect(take(seeded("a"), 5)).toEqual(take(seeded("a"), 5));
  expect(take(seeded("a"), 5)).not.toEqual(take(seeded("b"), 5));
});

test("values are in [0, 1)", () => {
  for (const v of take(seeded("range"), 2000)) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test("gaussian is roughly standard normal", () => {
  const g = seeded("g");
  const xs = Array.from({ length: 2000 }, () => gaussian(g));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  expect(Math.abs(mean)).toBeLessThan(0.1);
  expect(Math.abs(sd - 1)).toBeLessThan(0.1);
});

test("gaussian of a constant 0.5 generator is exactly 0 (the no-noise pick)", () => {
  expect(gaussian(() => 0.5)).toBeCloseTo(0, 10);
});
