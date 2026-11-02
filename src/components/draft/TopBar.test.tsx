// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { TopBar } from "./TopBar";

afterEach(cleanup);
const base = {
  draftId: "d1", round: 16, pick: 181, onMyClock: false, picksUntilMine: Infinity, rounds: 15,
  complete: true, canUndo: true, mode: "beginner" as const, onMode: () => {}, onUndo: () => {},
};

test("a completed 15-round draft says 15 rounds, not 16", () => {
  render(<TopBar {...base} />);
  expect(screen.getByText(/15 rounds/)).toBeTruthy();
  expect(screen.queryByText(/16 rounds/)).toBeNull();
});
