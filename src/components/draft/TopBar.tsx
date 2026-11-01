import Link from "next/link";

export type Mode = "beginner" | "pro";

type Props = {
  draftId: string;
  round: number;
  pick: number;
  onMyClock: boolean;
  picksUntilMine: number;
  complete: boolean;
  canUndo: boolean;
  mode: Mode;
  onMode: (m: Mode) => void;
  onUndo: () => void;
};

export function TopBar({ draftId, round, pick, onMyClock, picksUntilMine, complete, canUndo, mode, onMode, onUndo }: Props) {
  const status = complete
    ? "Draft complete"
    : onMyClock
      ? "You're on the clock"
      : picksUntilMine === 1
        ? "You pick next"
        : Number.isFinite(picksUntilMine)
          ? `You pick in ${picksUntilMine} picks`
          : "You have no picks left";
  return (
    <div className="border-b-[3px] border-double border-ink px-4 py-3">
      <p className="font-display text-[22px] font-bold uppercase leading-tight tracking-wide">
        <span className={onMyClock && !complete ? "bg-teal px-2" : ""}>{status}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {complete ? `${round} rounds` : `Round ${round}, pick ${pick}`} · Picks are entered by hand
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="tbtn" onClick={onUndo} disabled={!canUndo}>Undo last pick</button>
        <Link href={`/draft/${draftId}/board`} className="tbtn no-underline">Board</Link>
        <div className="seg ml-auto" role="group" aria-label="Detail level">
          <button type="button" aria-pressed={mode === "beginner"} onClick={() => onMode("beginner")}>Beginner</button>
          <button type="button" aria-pressed={mode === "pro"} onClick={() => onMode("pro")}>Pro</button>
        </div>
      </div>
    </div>
  );
}
