import { expect, test } from "vitest";
import { isConflict } from "./conflict";

test("recognises Prisma codes and the pg adapter's serialization failure", () => {
  expect(isConflict({ code: "P2002" })).toBe(true);
  expect(isConflict({ kind: "TransactionWriteConflict", originalCode: "40001" })).toBe(true);
  expect(isConflict({ cause: { originalCode: "40001" } })).toBe(true);
  expect(isConflict({ originalCode: "40P01" })).toBe(true); // deadlock
  expect(isConflict(new Error("boom"))).toBe(false);
  expect(isConflict(null)).toBe(false);
});
