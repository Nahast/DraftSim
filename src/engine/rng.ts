/** Deterministic random numbers in [0, 1): the same seed string always gives the same sequence (mulberry32). */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal from two uniforms (Box-Muller). A constant 0.5 generator yields exactly 0. */
export function gaussian(rng: () => number): number {
  const u = 1 - rng(); // (0, 1], keeps log finite
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);
}
