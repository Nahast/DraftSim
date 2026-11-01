import type { PlayerDTO, RankingDTO } from "./types";

const SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function normalise(name: string): string {
  const tokens = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ.'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  while (tokens.length > 1 && SUFFIX.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

/** Match a ranking row to a player by name, position and (when needed) team. Ambiguity returns null, never a guess. */
export function matchRanking(r: RankingDTO, players: PlayerDTO[]): PlayerDTO | null {
  const name = normalise(r.name);
  let found = players.filter((p) => normalise(p.name) === name && p.positions.includes(r.position));
  if (found.length > 1) found = found.filter((p) => p.team === r.team);
  return found.length === 1 ? found[0] : null;
}
