import { beforeEach, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { GET } from "./route";

beforeEach(resetDb);

test("lists each source with its freshness", async () => {
  await testDb.sourceSync.create({ data: { source: "ffc", lastOk: new Date("2026-11-04T09:00:00Z"), lastError: "HTTP 500" } });
  const body = await (await GET()).json();
  expect(body.sources).toEqual([{ source: "ffc", lastOk: "2026-11-04T09:00:00.000Z", lastError: "HTTP 500" }]);
});

test("an empty table gives an empty list", async () => {
  expect((await (await GET()).json()).sources).toEqual([]);
});
