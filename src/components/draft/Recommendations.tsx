import type { Recommendation } from "@/engine/recommend";
import type { Mode } from "./TopBar";

type Props = {
  recs: Recommendation[];
  mode: Mode;
  canTake: boolean;
  onTake: (playerId: string) => void;
  onOpen: (playerId: string) => void;
};

const pct = (s: number) => Math.round(s * 100);

function Tote({ survival }: { survival: number }) {
  return (
    <div className="tote" aria-label={`${pct(survival)} percent chance still available at your next pick`}>
      <b>{pct(survival)}%</b>
      <small>still there</small>
    </div>
  );
}

export function Recommendations({ recs, mode, canTake, onTake, onOpen }: Props) {
  if (recs.length === 0) return <p className="px-4 py-4">No players left to recommend.</p>;
  const [top, ...rest] = recs;
  const listed = mode === "pro" ? recs : rest;
  return (
    <section aria-label="Recommended picks">
      <h2 className="sec">{mode === "pro" ? "Best available" : "Our pick for you"}</h2>
      {mode === "beginner" && (
        <article className="mx-4 border-t-[3px] border-teal pt-3 pb-2" aria-label="Recommended pick">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <button type="button" className="block text-left font-display text-[30px] font-bold uppercase leading-none hover:underline" onClick={() => onOpen(top.player.id)}>
                {top.player.name}
              </button>
              <span className="mt-1 block font-display text-[15px] font-semibold tracking-wider text-muted">
                {top.player.positions[0]} · {top.player.team ?? "FA"}
              </span>
            </div>
            <Tote survival={top.survival} />
          </div>
          <p className="my-3 text-base font-medium"><strong>Recommended.</strong> {top.reason}</p>
          {canTake ? (
            <button type="button" className="btn" onClick={() => onTake(top.player.id)}>Take this player</button>
          ) : (
            <p className="text-sm text-muted">Not your pick yet. When another team picks, tap that player below to log it.</p>
          )}
        </article>
      )}
      <ul>
        {listed.map((r) => (
          <li key={r.player.id} className="mx-4 flex min-h-16 items-center gap-3 border-t border-rule py-2">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(r.player.id)}>
              <span className="block font-display text-[22px] font-bold uppercase leading-none">{r.player.name}</span>
              <span className="block text-[13px] text-muted">
                {r.player.positions[0]} · {r.player.team ?? "FA"} · {r.reason}
              </span>
              <span className={`tag mt-1 ${r.likelyGone ? "hatch-ink" : ""}`}>{r.likelyGone ? "Unlikely to last" : "Safe to wait"}</span>
            </button>
            <Tote survival={r.survival} />
            {mode === "pro" && canTake && (
              <button type="button" className="tbtn" onClick={() => onTake(r.player.id)}>Take</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
