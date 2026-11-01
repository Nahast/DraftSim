import { beforeEach, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { GET } from "./route";

beforeEach(resetDb);

test("lists each source with its freshness", async () => {
  await testDb.sourceSync.create({ data: { source: "ffc", lastOk: new Date("2026-11-04T09:00:00Z"), lastError: "HTTP 500" } });
  const body = await (await GET()).json();
  // Raw error text can name internal URLs; the public endpoint only says that a failure happened.
  expect(body.sources).toEqual([{ source: "ffc", lastOk: "2026-11-04T09:00:00.000Z", failed: true }]);
  expect(JSON.stringify(body)).not.toContain("HTTP 500");
});

test("an empty table gives an empty list", async () => {
  expect((await (await GET()).json()).sources).toEqual([]);
});
