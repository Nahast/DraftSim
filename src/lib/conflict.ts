// Prisma codes for "someone else got there first": unique violation, record already gone, serialization failure.
export const isConflict = (e: unknown): boolean => ["P2002", "P2025", "P2034"].includes((e as { code?: string }).code ?? "");
