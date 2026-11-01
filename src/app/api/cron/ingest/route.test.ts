import { expect, test } from "vitest";
import { GET } from "./route";

test("refuses requests without the cron secret", async () => {
  process.env.CRON_SECRET = "s3cret";
  expect((await GET(new Request("http://x/api/cron/ingest"))).status).toBe(401);
  expect((await GET(new Request("http://x/api/cron/ingest", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
});

test("refuses everything when no secret is configured", async () => {
  delete process.env.CRON_SECRET;
  expect((await GET(new Request("http://x/api/cron/ingest", { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
});
