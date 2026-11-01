"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { picksUntilMine, teamOnClock } from "@/engine/order";
import { recommend } from "@/engine/recommend";
import type { DraftState, Pick, PlayerView, RosterSlot, Rules, Scoring } from "@/engine/types";

export type DraftDTO = {
  id: string;
  teams: number;
  rounds: number;
  myPosition: number;
  snake: boolean;
  scoring: Scoring;
  experience: "BEGINNER" | "PRO";
  rosterSlots: RosterSlot[];
  picks: Pick[];
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new HttpError(res.status, (await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const NO_PICKS: Pick[] = [];
const NO_PLAYERS: PlayerView[] = [];

export function useDraft(id: string) {
  const qc = useQueryClient();
  const key = ["draft", id];
  const [error, setError] = useState<string | null>(null);

  const draftQ = useQuery({
    queryKey: key,
    queryFn: () => request<DraftDTO>(`/api/drafts/${id}`),
    retry: (n, e) => !(e instanceof HttpError && e.status === 404) && n < 2,
  });
  const draft = draftQ.data;

  const playersQ = useQuery({
    queryKey: ["players", draft?.scoring, draft?.teams],
    enabled: !!draft,
    staleTime: Infinity,
    queryFn: () => request<PlayerView[]>(`/api/players?sport=NFL&format=${draft!.scoring}&teams=${draft!.teams}`),
  });

  const rules: Rules | null = useMemo(
    () => draft ? {
      teams: draft.teams, rounds: draft.rounds, snake: draft.snake, scoring: draft.scoring,
      rosterSlots: draft.rosterSlots, myPosition: draft.myPosition,
    } : null,
    [draft],
  );
  const state: DraftState = useMemo(
    () => ({ picks: draft?.picks ?? NO_PICKS, players: playersQ.data ?? NO_PLAYERS }),
    [draft?.picks, playersQ.data],
  );
  // Recommendations are pure and local: a pick changes `state` and they recompute with no round trip.
  const recs = useMemo(() => (rules ? recommend(state, rules) : []), [state, rules]);

  const apply = (fn: (d: DraftDTO) => DraftDTO) => qc.setQueryData<DraftDTO>(key, (d) => (d ? fn(d) : d));
  const rollback = (_e: unknown, _v: unknown, prev?: DraftDTO) => {
    if (prev) qc.setQueryData(key, prev);
  };
  const begin = async () => {
    await qc.cancelQueries({ queryKey: key });
    setError(null);
    return qc.getQueryData<DraftDTO>(key);
  };

  const logMutation = useMutation({
    mutationFn: (v: { playerId: string; team?: number }) =>
      request<Pick>(`/api/drafts/${id}/picks`, json("POST", v)),
    onMutate: async (v) => {
      const prev = await begin();
      apply((d) => {
        const overall = d.picks.length + 1;
        const team = v.team ?? teamOnClock(overall, d.teams, d.snake);
        return { ...d, picks: [...d.picks, { overall, team, playerId: v.playerId }] };
      });
      return prev;
    },
    onError: (e, v, prev) => {
      rollback(e, v, prev);
      setError(e instanceof HttpError && e.status === 409 ? "That pick or player is already recorded." : "Could not save that pick.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const undoMutation = useMutation({
    mutationFn: () => request<{ overall: number }>(`/api/drafts/${id}/picks/last`, json("DELETE")),
    onMutate: async () => {
      const prev = await begin();
      apply((d) => ({ ...d, picks: d.picks.slice(0, -1) }));
      return prev;
    },
    onError: (e, v, prev) => {
      rollback(e, v, prev);
      setError("Could not undo that pick.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const current = state.picks.length + 1;
  return {
    ready: !!draft && !!rules && !!playersQ.data,
    notFound: draftQ.error instanceof HttpError && draftQ.error.status === 404,
    failed: draftQ.isError || playersQ.isError,
    draft,
    rules,
    state,
    recs,
    error,
    onClock: draft ? teamOnClock(current, draft.teams, draft.snake) : 0,
    picksUntilMine: rules ? picksUntilMine(state, rules) : 0,
    complete: !!draft && current > draft.teams * draft.rounds,
    logPick: async (playerId: string, team?: number): Promise<void> => {
      await logMutation.mutateAsync({ playerId, team }).catch(() => {});
    },
    undo: async (): Promise<void> => {
      await undoMutation.mutateAsync().catch(() => {});
    },
  };
}
