import { teamOnClock } from "@/engine/order";
import type { Pick, PlayerView } from "@/engine/types";

type Props = { picks: Pick[]; players: Map<string, PlayerView>; teams: number; rounds: number; myPosition: number; snake?: boolean };

const lastName = (name: string) => name.split(" ").slice(1).join(" ") || name;

export function Board({ picks, players, teams, rounds, myPosition, snake = true }: Props) {
  // Key each pick by its grid cell so every (round, team) lookup is O(1).
  const cells = new Map<string, Pick>();
  for (const p of picks) cells.set(`${Math.ceil(p.overall / teams)}:${teamOnClock(p.overall, teams, snake)}`, p);
  return (
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-ground px-2 text-left font-display text-sm font-semibold uppercase">Rd</th>
            {Array.from({ length: teams }, (_, i) => i + 1).map((t) => (
              <th key={t} scope="col" className={`min-w-20 border border-rule px-1 py-2 font-display text-sm font-semibold uppercase ${t === myPosition ? "border-b-4 border-b-teal" : ""}`}>
                {t === myPosition ? `T${t} you` : `T${t}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
            <tr key={round}>
              <th scope="row" className="sticky left-0 z-10 bg-ground px-2 font-display text-sm font-semibold">{round}</th>
              {Array.from({ length: teams }, (_, i) => i + 1).map((team) => {
                const pick = cells.get(`${round}:${team}`);
                const player = pick ? players.get(pick.playerId) : undefined;
                const pos = player?.positions[0];
                return (
                  <td
                    key={team} data-round={round} data-team={team} data-mine={team === myPosition ? "true" : undefined}
                    className={`h-14 border border-rule px-1 align-top font-display text-[13px] leading-tight ${pick ? `pos-${pos ?? "none"}` : ""} ${team === myPosition && pick ? "outline outline-2 -outline-offset-2 outline-teal" : ""}`}
                  >
                    {pick ? (
                      <>
                        <b className="block uppercase">{player ? lastName(player.name) : "Unknown"}</b>
                        <span>{pos ?? "?"}</span>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
