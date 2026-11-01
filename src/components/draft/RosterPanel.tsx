import { openSlots, stillNeeded } from "@/engine/roster";
import type { PlayerView, Rules } from "@/engine/types";

export function RosterPanel({ mine, rules }: { mine: PlayerView[]; rules: Rules }) {
  const open = openSlots(mine, rules);
  const needs = stillNeeded(open, rules);
  const seats = rules.rosterSlots.filter((s) => s.slot !== "BENCH").flatMap((s) => Array.from({ length: s.count }, () => s.slot));
  const left = new Map(open);
  const cells = seats.map((slot, i) => {
    // The first (count - open) seats of a slot are filled.
    const total = rules.rosterSlots.find((s) => s.slot === slot)!.count;
    const filled = total - (left.get(slot) ?? 0);
    const index = seats.slice(0, i).filter((x) => x === slot).length;
    return { slot, have: index < filled };
  });
  return (
    <section aria-label="My roster">
      <h2 className="sec">My roster</h2>
      <ul className="mx-4 grid grid-cols-5 border border-ink sm:grid-cols-9">
        {cells.map((c, i) => (
          <li key={i} className={`min-h-12 border-r border-rule px-1 pt-2 text-center font-display text-base font-semibold ${c.have ? "bg-ink text-white" : "hatch-ink"}`}>
            {c.slot}
            <span className="block text-[11px] font-normal">{c.have ? "drafted" : "open"}</span>
          </li>
        ))}
      </ul>
      <p className="mx-4 mt-2 text-sm">
        {needs.length ? <>You still need: <strong>{[...new Set(needs)].join(", ")}</strong></> : "Your starting lineup is full."}
      </p>
    </section>
  );
}
