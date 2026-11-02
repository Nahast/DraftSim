import { expect, test } from "vitest";
import { openSlots, seatPlayers, stillNeeded } from "./roster";
import { NFL_DEFAULT_SLOTS } from "./sports";
import type { PlayerView, Position, Rules } from "./types";

const rules: Rules = { teams: 12, rounds: 15, snake: true, scoring: "ppr", rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 1 };
const p = (pos: Position): PlayerView => ({ id: pos, name: pos, team: null, positions: [pos], adp: null, projection: null });

test("an empty roster still needs every starting slot, never the bench", () => {
  expect(stillNeeded(openSlots([], rules), rules)).toEqual(["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]);
});

test("a third receiver fills FLEX before the bench", () => {
  const open = openSlots([p("WR"), p("WR"), p("WR")], rules);
  expect(open.get("WR")).toBe(0);
  expect(open.get("FLEX")).toBe(0);
  expect(open.get("BENCH")).toBe(6);
});

test("a full set of starters needs nothing", () => {
  const mine = [p("QB"), p("RB"), p("RB"), p("WR"), p("WR"), p("TE"), p("RB"), p("K"), p("DEF")];
  expect(stillNeeded(openSlots(mine, rules), rules)).toEqual([]);
});

test("seatPlayers: rows follow roster order, seating own position, then FLEX, then BENCH, empty seats null", () => {
  const rb = (id: string): PlayerView => ({ id, name: id, team: null, positions: ["RB"], adp: 1, projection: null });
  const rows = seatPlayers([rb("a"), rb("b"), rb("c"), rb("d")], rules);
  const at = (slot: string) => rows.filter((r) => r.slot === slot).map((r) => r.player?.id ?? null);
  expect(at("RB")).toEqual(["a", "b"]);
  expect(at("FLEX")).toEqual(["c"]);
  expect(at("BENCH")).toEqual(["d", null, null, null, null, null]);
  expect(at("QB")).toEqual([null]);
});
