import type { PrismaClient } from "@/generated/prisma/client";
import { matchRanking } from "@/sources/match";
import type { Format, PlayerDTO, PlayerSource, RankingSource } from "@/sources/types";

export type IngestDeps = {
  players: PlayerSource;
  rankings: RankingSource;
  db: PrismaClient;
  now: Date;
  season: number;
  // FFC serves 12-team ADP only, so 12 is the default league size.
  teams?: number[];
  formats?: Format[];
};

export type IngestResult = { players: number; rankings: number; unmatched: number; errors: string[] };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function markOk(db: PrismaClient, source: string, now: Date) {
  await db.sourceSync.upsert({
    where: { source },
    create: { source, lastOk: now },
    update: { lastOk: now, lastError: null },
  });
}

async function markError(db: PrismaClient, source: string, error: string) {
  await db.sourceSync.upsert({ where: { source }, create: { source, lastError: error }, update: { lastError: error } });
}

async function upsertPlayers(db: PrismaClient, dtos: PlayerDTO[]) {
  const existing = await db.player.findMany({ where: { sport: "NFL" } });
  const bySleeperId = new Map(existing.map((p) => [(p.externalIds as { sleeper?: string }).sleeper, p]));
  const fresh = dtos.filter((d) => !bySleeperId.has(d.externalId));
  await db.player.createMany({
    data: fresh.map((d) => ({
      sport: "NFL" as const, name: d.name, team: d.team, positions: d.positions, status: d.status,
      externalIds: { sleeper: d.externalId },
    })),
  });
  for (const d of dtos) {
    const old = bySleeperId.get(d.externalId);
    if (!old) continue;
    const same =
      old.name === d.name && old.team === d.team && old.status === d.status && old.positions.join() === d.positions.join();
    if (!same) {
      await db.player.update({
        where: { id: old.id },
        data: { name: d.name, team: d.team, status: d.status, positions: d.positions },
      });
    }
  }
}

export async function ingestNfl(deps: IngestDeps): Promise<IngestResult> {
  const { db, now, season, teams = [12], formats = ["std", "half", "ppr"] } = deps;
  const result: IngestResult = { players: 0, rankings: 0, unmatched: 0, errors: [] };

  try {
    const dtos = await deps.players.fetchPlayers();
    await upsertPlayers(db, dtos);
    result.players = dtos.length;
    await markOk(db, "sleeper", now);
  } catch (e) {
    result.errors.push(`sleeper: ${message(e)}`);
    await markError(db, "sleeper", message(e));
  }

  const stored = await db.player.findMany({ where: { sport: "NFL" } });
  const idByExternal = new Map(stored.map((p) => [(p.externalIds as { sleeper: string }).sleeper, p.id]));
  const known: PlayerDTO[] = stored.map((p) => ({
    externalId: (p.externalIds as { sleeper: string }).sleeper,
    name: p.name, team: p.team, positions: p.positions, status: p.status,
  }));

  let failed = false;
  for (const format of formats) {
    for (const size of teams) {
      try {
        const rows = await deps.rankings.fetchRankings({ season, teams: size, format });
        for (const r of rows) {
          const hit = matchRanking(r, known);
          if (!hit) { result.unmatched++; continue; }
          const key = { playerId: idByExternal.get(hit.externalId)!, source: "ffc", season, format, teams: r.teams };
          await db.playerRanking.upsert({
            where: { playerId_source_season_format_teams: key },
            create: { ...key, adp: r.adp, fetchedAt: now },
            update: { adp: r.adp, fetchedAt: now },
          });
          result.rankings++;
        }
      } catch (e) {
        failed = true;
        result.errors.push(`ffc ${format}/${size}: ${message(e)}`);
        await markError(db, "ffc", message(e));
      }
    }
  }
  if (!failed) await markOk(db, "ffc", now);
  return result;
}
