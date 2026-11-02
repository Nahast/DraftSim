"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { picksUntilMine, teamOnClock } from "@/engine/order";
import { recommend } from "@/engine/recommend";
import type { DraftState, Pick, PlayerView, RosterSlot, Rules, Scoring } from "@/engine/types";

export type DraftDTO = {
  id: string;
  mode: "LIVE" | "MOCK";
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

  const advancedAt = useRef(-1); // pick count we last asked the bots to advance from, so a thin pool cannot loop
  const settled = () => {
    advancedAt.current = -1;
    return qc.isMutating({ mutationKey: ["write"] }) <= 1 ? qc.invalidateQueries({ queryKey: key }) : undefined;
  };

  const logMutation = useMutation({
    mutationKey: ["write"],
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
    // Refetch only when the last in-flight write finishes, or an earlier refetch would erase a later optimistic pick.
    onSettled: settled,
  });

  const undoMutation = useMutation({
    mutationKey: ["write"],
    mutationFn: () => request<{ overall: number }>(`/api/drafts/${id}/picks/last`, json("DELETE")),
    onMutate: async () => {
      const prev = await begin();
      apply((d) => {
        if (d.mode !== "MOCK") return { ...d, picks: d.picks.slice(0, -1) };
        // Practice: rewind to my latest pick, taking the bots' picks after it too (or everything if I have none).
        const mine = d.picks.findLast((p) => p.team === d.myPosition);
        return { ...d, picks: d.picks.filter((p) => p.overall < (mine ?? d.picks[0])?.overall) };
      });
      return prev;
    },
    onError: (e, v, prev) => {
      rollback(e, v, prev);
      setError("Could not undo that pick.");
    },
    // Refetch only when the last in-flight write finishes, or an earlier refetch would erase a later optimistic pick.
    onSettled: settled,
  });

  const current = state.picks.length + 1;
  const complete = !!draft && current > draft.teams * draft.rounds;
  const onClock = draft ? teamOnClock(current, draft.teams, draft.snake) : 0;

  // Practice drafts: the server makes the bots' picks. Wait for my own writes to land first, or it would
  // advance a draft that does not have my pick yet.
  const advanceMutation = useMutation({
    mutationFn: () => request<{ added: number; complete: boolean }>(`/api/drafts/${id}/advance`, json("POST")),
    onError: () => setError("The bots could not pick. Reload to try again."),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const writing = useIsMutating({ mutationKey: ["write"] });
  const botTurn = draft?.mode === "MOCK" && !complete && onClock !== draft.myPosition;
  const pickCount = state.picks.length;
  const { mutate: advance, isPending: advancing } = advanceMutation;
  useEffect(() => {
    if (!botTurn || writing > 0 || advancing || advancedAt.current === pickCount) return;
    advancedAt.current = pickCount;
    advance();
  }, [botTurn, writing, advancing, pickCount, advance]);

  return {
    ready: !!draft && !!rules && !!playersQ.data,
    notFound: draftQ.error instanceof HttpError && draftQ.error.status === 404,
    failed: draftQ.isError || playersQ.isError,
    draft,
    rules,
    state,
    recs,
    error,
    mode: draft?.mode ?? "LIVE",
    advancing,
    onClock,
    picksUntilMine: rules ? picksUntilMine(state, rules) : 0,
    complete,
    logPick: async (playerId: string, team?: number): Promise<void> => {
      await logMutation.mutateAsync({ playerId, team }).catch(() => {});
    },
    undo: async (): Promise<void> => {
      await undoMutation.mutateAsync().catch(() => {});
    },
  };
}
