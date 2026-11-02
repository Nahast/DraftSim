"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { DataStatusLoader } from "@/components/DataStatus";
import { gradeDraft } from "@/engine/grade";
import { seatPlayers } from "@/engine/roster";
import { useDraft } from "@/lib/useDraft";

export function ResultsView({ id }: { id: string }) {
  const d = useDraft(id);
  const [note, setNote] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => new Map(d.state.players.map((p) => [p.id, p])), [d.state.players]);

  if (d.notFound) return <main className="mx-auto max-w-md p-4"><h1>Draft not found</h1></main>;
  if (d.failed) return <main className="mx-auto max-w-md p-4" role="alert">We could not load this draft.</main>;
  if (!d.ready || !d.draft || !d.rules) return <main className="mx-auto max-w-md p-4" aria-busy="true">Loading your team…</main>;

  const { draft, rules } = d;
  const mine = d.state.picks
    .filter((p) => p.team === draft.myPosition)
    .flatMap((p) => { const player = byId.get(p.playerId); return player ? [{ player, overall: p.overall }] : []; });
  const grade = gradeDraft(mine, rules);
  const seats = seatPlayers(mine.map((m) => m.player), rules).filter((s) => s.slot !== "BENCH" || s.player);

  async function copy() {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url).then(() => setNote("Link copied"), () => setNote("Copy the selected link by hand"));
    } else {
      setNote("Copy the selected link by hand");
    }
    field.current?.select();
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center gap-3">
        <h1>Your team</h1>
        {draft.mode === "MOCK" && <span className="border border-ink px-2 font-display text-sm font-bold uppercase tracking-wider">Practice</span>}
      </div>
      {!d.complete && <p className="mt-2 text-sm text-muted">This draft is not finished yet. Here is your team so far.</p>}

      <section className="mt-4 flex items-center gap-4" aria-label="Draft grade">
        <p className="font-display text-7xl font-bold leading-none" aria-label="Grade">{grade.letter}</p>
        <div>
          {grade.strengths.map((s) => <p key={s}>{s}</p>)}
          {grade.weaknesses.map((w) => <p key={w} className="font-semibold">{w}</p>)}
        </div>
      </section>
      {grade.steals.length > 0 && (
        <p className="mt-3 text-sm">
          Best value: {grade.steals.slice(0, 3).map((s) => `${s.name} (pick ${s.overall}, ranked ${s.adp.toFixed(0)})`).join(", ")}.
        </p>
      )}

      <section className="mt-5" aria-label="My roster">
        <h2 className="sec">My roster</h2>
        <ul className="border border-ink">
          {seats.map((s, i) => (
            <li key={i} className="flex min-h-11 items-center gap-3 border-b border-rule px-3 last:border-b-0">
              <span className="w-14 font-display font-semibold">{s.slot}</span>
              {s.player ? (
                <>
                  <span className="font-medium">{s.player.name}</span>
                  <span className="ml-auto text-sm text-muted">{s.player.positions.join("/")} · {s.player.team ?? "FA"}</span>
                </>
              ) : (
                <span className="text-muted">Open</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={copy}>Copy link</button>
        <Link href="/" className="btn btn-alt">Draft again</Link>
        <Link href={`/draft/${id}/board`} className="btn btn-alt">Board</Link>
      </div>
      <label className="mt-3 block text-sm text-muted" htmlFor="share-url">Link to this result</label>
      <input id="share-url" ref={field} readOnly value={typeof window === "undefined" ? "" : window.location.href}
        className="mt-1 min-h-11 w-full border border-rule px-2 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <p className="mt-1 text-sm" role="status">{note}</p>
      <DataStatusLoader />
    </main>
  );
}
