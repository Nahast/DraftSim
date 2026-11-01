import { describe, expect, test } from "vitest";
import fixture from "./fixtures/sleeper-players.json";
import { sleeperPlayers } from "./sleeper";

const respond = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe("sleeperPlayers", () => {
  test("keeps fantasy-relevant players and drops other positions", async () => {
    const out = await sleeperPlayers(respond(fixture)).fetchPlayers();
    expect(out.length).toBeGreaterThan(20);
    const lamb = out.find((p) => p.name === "CeeDee Lamb");
    expect(lamb).toMatchObject({ externalId: "6786", team: "DAL", positions: ["WR"] });
    for (const p of out) expect(p.positions.length).toBeGreaterThan(0);
    expect(out.some((p) => p.positions.includes("LB") || p.positions.includes("OL"))).toBe(false);
  });

  test("drops a row that fails validation but keeps the rest", async () => {
    const bad = { ...fixture, "999": { player_id: 999, position: "QB" } };
    const clean = await sleeperPlayers(respond(fixture)).fetchPlayers();
    const out = await sleeperPlayers(respond(bad)).fetchPlayers();
    expect(out.length).toBe(clean.length);
  });

  test("drops retired players (active false)", async () => {
    const retired = { ...fixture, "888": { player_id: "888", full_name: "Old Timer", position: "QB", fantasy_positions: ["QB"], team: null, status: "Inactive", active: false } };
    const out = await sleeperPlayers(respond(retired)).fetchPlayers();
    expect(out.some((p) => p.name === "Old Timer")).toBe(false);
  });

  test("throws on an HTTP error so ingestion can record it", async () => {
    await expect(sleeperPlayers(respond({}, 503)).fetchPlayers()).rejects.toThrow(/503/);
  });
});
