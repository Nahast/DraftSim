"use client";

import { useMemo, useState } from "react";
import type { PlayerView } from "@/engine/types";

const FILTERS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"] as const;
const SHOWN = 60;

export function PlayerList({ available, onOpen }: { available: PlayerView[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<(typeof FILTERS)[number]>("ALL");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return available.filter((p) => (pos === "ALL" || p.positions[0] === pos) && (!needle || p.name.toLowerCase().includes(needle)));
  }, [available, q, pos]);

  return (
    <section aria-label="Available players">
      <h2 className="sec">Available players ({available.length})</h2>
      <div className="px-4">
        <input
          type="search" aria-label="Search players by name" placeholder="Search a player"
          value={q} onChange={(e) => setQ(e.target.value)}
          className="min-h-11 w-full rounded-sm border border-ink bg-white px-3"
        />
        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Filter by position">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={pos === f} onClick={() => setPos(f)}
              className={`tbtn ${pos === f ? "bg-ink text-white" : ""}`}>{f}</button>
          ))}
        </div>
      </div>
      <ul className="mt-2">
        {rows.slice(0, SHOWN).map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)} className="mx-4 flex min-h-12 w-[calc(100%-2rem)] items-center gap-3 border-t border-rule py-2 text-left hover:bg-ground-2">
              <span className="flex-1 font-display text-lg font-semibold uppercase">{p.name}</span>
              <span className="text-[13px] text-muted">{p.positions[0]} · {p.team ?? "FA"}</span>
              <span className="w-12 text-right font-display text-lg">{p.adp === null ? "—" : p.adp.toFixed(1)}</span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="px-4 py-3 text-sm text-muted">No players match.</p>}
      {rows.length > SHOWN && <p className="px-4 py-3 text-sm text-muted">Showing the top {SHOWN}. Search to find others.</p>}
    </section>
  );
}
