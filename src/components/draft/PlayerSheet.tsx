"use client";

import { useEffect, useRef, useState } from "react";
import type { Recommendation } from "@/engine/recommend";
import type { PlayerView } from "@/engine/types";

type Props = {
  player: PlayerView | null;
  rec?: Recommendation;
  teams: number;
  myPosition: number;
  onClock: number;
  onLog: (playerId: string, team: number) => void;
  onClose: () => void;
};

export function PlayerSheet({ player, rec, teams, myPosition, onClock, onLog, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [team, setTeam] = useState(onClock);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (player && !d.open) d.showModal();
    if (!player && d.open) d.close();
    setTeam(onClock);
  }, [player, onClock]);

  const mine = team === myPosition;
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-label={player ? `${player.name} details` : "Player details"}>
      {player && (
        <>
          <h2 className="font-display text-[30px] font-bold uppercase leading-none">{player.name}</h2>
          <p className="mt-1 font-display text-[15px] font-semibold tracking-wider text-muted">
            {player.positions.join("/")} · {player.team ?? "Free agent"}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Average draft position</dt>
            <dd>{player.adp === null ? "No data yet" : player.adp.toFixed(1)}</dd>
            <dt className="text-muted">Source</dt>
            <dd>Fantasy Football Calculator</dd>
          </dl>
          {rec && <p className="mt-3 font-medium">{rec.reason}</p>}
          <label className="mt-4 block text-sm font-semibold" htmlFor="taken-by">Taken by</label>
          <select id="taken-by" value={team} onChange={(e) => setTeam(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-sm border border-ink bg-white px-2">
            {Array.from({ length: teams }, (_, i) => i + 1).map((t) => (
              <option key={t} value={t}>{t === myPosition ? `Team ${t} (you)` : `Team ${t}`}</option>
            ))}
          </select>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-alt" onClick={onClose}>Close</button>
            <button type="button" className="btn" onClick={() => { onLog(player.id, team); onClose(); }}>
              {mine ? "I took him" : `Team ${team} took him`}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
