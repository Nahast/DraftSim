import { db } from "@/lib/db";
import { NFL_DEFAULT_SLOTS } from "@/engine/sports";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { CreateDraft } from "@/lib/schemas";

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), "create-draft", 10)) {
    return Response.json({ error: "too many drafts, try again in a minute" }, { status: 429 });
  }
  const body = CreateDraft.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });
  const draft = await db.draft.create({
    data: { ...body.data, rosterSlots: NFL_DEFAULT_SLOTS },
  });
  return Response.json({ id: draft.id }, { status: 201 });
}
