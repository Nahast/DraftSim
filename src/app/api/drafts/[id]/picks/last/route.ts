import { isConflict } from "@/lib/conflict";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const last = await db.$transaction(
      async (tx) => {
        const found = await tx.draftPick.findFirst({ where: { draftId: id }, orderBy: { overall: "desc" } });
        if (found) await tx.draftPick.delete({ where: { id: found.id } });
        return found;
      },
      { isolationLevel: "Serializable" },
    );
    return last ? Response.json({ overall: last.overall }) : Response.json({ error: "no picks to undo" }, { status: 404 });
  } catch (e) {
    if (isConflict(e)) return Response.json({ error: "the draft changed, try again" }, { status: 409 });
    throw e;
  }
}
