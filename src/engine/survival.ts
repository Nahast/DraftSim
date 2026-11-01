import { SURVIVAL_SIGMA_BASE, SURVIVAL_SIGMA_SLOPE } from "./weights";
import type { PlayerView } from "./types";

// Abramowitz-Stegun 7.1.26 approximation, max error ~1.5e-7.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Chance the player is still available at my next pick, in [0, 1]. */
export function survivalChance(player: PlayerView, picksUntilMine: number, currentOverall: number): number {
  if (picksUntilMine === 0) return 1;
  if (!Number.isFinite(picksUntilMine)) return 0;
  if (player.adp === null) return 0.5;
  const sigma = SURVIVAL_SIGMA_BASE + player.adp * SURVIVAL_SIGMA_SLOPE;
  const z = (player.adp - (currentOverall + picksUntilMine)) / (sigma * Math.SQRT2);
  return (1 + erf(z)) / 2;
}
