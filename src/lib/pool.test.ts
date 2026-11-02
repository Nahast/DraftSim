import { beforeEach, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { loadPool } from "./pool";

beforeEach(resetDb);

test("ranked players come first by ADP, unranked ones last", async () => {
  const mk = (name: string) =>
    testDb.player.create({ data: { sport: "NFL", name, team: "AAA", positions: ["RB"], externalIds: {} } });
  const [late, unranked, early] = [await mk("Late"), await mk("Unranked"), await mk("Early")];
  const row = (playerId: string, adp: number) => ({
    playerId, source: "ffc", season: 2025, format: "ppr", teams: 12, adp, rank: null, projection: null, fetchedAt: new Date(),
  });
  await testDb.playerRanking.createMany({ data: [row(late.id, 40), row(early.id, 2)] });
  const pool = await loadPool(testDb, { format: "ppr", teams: 12 });
  expect(pool.map((p) => p.id)).toEqual([early.id, late.id, unranked.id]);
  expect(pool[2].adp).toBeNull();
});
