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
