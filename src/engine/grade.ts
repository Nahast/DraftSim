import { openSlots, stillNeeded } from "./roster";
import { GRADE_CUTS, STEAL_MARGIN } from "./weights";
import type { PlayerView, Rules } from "./types";

export type Grade = {
  letter: "A" | "B" | "C" | "D";
  score: number;
  strengths: string[];
  weaknesses: string[];
  steals: { name: string; overall: number; adp: number }[];
};

/**
 * Plain-language grade for my picks. Score = lineup completeness x (60% + 40% value): a team missing
 * positions cannot be rescued by good value, and an empty team scores 0.
 */
export function gradeDraft(mine: { player: PlayerView; overall: number }[], rules: Rules): Grade {
  if (mine.length === 0) {
    return { letter: "D", score: 0, strengths: [], weaknesses: ["You have not drafted anyone yet"], steals: [] };
  }
  const players = [...mine].sort((a, b) => a.overall - b.overall).map((m) => m.player);
  const open = openSlots(players, rules);
  const needs = stillNeeded(open, rules);
  const starters = rules.rosterSlots.filter((s) => s.slot !== "BENCH").reduce((sum, s) => sum + s.count, 0);
  const lineup = starters === 0 ? 1 : (starters - needs.length) / starters;

  const ranked = mine.filter((m) => m.player.adp !== null);
  const atOrAfter = ranked.filter((m) => m.overall >= m.player.adp!).length;
  const value = ranked.length === 0 ? 0.5 : atOrAfter / ranked.length; // no ADP data: neutral

  const score = lineup * (0.6 + 0.4 * value);
  const letter = score >= GRADE_CUTS[0] ? "A" : score >= GRADE_CUTS[1] ? "B" : score >= GRADE_CUTS[2] ? "C" : "D";

  const steals = ranked
    .filter((m) => m.overall - m.player.adp! >= STEAL_MARGIN)
    .sort((a, b) => b.overall - b.player.adp! - (a.overall - a.player.adp!))
    .map((m) => ({ name: m.player.name, overall: m.overall, adp: m.player.adp! }));

  const have = (pos: string) => players.filter((p) => p.positions[0] === pos).length;
  const weaknesses = [...new Set(needs)].map((slot) =>
    slot === "FLEX" ? "Need a FLEX player" : have(slot) === 0 ? `No ${slot}` : `Need another ${slot}`,
  );
  const strengths = [
    ...(needs.length === 0 ? ["Your starting lineup is full"] : []),
    ...(steals.length ? [`${steals.length === 1 ? "A player" : `${steals.length} players`} went well after their ranking, which is good value`] : []),
    ...(value >= 0.75 && ranked.length >= 3 ? ["You rarely reached for players above their ranking"] : []),
  ];
  return { letter, score, strengths, weaknesses, steals };
}
