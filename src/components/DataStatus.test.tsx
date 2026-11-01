// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { DataStatus } from "./DataStatus";

afterEach(cleanup);
const NOW = new Date("2026-11-04T12:00:00Z");
const ffc = (lastOk: string | null, lastError: string | null = null) => ({ source: "ffc", lastOk, lastError });

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
  render(<DataStatus now={NOW} sources={[ffc("2026-11-04T09:00:00Z", "FFC HTTP 500")]} />);
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
