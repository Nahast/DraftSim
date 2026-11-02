// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NFL_DEFAULT_SLOTS } from "@/engine/sports";
import type { PlayerView, Position } from "@/engine/types";
import { ResultsView } from "./ResultsView";

const pl = (id: string, pos: Position, name: string, adp: number): PlayerView => ({ id, name, team: "AAA", positions: [pos], adp, projection: null });
const players = [pl("a", "QB", "Quinn Back", 5), pl("b", "RB", "Rex Runner", 2), pl("c", "RB", "Ray Rush", 9)];
const rules = { teams: 2, rounds: 3, snake: true, scoring: "ppr" as const, rosterSlots: NFL_DEFAULT_SLOTS, myPosition: 1 };
vi.mock("@/components/DataStatus", () => ({ DataStatusLoader: () => null }));
let mode: "LIVE" | "MOCK";
vi.mock("@/lib/useDraft", () => ({
  useDraft: () => ({
    ready: true, notFound: false, failed: false, complete: true, mode, rules,
    draft: { id: "d1", mode, teams: 2, rounds: 3, myPosition: 1 },
    state: {
      players,
      picks: [
        { overall: 1, team: 1, playerId: "b" },
        { overall: 2, team: 2, playerId: "a" },
        { overall: 3, team: 2, playerId: "x" },
        { overall: 4, team: 1, playerId: "c" },
      ],
    },
  }),
}));

beforeEach(() => { mode = "MOCK"; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("shows the grade, my roster by slot with Open seats, and plain-language findings", () => {
  render(<ResultsView id="d1" />);
  expect(screen.getByLabelText("Grade").textContent).toMatch(/^[ABCD]$/);
  expect(screen.getByText("Rex Runner")).toBeTruthy();
  expect(screen.getByText("Ray Rush")).toBeTruthy();
  expect(screen.getAllByText("Open").length).toBeGreaterThan(0); // QB, WR, TE, ... are empty
  expect(screen.getByText("No QB")).toBeTruthy();
  expect(screen.getByText("Practice")).toBeTruthy();
});

test("a real draft is not tagged Practice", () => {
  mode = "LIVE";
  render(<ResultsView id="d1" />);
  expect(screen.queryByText("Practice")).toBeNull();
});

test("Copy link uses the clipboard when there is one", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<ResultsView id="d1" />);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  await waitFor(() => expect(screen.getByText("Link copied")).toBeTruthy());
  expect(writeText).toHaveBeenCalledWith(window.location.href);
});

test("without a clipboard it selects the link so it can be copied by hand", () => {
  vi.stubGlobal("navigator", {});
  render(<ResultsView id="d1" />);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  const field = screen.getByLabelText("Link to this result") as HTMLInputElement;
  expect(field.value).toBe(window.location.href);
  expect(screen.getByText(/copy the selected link/i)).toBeTruthy();
});
