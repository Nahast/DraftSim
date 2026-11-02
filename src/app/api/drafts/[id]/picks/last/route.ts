import { isConflict } from "@/lib/conflict";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await db.draft.findUnique({ where: { id }, select: { mode: true, myPosition: true } });
  try {
    if (draft?.mode === "MOCK") {
      // Rewind to my latest pick: it goes, and so does every bot pick made after it.
      const from = await db.$transaction(
        async (tx) => {
          const mine = await tx.draftPick.findFirst({ where: { draftId: id, team: draft.myPosition }, orderBy: { overall: "desc" } });
          const first = mine ?? (await tx.draftPick.findFirst({ where: { draftId: id }, orderBy: { overall: "asc" } }));
          if (!first) return null;
          await tx.draftPick.deleteMany({ where: { draftId: id, overall: { gte: first.overall } } });
          return first.overall;
        },
        { isolationLevel: "Serializable" },
      );
      return from === null ? Response.json({ error: "no picks to undo" }, { status: 404 }) : Response.json({ overall: from });
    }
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
