type Shape = { code?: string; kind?: string; originalCode?: string; cause?: Shape } | null | undefined;

// Prisma codes for "someone else got there first": unique violation, record already gone, serialization failure.
const PRISMA = ["P2002", "P2025", "P2034"];
// The pg driver adapter reports the same race without a Prisma code: serialization failure (40001) or deadlock (40P01).
const PG = ["40001", "40P01"];

export const isConflict = (e: unknown): boolean => {
  const err = e as Shape;
  if (!err) return false;
  return (
    PRISMA.includes(err.code ?? "") || PG.includes(err.originalCode ?? "") ||
    err.kind === "TransactionWriteConflict" || (err.cause ? isConflict(err.cause) : false)
  );
};
