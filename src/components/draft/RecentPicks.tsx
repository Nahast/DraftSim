import type { Pick, PlayerView } from "@/engine/types";

export function RecentPicks({ picks, players, myPosition }: { picks: Pick[]; players: Map<string, PlayerView>; myPosition: number }) {
  const last = picks.slice(-6).reverse();
  return (
    <section aria-label="Recent picks">
      <h2 className="sec">Recent picks</h2>
      {last.length === 0 ? (
        <p className="px-4 text-sm text-muted">No picks yet. Tap a player when someone takes them.</p>
      ) : (
        <ol className="mx-4 font-display text-[17px]">
          {last.map((p) => (
            <li key={p.overall} className="flex min-h-9 items-center gap-3 border-t border-rule">
              <span className="w-8 text-muted">{p.overall}</span>
              <span className="flex-1 font-semibold uppercase">{players.get(p.playerId)?.name ?? "Unknown player"}</span>
              <span className={p.team === myPosition ? "tag" : "text-muted"}>{p.team === myPosition ? "You" : `Team ${p.team}`}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
