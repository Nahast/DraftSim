import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "@/test/db";
import { POST as createDraft } from "./route";
import { GET as getDraft } from "./[id]/route";
import { POST as logPick } from "./[id]/picks/route";
import { DELETE as undoPick } from "./[id]/picks/last/route";
import { GET as getPlayers } from "../players/route";

let ip = 0;
const req = (method: string, body?: unknown, who = `10.0.0.${++ip}`) =>
  new Request("http://x/api", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": who },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const draftBody = { sport: "NFL", experience: "BEGINNER", app: "espn", teams: 12, myPosition: 3, scoring: "ppr" };

async function newDraft(over: Record<string, unknown> = {}) {
  const res = await createDraft(req("POST", { ...draftBody, ...over }));
  return (await res.json()).id as string;
}
async function seedPlayers(n: number) {
  const rows = Array.from({ length: n }, (_, i) => ({
    sport: "NFL" as const, name: `Player ${i}`, team: "AAA", positions: ["RB"], externalIds: { sleeper: String(i) },
  }));
  await testDb.player.createMany({ data: rows });
  return (await testDb.player.findMany({ orderBy: { name: "asc" } })).map((p) => p.id);
}

beforeEach(resetDb);

describe("drafts", () => {
  test("create then load round-trips with defaults", async () => {
    const id = await newDraft();
    const res = await getDraft(req("GET"), ctx(id));
    expect(res.status).toBe(200);
    const draft = await res.json();
    expect(draft).toMatchObject({ id, teams: 12, myPosition: 3, rounds: 15, snake: true, scoring: "ppr", picks: [] });
    expect(draft.rosterSlots).toContainEqual({ slot: "QB", count: 1 });
  });

  test("rejects league sizes and slots that make no sense", async () => {
    for (const bad of [{ teams: 1 }, { teams: 40 }, { myPosition: 13 }, { myPosition: 0 }, { sport: "NBA" }]) {
      expect((await createDraft(req("POST", { ...draftBody, ...bad }))).status).toBe(400);
    }
  });

  test("unknown draft is 404", async () => {
    expect((await getDraft(req("GET"), ctx("nope"))).status).toBe(404);
  });

  test("the 11th create from one IP in a minute is 429", async () => {
    const who = "9.9.9.9";
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await createDraft(req("POST", draftBody, who))).status);
    expect(codes.slice(0, 10).every((c) => c === 201)).toBe(true);
    expect(codes[10]).toBe(429);
  });
});

