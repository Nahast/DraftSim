import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clientIp, rateLimit, trackedKeys } from "./rateLimit";

const withHeaders = (h: Record<string, string>) => new Request("http://x", { headers: h });

describe("clientIp", () => {
  test("prefers the platform's x-real-ip", () => {
    expect(clientIp(withHeaders({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 2.2.2.2" }))).toBe("1.1.1.1");
  });
  test("ignores a client-supplied leftmost x-forwarded-for entry and takes the proxy-appended rightmost", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }))).toBe("2.2.2.2");
  });
  test("falls back to a shared bucket when no header is present", () => {
    expect(clientIp(withHeaders({}))).toBe("local");
  });
});

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("allows up to max per window, then blocks, then allows after the window", () => {
    const calls = Array.from({ length: 4 }, () => rateLimit("ip-a", "t", 3));
    expect(calls).toEqual([true, true, true, false]);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("ip-a", "t", 3)).toBe(true);
  });

  test("expired entries are swept so the map cannot grow without bound", () => {
    for (let i = 0; i < 500; i++) rateLimit(`sweep-${i}`, "s", 1);
    vi.advanceTimersByTime(60_001);
    rateLimit("fresh", "s", 1);
    expect(trackedKeys()).toBeLessThan(10);
  });

  test("a flood of distinct live keys stays near the cap", () => {
    for (let i = 0; i < 12_000; i++) rateLimit(`flood-${i}`, "f", 1);
    expect(trackedKeys()).toBeLessThanOrEqual(10_001);
  });

  test("a flood never evicts a live counter: an already-limited client stays limited", () => {
    for (let i = 0; i < 12_000; i++) rateLimit(`flood2-${i}`, "g", 1);
    expect(rateLimit("flood2-0", "g", 1)).toBe(false);
  });

  test("new keys arriving when the map is full share one bucket and are limited together", () => {
    for (let i = 0; i < 12_000; i++) rateLimit(`flood3-${i}`, "h", 1);
    expect(rateLimit("late-a", "h", 1)).toBe(false);
    expect(rateLimit("late-b", "h", 1)).toBe(false);
  });
});
