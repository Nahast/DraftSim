import Link from "next/link";

export type Mode = "beginner" | "pro";

type Props = {
  draftId: string;
  round: number;
  rounds: number;
  pick: number;
  onMyClock: boolean;
  picksUntilMine: number;
  complete: boolean;
  practice?: boolean;
  advancing?: boolean;
  canUndo: boolean;
  mode: Mode;
  onMode: (m: Mode) => void;
  onUndo: () => void;
};

export function TopBar({ draftId, round, rounds, pick, onMyClock, picksUntilMine, complete, practice = false, advancing = false, canUndo, mode, onMode, onUndo }: Props) {
  const status = complete
    ? "Draft complete"
    : practice && advancing
      ? "Bots are picking…"
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
        {complete ? `${rounds} rounds` : `Round ${round}, pick ${pick}`} ·{" "}
        {practice ? "Practice only. Nothing here is saved to your league." : "Picks are entered by hand"}
      </p>
      {practice && <p className="mt-1 inline-block border border-ink px-2 font-display text-sm font-bold uppercase tracking-wider">Practice draft</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="tbtn" onClick={onUndo} disabled={!canUndo}>{practice ? "Undo my last pick" : "Undo last pick"}</button>
        <Link href={`/draft/${draftId}/board`} className="tbtn no-underline">Board</Link>
        <Link href={`/draft/${draftId}/cheatsheet`} className="tbtn no-underline">Cheat sheet</Link>
        <div className="seg ml-auto" role="group" aria-label="Detail level">
          <button type="button" aria-pressed={mode === "beginner"} onClick={() => onMode("beginner")}>Beginner</button>
          <button type="button" aria-pressed={mode === "pro"} onClick={() => onMode("pro")}>Pro</button>
        </div>
      </div>
    </div>
  );
}
