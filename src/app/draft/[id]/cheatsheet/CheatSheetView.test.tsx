// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NFL_DEFAULT_SLOTS } from "@/engine/sports";
import type { PlayerView, Position } from "@/engine/types";
import { CheatSheetView } from "./CheatSheetView";

const POSITIONS: Position[] = ["QB", "RB", "WR", "RB", "WR", "WR", "TE", "RB", "WR", "QB", "RB", "WR", "WR", "RB", "TE", "WR", "RB", "K", "DEF", "WR"];
const makePool = (size: number): PlayerView[] =>
  Array.from({ length: size }, (_, i) => ({ id: `s${i}`, name: `Sheet Player ${i}`, team: "AAA", positions: [POSITIONS[i % 20]], adp: i + 1, projection: null }));
const rules = { teams: 12, rounds: 15, snake: true, scoring: "ppr" as const, rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 6 };
let players: PlayerView[];
vi.mock("@/lib/useDraft", () => ({
  useDraft: () => ({
    ready: true, notFound: false, failed: false, rules,
    draft: { id: "d1", mode: "LIVE", experience: "BEGINNER", teams: 12, rounds: 15, myPosition: 6 },
    state: { players, picks: [] },
  }),
}));
vi.mock("@/components/DataStatus", () => ({ DataStatusLoader: () => <p>data status</p> }));

beforeEach(() => { players = makePool(260); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test("beginner view: exactly three plan sentences and no tier tables", () => {
  render(<CheatSheetView id="d1" />);
  const plan = screen.getByRole("region", { name: "Your plan" });
  expect(within(plan).getAllByRole("listitem")).toHaveLength(3);
  expect(screen.queryAllByRole("table")).toHaveLength(0);
});

test("every planned pick names its position as text", () => {
  render(<CheatSheetView id="d1" />);
  const rows = within(screen.getByRole("list", { name: "Round by round" })).getAllByRole("listitem");
  expect(rows).toHaveLength(15);
  for (const row of rows) expect(row.textContent).toMatch(/\b(QB|RB|WR|TE|K|DEF)\b/);
});

test("pro view adds a tier table for each position with tier numbers", () => {
  render(<CheatSheetView id="d1" />);
  fireEvent.click(screen.getByRole("button", { name: "Pro" }));
  for (const name of ["QB", "RB", "WR", "TE", "K", "DEF"]) {
    const table = screen.getByRole("table", { name: `${name} tiers` });
    expect(within(table).getAllByText(/^Tier 1$/)).toHaveLength(1);
  }
});

test("Print calls window.print", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<CheatSheetView id="d1" />);
  fireEvent.click(screen.getByRole("button", { name: "Print" }));
  expect(print).toHaveBeenCalledOnce();
});

test("with no player data it says so instead of showing empty tables", () => {
  players = [];
  render(<CheatSheetView id="d1" />);
  fireEvent.click(screen.getByRole("button", { name: "Pro" }));
  expect(screen.getAllByText(/We need more player data/).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole("table")).toHaveLength(0);
});

test("shows where the data comes from", () => {
  render(<CheatSheetView id="d1" />);
  expect(screen.getByText("data status")).toBeTruthy();
});
