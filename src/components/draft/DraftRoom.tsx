"use client";

import { useMemo, useState } from "react";
import { DataStatusLoader } from "@/components/DataStatus";
import { useDraft } from "@/lib/useDraft";
import { PlayerList } from "./PlayerList";
import { PlayerSheet } from "./PlayerSheet";
import { Recommendations } from "./Recommendations";
import { RecentPicks } from "./RecentPicks";
import { RosterPanel } from "./RosterPanel";
import { TopBar, type Mode } from "./TopBar";

export function DraftRoom({ id }: { id: string }) {
  const d = useDraft(id);
  const [mode, setMode] = useState<Mode | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(d.state.players.map((p) => [p.id, p])), [d.state.players]);
  const available = useMemo(() => {
    const taken = new Set(d.state.picks.map((p) => p.playerId));
    return d.state.players.filter((p) => !taken.has(p.id));
  }, [d.state]);

  if (d.notFound) return <main className="mx-auto max-w-md p-4"><h1>Draft not found</h1><p className="mt-2">Check the link, or start a new draft from the home page.</p></main>;
  if (d.failed) return <main className="mx-auto max-w-md p-4" role="alert">We could not load this draft. Check your connection and reload.</main>;
  if (!d.ready || !d.draft || !d.rules) return <main className="mx-auto max-w-md p-4" aria-busy="true">Loading your draft…</main>;

  const { draft, rules } = d;
  const current = d.state.picks.length + 1;
  const level: Mode = mode ?? (draft.experience === "PRO" ? "pro" : "beginner");
  const onMyClock = d.onClock === draft.myPosition;
  const mine = d.state.picks.filter((p) => p.team === draft.myPosition).flatMap((p) => byId.get(p.playerId) ?? []);

  return (
    <main className="mx-auto max-w-md lg:max-w-6xl">
      <TopBar
        draftId={id} round={Math.ceil(current / draft.teams)} rounds={draft.rounds} pick={current} onMyClock={onMyClock}
        picksUntilMine={d.picksUntilMine} complete={d.complete} practice={d.mode === "MOCK"} advancing={d.advancing} canUndo={d.state.picks.length > 0}
        mode={level} onMode={setMode} onUndo={d.undo}
      />
      {d.error && <p role="alert" className="mx-4 mt-2 text-danger">{d.error}</p>}
      <div className="lg:grid lg:grid-cols-[26rem_1fr] lg:gap-6">
        <div>
          {!d.complete && (
            <Recommendations recs={d.recs} mode={level} canTake={onMyClock} onTake={(pid) => d.logPick(pid)} onOpen={setOpenId} />
          )}
          <RosterPanel mine={mine} rules={rules} />
          <RecentPicks picks={d.state.picks} players={byId} myPosition={draft.myPosition} />
          <DataStatusLoader />
        </div>
        <PlayerList available={available} onOpen={setOpenId} />
      </div>
      <PlayerSheet
        player={openId ? byId.get(openId) ?? null : null}
        rec={d.recs.find((r) => r.player.id === openId)}
        mock={d.mode === "MOCK"} teams={draft.teams} myPosition={draft.myPosition} onClock={d.onClock}
        onLog={(pid, team) => d.logPick(pid, team)} onClose={() => setOpenId(null)}
      />
    </main>
  );
}
