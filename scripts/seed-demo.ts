// Fills a database with invented players and ADP so the app can be run, demoed and screenshotted offline.
// Names, teams and numbers are made up. Refuses to touch any database whose name does not end in "_demo".
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seeded } from "../src/engine/rng";

const url = process.env.DATABASE_URL ?? "";
if (!/_demo(\?|$)/.test(url.split("/").pop() ?? "")) {
  throw new Error("seed:demo only runs against a database named *_demo (it wipes players, rankings and drafts)");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const FIRST = ["Marcus", "Devon", "Tobias", "Lennox", "Callum", "Jaylen", "Rafael", "Soren", "Idris", "Bram", "Kofi", "Dario", "Elias", "Nico", "Tariq", "Anders", "Mateo", "Reggie", "Cassius", "Holden", "Rowan", "Silas", "Teo", "Emeka", "Lucian"];
const LAST = ["Vale", "Okafor", "Brandt", "Castellan", "Whitlock", "Moreau", "Halvorsen", "Ferreira", "Quill", "Ashby", "Delacroix", "Nakamura", "Ortega", "Sutter", "Pemberton", "Larkin", "Ibarra", "Kessler", "Dunmore", "Thorne", "Marlowe", "Stroud", "Vasquez-Hale", "Adeyemi", "Lindqvist"];
const TEAMS = ["KRN", "VLT", "ORB", "LYN", "MRD", "HLX", "ZEN", "TRK", "BRW", "SPL"];
const TOWNS = ["Harbor", "Summit", "Ridgeway", "Cobalt", "Lakeshore", "Ironwood", "Redline", "Northgate", "Fairhaven", "Stonebridge"];

// [position, how many, first ADP, ADP step]: tuned so the board looks like a real draft (RB and WR early, K and DEF last).
const SHAPE = [["QB", 36, 14, 5.2], ["RB", 80, 1, 1.9], ["WR", 100, 2, 1.6], ["TE", 36, 22, 4.4], ["DEF", 24, 118, 3.4], ["K", 20, 138, 3.1]] as const;

async function main() {
  const rng = seeded("draftsim-demo");
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  await db.$executeRawUnsafe('TRUNCATE "DraftPick","Draft","PlayerRanking","Player","SourceSync" RESTART IDENTITY CASCADE');

  const used = new Set<string>();
  const rows: { name: string; team: string; pos: string; adp: number }[] = [];
  for (const [pos, count, first, step] of SHAPE) {
    for (let i = 0; i < count; i++) {
      let name = "";
      if (pos === "DEF") name = `${TOWNS[i % TOWNS.length]} ${["Wardens", "Anchors", "Sentinels"][Math.floor(i / TOWNS.length)] ?? "Guard"}`;
      else do name = `${pick(FIRST)} ${pick(LAST)}`; while (used.has(name));
      used.add(name);
      rows.push({ name, team: pos === "DEF" ? "DEF" : pick(TEAMS), pos, adp: Math.round((first + i * step + (rng() - 0.5) * step) * 10) / 10 });
    }
  }
  rows.sort((a, b) => a.adp - b.adp);

  await db.player.createMany({
    data: rows.map((r, i) => ({ sport: "NFL" as const, name: r.name, team: r.team, positions: [r.pos], externalIds: { demo: i } })),
  });
  const players = await db.player.findMany({ orderBy: { id: "asc" } });
  const byName = new Map(players.map((p) => [p.name, p.id]));
  const now = new Date();
  await db.playerRanking.createMany({
    data: rows.flatMap((r, i) =>
      ["std", "half", "ppr"].map((format) => ({
        playerId: byName.get(r.name)!, source: "ffc", season: 2026, format, teams: 12, adp: r.adp, rank: i + 1, projection: null, fetchedAt: now,
      })),
    ),
  });
  await db.sourceSync.createMany({ data: [{ source: "ffc", lastOk: now }, { source: "sleeper", lastOk: now }] });
  console.log(`Seeded ${rows.length} invented players into ${url.split("/").pop()}`);
}

main().finally(() => db.$disconnect());
