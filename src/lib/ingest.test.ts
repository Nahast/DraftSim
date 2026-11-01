import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { ingestNfl } from "./ingest";
import type { PlayerDTO, PlayerSource, RankingDTO, RankingSource } from "@/sources/types";

const NOW = new Date("2026-11-01T12:00:00Z");
const dto = (id: string, name: string, team: string, position: string): PlayerDTO => ({
  externalId: id, name, team, positions: [position], status: "Active",
});
const players = (list: PlayerDTO[]): PlayerSource => ({ sport: "NFL", fetchPlayers: async () => list });
const rankings = (rows: Omit<RankingDTO, "teams" | "format" | "season">[]): RankingSource => ({
  sport: "NFL",
  fetchRankings: async ({ season, teams, format }) => rows.map((r) => ({ ...r, teams, format, season })),
});
const failing = (msg: string): RankingSource => ({ sport: "NFL", fetchRankings: async () => { throw new Error(msg); } });
const base = { db: testDb, now: NOW, season: 2026, teams: [12], formats: ["ppr" as const] };

const LAMB = dto("1", "CeeDee Lamb", "DAL", "WR");
const CHASE = dto("2", "Ja'Marr Chase", "CIN", "WR");

beforeEach(resetDb);

describe("ingestNfl", () => {
  test("stores players and rankings and marks both sources fresh", async () => {
    const r = await ingestNfl({
      ...base,
      players: players([LAMB, CHASE]),
      rankings: rankings([
        { name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 3 },
        { name: "JaMarr Chase", team: "CIN", position: "WR", adp: 1.5 },
      ]),
    });
    expect(r).toMatchObject({ players: 2, rankings: 2, unmatched: 0, errors: [] });
    expect(await testDb.player.count()).toBe(2);
    expect(await testDb.playerRanking.count()).toBe(2);
    const sync = await testDb.sourceSync.findMany({ orderBy: { source: "asc" } });
    expect(sync.map((s) => [s.source, s.lastOk?.toISOString(), s.lastError])).toEqual([
      ["ffc", NOW.toISOString(), null],
      ["sleeper", NOW.toISOString(), null],
    ]);
  });

  test("counts unmatched ranking rows and does not insert them", async () => {
    const r = await ingestNfl({
      ...base,
      players: players([LAMB]),
      rankings: rankings([
        { name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 3 },
        { name: "Nobody Real", team: "SEA", position: "RB", adp: 50 },
      ]),
    });
    expect(r).toMatchObject({ rankings: 1, unmatched: 1 });
    expect(await testDb.playerRanking.count()).toBe(1);
  });

  test("running twice does not duplicate players or rankings", async () => {
    const deps = {
      ...base,
      players: players([LAMB]),
      rankings: rankings([{ name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 3 }]),
    };
    await ingestNfl(deps);
    await ingestNfl({ ...deps, rankings: rankings([{ name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 4 }]) });
    expect(await testDb.player.count()).toBe(1);
    const rows = await testDb.playerRanking.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].adp).toBe(4);
  });

  test("a failing ranking source keeps old rows and records the error", async () => {
    const good = {
      ...base,
      players: players([LAMB]),
      rankings: rankings([{ name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 3 }]),
    };
    await ingestNfl(good);
    const r = await ingestNfl({ ...good, now: new Date("2026-11-02T12:00:00Z"), rankings: failing("FFC HTTP 500") });
    expect(r.errors).toHaveLength(1);
    expect(await testDb.playerRanking.count()).toBe(1);
    const ffc = await testDb.sourceSync.findUniqueOrThrow({ where: { source: "ffc" } });
    expect(ffc.lastError).toContain("FFC HTTP 500");
    expect(ffc.lastOk?.toISOString()).toBe(NOW.toISOString());
  });

  test("a failing player source keeps old players and still matches rankings against them", async () => {
    await ingestNfl({ ...base, players: players([LAMB]), rankings: rankings([]) });
    const broken: PlayerSource = { sport: "NFL", fetchPlayers: async () => { throw new Error("Sleeper HTTP 503"); } };
    const r = await ingestNfl({
      ...base,
      players: broken,
      rankings: rankings([{ name: "CeeDee Lamb", team: "DAL", position: "WR", adp: 3 }]),
    });
    expect(r.errors).toHaveLength(1);
    expect(r.rankings).toBe(1);
    const s = await testDb.sourceSync.findUniqueOrThrow({ where: { source: "sleeper" } });
    expect(s.lastError).toContain("Sleeper HTTP 503");
  });
});
