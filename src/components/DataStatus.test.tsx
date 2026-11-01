// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { DataStatus, DataStatusLoader } from "./DataStatus";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const NOW = new Date("2026-11-04T12:00:00Z");
const ffc = (lastOk: string | null, failed = false) => ({ source: "ffc", lastOk, failed });

test("fresh data shows only the source line with its age", () => {
  render(<DataStatus now={NOW} sources={[ffc("2026-11-04T09:00:00Z")]} />);
  expect(screen.getByText(/Fantasy Football Calculator/)).toBeTruthy();
  expect(screen.getByText(/3 hours ago/)).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("data older than 48 hours shows the stale banner", () => {
  render(<DataStatus now={NOW} sources={[ffc("2026-11-01T12:00:00Z")]} />);
  expect(screen.getByRole("alert").textContent).toMatch(/3 days old/);
});

test("a failed update shows a banner even when the data is recent", () => {
  render(<DataStatus now={NOW} sources={[ffc("2026-11-04T09:00:00Z", true)]} />);
  expect(screen.getByRole("alert").textContent).toMatch(/update failed/i);
});

test("no data yet says so plainly", () => {
  render(<DataStatus now={NOW} sources={[ffc(null)]} />);
  expect(screen.getByText(/no data yet/i)).toBeTruthy();
});

test("a missing source row is treated as no data yet", () => {
  render(<DataStatus now={NOW} sources={[]} />);
  expect(screen.getByText(/no data yet/i)).toBeTruthy();
});

test("when the status endpoint itself fails the banner says so instead of vanishing", async () => {
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataStatusLoader />
    </QueryClientProvider>,
  );
  expect((await screen.findByRole("alert")).textContent).toMatch(/status unavailable/i);
});
