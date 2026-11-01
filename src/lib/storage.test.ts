import { afterEach, expect, test, vi } from "vitest";
import { lastDraftId, rememberDraft } from "./storage";

afterEach(() => vi.unstubAllGlobals());

function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("lastDraftId returns the id after rememberDraft", () => {
  vi.stubGlobal("localStorage", fakeStorage());
  expect(lastDraftId()).toBeNull();
  rememberDraft("abc123");
  expect(lastDraftId()).toBe("abc123");
});

test("storage that throws never breaks the page", () => {
  const boom = () => { throw new Error("blocked"); };
  vi.stubGlobal("localStorage", { getItem: boom, setItem: boom });
  expect(() => rememberDraft("abc")).not.toThrow();
  expect(lastDraftId()).toBeNull();
});
