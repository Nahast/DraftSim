import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await db.draft.findUnique({
    where: { id },
    include: { picks: { orderBy: { overall: "asc" }, select: { overall: true, team: true, playerId: true, source: true } } },
  });
  return draft ? Response.json(draft) : Response.json({ error: "draft not found" }, { status: 404 });
}
