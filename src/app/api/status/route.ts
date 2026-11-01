import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.sourceSync.findMany({ orderBy: { source: "asc" } });
  return Response.json({
    sources: rows.map((r) => ({ source: r.source, lastOk: r.lastOk?.toISOString() ?? null, lastError: r.lastError })),
  });
}