describe("picks", () => {
  test("a logged pick takes the next overall and defaults to the team on the clock", async () => {
    const id = await newDraft();
    const [p1, p2] = await seedPlayers(2);
    expect((await logPick(req("POST", { playerId: p1 }), ctx(id))).status).toBe(201);
    const second = await logPick(req("POST", { playerId: p2 }), ctx(id));
    expect(await second.json()).toMatchObject({ overall: 2, team: 2, playerId: p2 });
  });

  test("snake order: pick 13 of 12 teams defaults to team 12", async () => {
    const id = await newDraft();
    const ids = await seedPlayers(13);
    for (const pid of ids.slice(0, 12)) await logPick(req("POST", { playerId: pid }), ctx(id));
    const res = await logPick(req("POST", { playerId: ids[12] }), ctx(id));
    expect(await res.json()).toMatchObject({ overall: 13, team: 12 });
  });

  test("the same player twice is 409 and the pick count stays", async () => {
    const id = await newDraft();
    const [p1] = await seedPlayers(1);
    await logPick(req("POST", { playerId: p1 }), ctx(id));
    expect((await logPick(req("POST", { playerId: p1 }), ctx(id))).status).toBe(409);
    expect(await testDb.draftPick.count()).toBe(1);
  });

  test("concurrent picks never share an overall number", async () => {
    const id = await newDraft();
    const ids = await seedPlayers(4);
    const results = await Promise.all(ids.map((pid) => logPick(req("POST", { playerId: pid }), ctx(id))));
    const codes = results.map((r) => r.status);
    expect(codes.every((c) => c === 201 || c === 409)).toBe(true);
    const rows = await testDb.draftPick.findMany();
    expect(rows.length).toBe(codes.filter((c) => c === 201).length);
    expect(new Set(rows.map((r) => r.overall)).size).toBe(rows.length);
  });

  test("unknown player is 404 and a full draft is 409", async () => {
    const id = await newDraft({ teams: 2, rounds: 1, myPosition: 1 });
    const ids = await seedPlayers(3);
    expect((await logPick(req("POST", { playerId: "ghost" }), ctx(id))).status).toBe(404);
    await logPick(req("POST", { playerId: ids[0] }), ctx(id));
    await logPick(req("POST", { playerId: ids[1] }), ctx(id));
    expect((await logPick(req("POST", { playerId: ids[2] }), ctx(id))).status).toBe(409);
  });

  test("racing new picks against undos never leaves a gap in the pick numbers", async () => {
    const id = await newDraft();
    const ids = await seedPlayers(60);
    let next = 0;
    for (const pid of ids.slice(0, 5)) { await logPick(req("POST", { playerId: pid }), ctx(id)); next++; }
    for (let round = 0; round < 8; round++) {
      const results = await Promise.all([
        logPick(req("POST", { playerId: ids[next++] }), ctx(id)),
        undoPick(req("DELETE"), ctx(id)),
        undoPick(req("DELETE"), ctx(id)),
      ]);
      const bad = results.filter((r) => ![200, 201, 404, 409].includes(r.status));
      expect(bad.map((r) => r.status), JSON.stringify(await Promise.all(bad.map((r) => r.text())))).toEqual([]); // never a 500
      const overalls = (await testDb.draftPick.findMany({ orderBy: { overall: "asc" } })).map((p) => p.overall);
      expect(overalls).toEqual(overalls.map((_, i) => i + 1));
      for (const pid of ids.slice(next, next + 3)) { await logPick(req("POST", { playerId: pid }), ctx(id)); next++; }
    }
  });

  test("undo removes the latest pick, and is 404 on an empty draft", async () => {
    const id = await newDraft();
    expect((await undoPick(req("DELETE"), ctx(id))).status).toBe(404);
    const [p1, p2] = await seedPlayers(2);
    await logPick(req("POST", { playerId: p1 }), ctx(id));
    await logPick(req("POST", { playerId: p2 }), ctx(id));
    const res = await undoPick(req("DELETE"), ctx(id));
    expect(await res.json()).toMatchObject({ overall: 2 });
    expect(await testDb.draftPick.count()).toBe(1);
  });
});

describe("GET /api/players", () => {
  test("returns ranked players with ADP from the season with the most rows for that format", async () => {
    const [a, b, c] = await seedPlayers(3);
    const row = (playerId: string, season: number, adp: number) => ({
      playerId, source: "ffc", season, format: "ppr", teams: 12, adp, fetchedAt: new Date(),
    });
    await testDb.playerRanking.createMany({
      data: [row(a, 2026, 99), row(a, 2025, 1.5), row(b, 2025, 2.5), row(c, 2025, 3.5)],
    });
    const res = await getPlayers(new Request("http://x/api/players?sport=NFL&format=ppr&teams=12"));
    const list = await res.json();
    expect(list).toHaveLength(3);
    expect(list.find((p: { id: string }) => p.id === a).adp).toBe(1.5);
  });

  test("players with no ADP are still in the pool, after the ranked ones, so any pick can be logged", async () => {
    const [a, b, c] = await seedPlayers(3);
    await testDb.playerRanking.create({ data: { playerId: b, source: "ffc", season: 2025, format: "ppr", teams: 12, adp: 5, fetchedAt: new Date() } });
    const list = await (await getPlayers(new Request("http://x/api/players?sport=NFL&format=ppr&teams=12"))).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual([b, a, c]);
    expect(list[1].adp).toBeNull();
  });

  test("with no rankings at all the players are still returned", async () => {
    await seedPlayers(2);
    const list = await (await getPlayers(new Request("http://x/api/players?sport=NFL&format=ppr&teams=12"))).json();
    expect(list).toHaveLength(2);
  });

  test("an empty database gives an empty list, not an error", async () => {
    const res = await getPlayers(new Request("http://x/api/players?sport=NFL&format=ppr&teams=12"));
    expect(await res.json()).toEqual([]);
  });
});
