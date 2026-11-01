import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const last = await db.draftPick.findFirst({ where: { draftId: id }, orderBy: { overall: "desc" } });
  if (!last) return Response.json({ error: "no picks to undo" }, { status: 404 });
  await db.draftPick.delete({ where: { id: last.id } });
  return Response.json({ overall: last.overall });
}
