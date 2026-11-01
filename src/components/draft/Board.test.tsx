// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { Pick, PlayerView } from "@/engine/types";
import { Board } from "./Board";

afterEach(cleanup);
const pl = (id: string, name: string, pos: PlayerView["positions"][number]): PlayerView => ({
  id, name, team: "AAA", positions: [pos], adp: 1, projection: null,
});
const players = new Map([pl("a", "Ann Able", "WR"), pl("b", "Bo Baker", "RB"), pl("c", "Cy Cole", "QB")].map((p) => [p.id, p]));
const picks: Pick[] = [
  { overall: 1, team: 1, playerId: "a" },
  { overall: 12, team: 12, playerId: "b" },
  { overall: 13, team: 12, playerId: "c" },
];

function cell(container: HTMLElement, round: number, team: number) {
  return container.querySelector(`[data-round="${round}"][data-team="${team}"]`) as HTMLElement;
}

test("snake order puts pick 13 under team 12 in round 2", () => {
  const { container } = render(<Board picks={picks} players={players} teams={12} rounds={3} myPosition={1} />);
  expect(cell(container, 1, 1).textContent).toContain("Able");
  expect(cell(container, 1, 12).textContent).toContain("Baker");
  expect(cell(container, 2, 12).textContent).toContain("Cole");
  expect(cell(container, 2, 1).textContent).not.toContain("Able");
});

test("position is written as text in every filled cell, never colour alone", () => {
  const { container } = render(<Board picks={picks} players={players} teams={12} rounds={3} myPosition={1} />);
  expect(cell(container, 1, 1).textContent).toContain("WR");
  expect(cell(container, 1, 12).textContent).toContain("RB");
  expect(cell(container, 2, 12).textContent).toContain("QB");
});

test("my column is marked", () => {
  const { container } = render(<Board picks={picks} players={players} teams={12} rounds={3} myPosition={1} />);
  expect(cell(container, 1, 1).getAttribute("data-mine")).toBe("true");
  expect(cell(container, 1, 2).getAttribute("data-mine")).toBeNull();
});

test("an unknown player id does not break the board", () => {
  const { container } = render(<Board picks={[{ overall: 1, team: 1, playerId: "ghost" }]} players={players} teams={12} rounds={3} myPosition={1} />);
  expect(cell(container, 1, 1).textContent).toContain("Unknown");
});

test("a linear draft keeps the same team order every round", () => {
  const { container } = render(<Board picks={picks} players={players} teams={12} rounds={3} myPosition={1} snake={false} />);
  expect(cell(container, 2, 1).textContent).toContain("Cole");
  expect(cell(container, 2, 12).textContent).not.toContain("Cole");
});
