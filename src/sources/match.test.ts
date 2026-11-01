import { describe, expect, test } from "vitest";
import { matchRanking } from "./match";
import type { PlayerDTO, RankingDTO } from "./types";

const player = (name: string, team: string | null, position: string, id = name): PlayerDTO => ({
  externalId: id, name, team, positions: [position], status: null,
});
const rank = (name: string, team: string | null, position: string): RankingDTO => ({
  name, team, position, adp: 10, teams: 12, format: "ppr", season: 2025,
});

describe("matchRanking", () => {
  test("ignores name suffixes and punctuation", () => {
    const players = [player("Kenneth Walker", "SEA", "RB"), player("Ja'Marr Chase", "CIN", "WR")];
    expect(matchRanking(rank("Kenneth Walker III", "SEA", "RB"), players)?.name).toBe("Kenneth Walker");
    expect(matchRanking(rank("JaMarr Chase", "CIN", "WR"), players)?.name).toBe("Ja'Marr Chase");
  });

  test("same name on two teams is settled by team", () => {
    const a = player("Mike Williams", "NYJ", "WR", "a");
    const b = player("Mike Williams", "PIT", "WR", "b");
    expect(matchRanking(rank("Mike Williams", "PIT", "WR"), [a, b])).toBe(b);
  });

  test("no candidate returns null, never a guess", () => {
    expect(matchRanking(rank("Nobody Real", "SEA", "RB"), [player("Someone Else", "SEA", "RB")])).toBeNull();
  });

  test("still ambiguous after team and position returns null", () => {
    const a = player("Mike Williams", "PIT", "WR", "a");
    const b = player("Mike Williams", "PIT", "WR", "b");
    expect(matchRanking(rank("Mike Williams", "PIT", "WR"), [a, b])).toBeNull();
  });

  test("position must agree", () => {
    expect(matchRanking(rank("Taysom Hill", "NO", "TE"), [player("Taysom Hill", "NO", "QB")])).toBeNull();
  });
});
