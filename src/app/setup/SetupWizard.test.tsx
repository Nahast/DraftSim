// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SetupWizard } from "./SetupWizard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

let posted: Record<string, unknown> | null;
beforeEach(() => {
  posted = null;
  push.mockReset();
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    posted = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ id: "d1" }), { status: 201 });
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const click = (name: RegExp | string) =>
  fireEvent.click(screen.queryAllByRole("radio", { name })[0] ?? screen.getByRole("button", { name }));

function toStepThree() {
  render(<SetupWizard />);
  click(/never played/i);
  click("Next");
  click(/espn/i);
  click("Next");
}

test("the default league is PPR and snake, so a beginner never has to touch the rules", async () => {
  toStepThree();
  click("Start my draft");
  await waitFor(() => expect(push).toHaveBeenCalledWith("/draft/d1"));
  expect(posted).toMatchObject({ scoring: "ppr", snake: true, teams: 12, myPosition: 6 });
});

test("the scoring format and draft type can be changed", async () => {
  toStepThree();
  click(/half ppr/i);
  click(/linear/i);
  click("Start my draft");
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(posted).toMatchObject({ scoring: "half", snake: false });
});

test("standard scoring is offered", async () => {
  toStepThree();
  click(/^standard/i);
  click("Start my draft");
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(posted).toMatchObject({ scoring: "std" });
});
