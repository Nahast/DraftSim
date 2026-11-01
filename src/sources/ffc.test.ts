import { describe, expect, test } from "vitest";
import fixture from "./fixtures/ffc-adp.json";
import { ffcRankings } from "./ffc";

const respond = (body: unknown, onUrl?: (u: string) => void, status = 200) =>
  (async (u: RequestInfo | URL) => { onUrl?.(String(u)); return new Response(JSON.stringify(body), { status }); }) as typeof fetch;

describe("ffcRankings", () => {
  test("maps the fixture to RankingDTO", async () => {
    const out = await ffcRankings(respond(fixture)).fetchRankings({ season: 2025, teams: 12, format: "ppr" });
    expect(out).toHaveLength(30);
    expect(out[0]).toEqual({ name: "Ja'Marr Chase", team: "CIN", position: "WR", adp: 1.5, teams: 12, format: "ppr", season: 2025 });
  });

  test("asks FFC for the right format, teams and year", async () => {
    let url = "";
    await ffcRankings(respond(fixture, (u) => (url = u))).fetchRankings({ season: 2026, teams: 10, format: "half" });
    expect(url).toContain("/adp/half-ppr");
    expect(url).toContain("teams=10");
    expect(url).toContain("year=2026");
  });

  test("labels rows with the league size FFC reports, not the one requested", async () => {
    const out = await ffcRankings(respond(fixture)).fetchRankings({ season: 2025, teams: 10, format: "ppr" });
    expect(out.every((r) => r.teams === 12)).toBe(true);
  });

  test("normalises PK to K and drops rows without an ADP", async () => {
    const body = { status: "Success", players: [
      { name: "Kicker One", position: "PK", team: "AAA", adp: 150 },
      { name: "No Adp", position: "RB", team: "BBB" },
    ] };
    const out = await ffcRankings(respond(body)).fetchRankings({ season: 2025, teams: 12, format: "ppr" });
    expect(out).toEqual([expect.objectContaining({ name: "Kicker One", position: "K" })]);
  });

  test("throws when FFC does not report Success", async () => {
    await expect(ffcRankings(respond({ status: "Fail", players: [] })).fetchRankings({ season: 2025, teams: 12, format: "ppr" })).rejects.toThrow();
  });
});
