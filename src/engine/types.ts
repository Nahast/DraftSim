export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
export type Scoring = "std" | "half" | "ppr";
export type RosterSlot = { slot: string; count: number };

export type Rules = {
  teams: number;
  rounds: number;
  snake: boolean;
  scoring: Scoring;
  rosterSlots: RosterSlot[];
  myPosition: number;
};

export type PlayerView = {
  id: string;
  name: string;
  team: string | null;
  positions: Position[];
  adp: number | null;
  projection: number | null;
};

export type Pick = { overall: number; team: number; playerId: string };
export type DraftState = { picks: Pick[]; players: PlayerView[] };
