import { db } from "@/lib/db";
import { loadPool } from "@/lib/pool";
import { z } from "zod";

const Query = z.object({
  sport: z.literal("NFL").default("NFL"),
  format: z.enum(["std", "half", "ppr"]).default("ppr"),
  teams: z.coerce.number().int().min(2).max(20).default(12),
});

export async function GET(req: Request) {
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return Response.json({ error: q.error.flatten() }, { status: 400 });
  const { format, teams } = q.data;

  return Response.json(await loadPool(db, { format, teams }));
}
