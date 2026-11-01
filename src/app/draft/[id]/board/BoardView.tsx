"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Board } from "@/components/draft/Board";
import { useDraft } from "@/lib/useDraft";

export function BoardView({ id }: { id: string }) {
  const d = useDraft(id);
  const byId = useMemo(() => new Map(d.state.players.map((p) => [p.id, p])), [d.state.players]);
  if (d.notFound) return <main className="p-4">Draft not found.</main>;
  if (d.failed) return <main className="p-4" role="alert">We could not load this draft.</main>;
  if (!d.ready || !d.draft) return <main className="p-4" aria-busy="true">Loading the board…</main>;
  return (
    <main>
      <div className="flex items-center gap-3 border-b border-ink px-4 py-3">
        <Link href={`/draft/${id}`} className="tbtn no-underline">Back to draft</Link>
        <h1 className="text-2xl">Draft board</h1>
      </div>
      <Board picks={d.state.picks} players={byId} teams={d.draft.teams} rounds={d.draft.rounds} myPosition={d.draft.myPosition} snake={d.draft.snake} />
    </main>
  );
}
