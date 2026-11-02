// Tunable constants for the recommendation engine. Keep every number here.
export const SURVIVAL_SIGMA_BASE = 2;
export const SURVIVAL_SIGMA_SLOPE = 0.1;
export const RANK_VALUE_BASE = 300; // value of a player when only ADP is known: BASE - adp
export const NEED_BOOST = 25; // a starter slot at this position is open
export const FLEX_BOOST = 10; // only the FLEX slot is open
export const BENCH_PENALTY = 40; // only bench room left
export const SCARCITY_WEIGHT = 15;
export const SURVIVAL_WEIGHT = 20;
export const LIKELY_GONE_BELOW = 0.5;

// Mock-draft bots: noise on ADP grows with ADP (late picks are less predictable).
export const BOT_NOISE_BASE = 2;
export const BOT_NOISE_SLOPE = 0.12;
export const BOT_LATE_ROUNDS = 2; // K and DEF only in this many final rounds

// Draft grade: cut-offs on a 0..1 score for A, B and C (below the last is D), and how many picks after
// his ADP a player must go to count as a steal.
export const GRADE_CUTS = [0.85, 0.7, 0.55] as const;
export const STEAL_MARGIN = 6;

// Cheat sheet: a new tier starts when ADP jumps by more than BASE + previous ADP * SLOPE; the plan lists
// this many alternates per pick.
export const TIER_GAP_BASE = 4;
export const TIER_GAP_SLOPE = 0.06;
export const PLAN_ALTERNATES = 2;
