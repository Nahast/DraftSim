"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataStatusLoader } from "@/components/DataStatus";
import type { Mode } from "@/components/draft/TopBar";
import { buildPlan, buildTiers, planSummary } from "@/engine/cheatsheet";
import type { Position } from "@/engine/types";
import { useDraft } from "@/lib/useDraft";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];
const NAMES_PER_TIER = 12;
const NO_DATA = "We need more player data to plan your picks.";

export function CheatSheetView({ id }: { id: string }) {
  const d = useDraft(id);
  const [chosen, setChosen] = useState<Mode | null>(null);

  const plan = useMemo(() => (d.rules ? buildPlan(d.state, d.rules) : []), [d.state, d.rules]);
  const sentences = useMemo(() => planSummary(plan), [plan]);
  const tiers = useMemo(() => {
    const taken = new Set(d.state.picks.map((p) => p.playerId));
    const left = d.state.players.filter((p) => !taken.has(p.id));
    return POSITIONS.map((pos) => ({ pos, tiers: buildTiers(left, pos) })).filter((t) => t.tiers.length > 0);
  }, [d.state]);

  if (d.notFound) return <main className="mx-auto max-w-md p-4"><h1>Draft not found</h1></main>;
  if (d.failed) return <main className="mx-auto max-w-md p-4" role="alert">We could not load this draft.</main>;
  if (!d.ready || !d.draft || !d.rules) return <main className="mx-auto max-w-md p-4" aria-busy="true">Building your cheat sheet…</main>;

  const level: Mode = chosen ?? (d.draft.experience === "PRO" ? "pro" : "beginner");
  const pro = level === "pro";

  return (
    <main className="mx-auto max-w-md px-4 py-5 lg:max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/draft/${id}`} className="tbtn no-underline">Back to draft</Link>
        <button type="button" className="tbtn" onClick={() => window.print()}>Print</button>
        <div className="seg ml-auto" role="group" aria-label="Detail level">
          <button type="button" aria-pressed={!pro} onClick={() => setChosen("beginner")}>Beginner</button>
          <button type="button" aria-pressed={pro} onClick={() => setChosen("pro")}>Pro</button>
        </div>
      </div>

      <h1 className="mt-4">Cheat sheet</h1>
      <p className="mt-1 text-sm text-muted">
        Pick {d.rules.myPosition} of {d.rules.teams} · {d.rules.snake ? "snake" : "linear"} · {d.rules.scoring.toUpperCase()} scoring
        {d.draft.mode === "MOCK" && " · Practice draft"}
      </p>

      <section aria-label="Your plan" className="mt-4 border border-ink p-3">
        <h2 className="font-display text-xl font-bold uppercase">Your plan</h2>
        <ul className="mt-2 space-y-1">
          {sentences.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      {plan.length > 0 && (
        <section className="mt-5">
          <h2 className="sec px-0">Round by round</h2>
          <ol aria-label="Round by round" className="border border-ink">
            {plan.map((r) => (
              <li key={r.overall} className="border-b border-rule px-3 py-2 last:border-b-0">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display font-semibold">Round {r.round}, pick {r.overall}</span>
                  <span className="font-medium">{r.pick.name}</span>
                  <span className="text-sm text-muted">{r.pick.positions[0]}{r.pick.team ? ` · ${r.pick.team}` : ""}</span>
                </p>
                {pro ? (
                  <>
                    <p className="text-sm">{r.reason}</p>
                    {r.alternates.length > 0 && (
                      <p className="text-sm text-muted">If gone: {r.alternates.map((a) => `${a.name} (${a.positions[0]})`).join(", ")}</p>
                    )}
                  </>
                ) : (
                  r.alternates[0] && <p className="text-sm text-muted">If he is gone: {r.alternates[0].name} ({r.alternates[0].positions[0]})</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      {plan.length === 0 && <p className="mt-5">{NO_DATA}</p>}

      {pro && (
        <section className="mt-5">
          <h2 className="sec px-0">Tiers</h2>
          {tiers.length === 0 && <p>{NO_DATA}</p>}
          {tiers.map(({ pos, tiers: list }) => (
            <table key={pos} aria-label={`${pos} tiers`} className="mb-4 w-full border border-ink text-sm">
              <caption className="bg-ink px-2 py-1 text-left font-display font-bold uppercase tracking-wider text-white">{pos}</caption>
              <tbody>
                {list.map((t) => (
                  <tr key={t.tier} className="border-b border-rule align-top">
                    <th scope="row" className="w-16 px-2 py-1 text-left font-display">Tier {t.tier}</th>
                    <td className="px-2 py-1">
                      {t.players.slice(0, NAMES_PER_TIER).map((p) => `${p.name} (${p.adp!.toFixed(0)})`).join(", ")}
                      {t.players.length > NAMES_PER_TIER && ` and ${t.players.length - NAMES_PER_TIER} more`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </section>
      )}
      <DataStatusLoader />
    </main>
  );
}
