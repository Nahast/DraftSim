// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { PlayerSheet } from "./PlayerSheet";

beforeAll(() => {
  // jsdom has no <dialog> modal support.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);

const player = { id: "p1", name: "Ann Able", team: "AAA", positions: ["RB" as const], adp: 3, projection: null };
const props = { player, teams: 12, myPosition: 3, onClock: 3, onLog: vi.fn(), onClose: vi.fn() };

test("in a practice draft there is no 'Taken by' choice and the button says 'I took him'", () => {
  render(<PlayerSheet {...props} mock />);
  expect(screen.queryByLabelText("Taken by")).toBeNull();
  fireEvent.click(screen.getByText("I took him"));
  expect(props.onLog).toHaveBeenCalledWith("p1", 3);
});

test("in a real draft the 'Taken by' choice stays", () => {
  render(<PlayerSheet {...props} onClock={5} />);
  expect(screen.getByLabelText("Taken by")).toBeTruthy();
});
