import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { POST as createDraft } from "./route";
import { GET as getDraft } from "./[id]/route";
import { POST as logPick } from "./[id]/picks/route";
import { DELETE as undoPick } from "./[id]/picks/last/route";
import { POST as advance } from "./[id]/advance/route";

let ip = 0;
const req = (method: string, body?: unknown) =>
  new Request("http://x/api", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const base = { sport: "NFL", experience: "BEGINNER", app: "other", teams: 12, myPosition: 3, scoring: "ppr", mode: "MOCK" };

const newDraft = async (over: Record<string, unknown> = {}) =>
  (await (await createDraft(req("POST", { ...base, ...over }))).json()).id as string;
const picksOf = async (id: string) => (await (await getDraft(req("GET"), ctx(id))).json()).picks as
  { overall: number; team: number; playerId: string; source: string }[];
const adv = async (id: string) => {
  const res = await advance(req("POST"), ctx(id));
  return { status: res.status, body: await res.json() };
};
const pick = (id: string, playerId: string, team?: number) => logPick(req("POST", { playerId, team }), ctx(id));

/** n ranked players, best ADP first, returned best first. */
async function seed(n: number) {
  const pos = ["QB", "RB", "WR", "RB", "WR", "TE"];
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = await testDb.player.create({
      data: { sport: "NFL", name: `P${String(i).padStart(3, "0")}`, team: "AAA", positions: [pos[i % pos.length]], externalIds: {} },
    });
    await testDb.playerRanking.create({
      data: { playerId: p.id, source: "ffc", season: 2025, format: "ppr", teams: 12, adp: i + 1, rank: null, projection: null, fetchedAt: new Date() },
    });
    ids.push(p.id);
  }
  return ids;
}

beforeEach(resetDb);

describe("mock drafts", () => {
  test("mode is stored, and defaults to LIVE", async () => {
    const mock = await newDraft();
    expect((await (await getDraft(req("GET"), ctx(mock))).json()).mode).toBe("MOCK");
    const live = await newDraft({ mode: undefined });
    expect((await (await getDraft(req("GET"), ctx(live))).json()).mode).toBe("LIVE");
  });

  test("slot 3 of 12: advance makes bot picks 1 and 2, stops on my turn, and a second call adds nothing", async () => {
    await seed(40);
    const id = await newDraft();
    expect(await adv(id)).toEqual({ status: 200, body: { added: 2, complete: false } });
    const picks = await picksOf(id);
    expect(picks.map((p) => [p.overall, p.team, p.source])).toEqual([[1, 1, "bot"], [2, 2, "bot"]]);
    expect((await adv(id)).body.added).toBe(0);
  });

  test("slot 1: nothing to advance at the start, then 22 bot picks after mine, stopping at overall 24", async () => {
    const ids = await seed(40);
    const id = await newDraft({ myPosition: 1 });
    expect((await adv(id)).body.added).toBe(0);
    expect((await pick(id, ids[0])).status).toBe(201);
    expect((await adv(id)).body.added).toBe(22);
    expect((await picksOf(id)).length).toBe(23);
  });

  test("slot 12: after my pick at overall 12 there is nothing to advance, because 13 is mine too", async () => {
    const ids = await seed(40);
    const id = await newDraft({ myPosition: 12 });
    expect((await adv(id)).body.added).toBe(11);
    expect((await pick(id, ids[20])).status).toBe(201);
    expect((await adv(id)).body.added).toBe(0);
  });

  test("a 2 team, 1 round draft completes after my pick, or on a bot's final pick", async () => {
    const ids = await seed(10);
    const mineLast = await newDraft({ teams: 2, rounds: 1, myPosition: 2 });
    expect((await adv(mineLast)).body).toEqual({ added: 1, complete: false });
    await pick(mineLast, ids[5]);
    expect(await adv(mineLast)).toEqual({ status: 200, body: { added: 0, complete: true } });

    const botLast = await newDraft({ teams: 2, rounds: 1, myPosition: 1 });
    await pick(botLast, ids[6]);
    expect((await adv(botLast)).body).toEqual({ added: 1, complete: true });
  });

  test("simultaneous advances never duplicate, skip, or pick for me", async () => {
    await seed(40);
    const id = await newDraft({ myPosition: 12 });
    const results = await Promise.all([adv(id), adv(id), adv(id), adv(id)]);
    for (const r of results) expect([200, 409]).toContain(r.status);
    const picks = await picksOf(id);
    expect(picks.map((p) => p.overall)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
    expect(new Set(picks.map((p) => p.playerId)).size).toBe(picks.length);
    expect(picks.some((p) => p.team === 12)).toBe(false);
  });

  test("a pool smaller than the picks needed stops without error", async () => {
    await seed(5);
    const id = await newDraft({ myPosition: 12 });
    const r = await adv(id);
    expect(r.status).toBe(200);
    expect(r.body.complete).toBe(false);
    expect(r.body.added).toBeLessThanOrEqual(5);
  });

  test("a live draft refuses advance and writes nothing", async () => {
    await seed(10);
    const id = await newDraft({ mode: "LIVE" });
    expect((await adv(id)).status).toBe(409);
    expect(await picksOf(id)).toEqual([]);
  });

  test("unknown draft is 404", async () => {
    expect((await adv("nope")).status).toBe(404);
  });

  test("in a mock, a manual pick for another team is 400 and a pick while a bot is on the clock is 409", async () => {
    const ids = await seed(40);
    const id = await newDraft(); // slot 3, bot on the clock
    expect((await pick(id, ids[0], 5)).status).toBe(400);
    expect((await pick(id, ids[0])).status).toBe(409);
    expect(await picksOf(id)).toEqual([]);
  });

  test("naming my own slot does not let me pick out of turn", async () => {
    const ids = await seed(40);
    const id = await newDraft(); // slot 3, team 1 is on the clock
    expect((await pick(id, ids[0], 3)).status).toBe(409);
    expect(await picksOf(id)).toEqual([]);
  });

  test("undo rewinds to my latest pick: it and every bot pick after it are removed", async () => {
    const ids = await seed(40);
    const id = await newDraft(); // slot 3
    await adv(id);
    await pick(id, ids[38]); // overall 3
    await adv(id); // bots 4..21
    await pick(id, ids[39]); // overall 22
    await adv(id); // bots 23..26, my next turn is 27
    expect((await picksOf(id)).length).toBe(26);
    const res = await undoPick(req("DELETE"), ctx(id));
    expect(await res.json()).toEqual({ overall: 22 });
    const after = await picksOf(id);
    expect(after.length).toBe(21);
    expect(after.some((p) => p.team === 3 && p.overall === 22)).toBe(false);
  });

  test("undo with none of my picks removes the bot picks", async () => {
    await seed(40);
    const id = await newDraft();
    await adv(id);
    expect((await undoPick(req("DELETE"), ctx(id))).status).toBe(200);
    expect(await picksOf(id)).toEqual([]);
  });
});
