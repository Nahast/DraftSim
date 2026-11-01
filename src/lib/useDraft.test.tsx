// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useDraft } from "./useDraft";

const player = (id: string, adp: number) => ({ id, name: id.toUpperCase(), team: "AAA", positions: ["RB"], adp, projection: null });
const PLAYERS = [player("p1", 1), player("p2", 2), player("p3", 3)];

let serverPicks: { overall: number; team: number; playerId: string; source: string }[];
let postStatus: number;
let calls: string[];
let gate: Promise<void> | null;

function stubServer() {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url === "/api/drafts/d1" && method === "GET") {
      return json({
        id: "d1", teams: 12, rounds: 15, myPosition: 3, snake: true, scoring: "ppr", experience: "BEGINNER",
        rosterSlots: [{ slot: "RB", count: 2 }, { slot: "BENCH", count: 6 }], picks: serverPicks,
      });
    }
    if (url.startsWith("/api/players")) return json(PLAYERS);
    if (url === "/api/drafts/d1/picks" && method === "POST") {
      if (gate) await gate;
      if (postStatus === 201) {
        const body = JSON.parse(String(init?.body));
        serverPicks.push({ overall: serverPicks.length + 1, team: 1, playerId: body.playerId, source: "manual" });
        return json(serverPicks.at(-1), 201);
      }
      return json({ error: "taken" }, postStatus);
    }
    if (url === "/api/drafts/d1/picks/last" && method === "DELETE") {
      serverPicks.pop();
      return json({ overall: 1 });
    }
    return json({}, 404);
  });
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => { serverPicks = []; postStatus = 201; calls = []; gate = null; stubServer(); });
afterEach(() => vi.unstubAllGlobals());

async function ready() {
  const hook = renderHook(() => useDraft("d1"), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

test("a logged pick leaves the pool and recommendations recompute without refetching players", async () => {
  const { result } = await ready();
  expect(result.current.recs.map((r) => r.player.id)).toContain("p1");
  const playerFetches = calls.filter((c) => c.includes("/api/players")).length;

  let release!: () => void;
  gate = new Promise<void>((r) => (release = r));
  let pending!: Promise<void>;
  act(() => { pending = result.current.logPick("p1"); });
  // The server has not answered yet, but the pick is already applied and the pool has shrunk.
  await waitFor(() => expect(result.current.state.picks.map((p) => p.playerId)).toEqual(["p1"]));
  expect(result.current.recs.map((r) => r.player.id)).not.toContain("p1");
  release();
  await act(async () => { await pending; });

  expect(calls.filter((c) => c.includes("/api/players")).length).toBe(playerFetches);
});

test("a 409 rolls the optimistic pick back and reports an error", async () => {
  postStatus = 409;
  const { result } = await ready();
  await act(async () => { await result.current.logPick("p1"); });
  await waitFor(() => expect(result.current.state.picks).toEqual([]));
  expect(result.current.error).toMatch(/already|taken|could not/i);
});

test("undo removes the last pick", async () => {
  const { result } = await ready();
  await act(async () => { await result.current.logPick("p1"); });
  await waitFor(() => expect(result.current.state.picks).toHaveLength(1));
  await act(async () => { await result.current.undo(); });
  await waitFor(() => expect(result.current.state.picks).toEqual([]));
});

test("an unknown draft is reported, not an endless spinner", async () => {
  const hook = renderHook(() => useDraft("nope"), { wrapper });
  await waitFor(() => expect(hook.result.current.notFound).toBe(true));
});
