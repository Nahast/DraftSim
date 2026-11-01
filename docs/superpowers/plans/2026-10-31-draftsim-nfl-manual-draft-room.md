# DraftSim NFL Manual Draft Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship build-order steps 1 and 2 of the spec: a scaffolded Next.js/Prisma app and the first usable NFL draft room (quick-setup onboarding, data ingestion, recommendation engine, draft room with undo, board).

**Architecture:** A pure `src/engine/` (no I/O) computes recommendations in the browser. Route handlers validate with Zod and persist with Prisma. Sources are adapters behind two interfaces, run by a secret-protected cron route. The draft id in the URL is the only credential.

**Tech Stack:** TypeScript (strict), Next.js App Router, Postgres + Prisma, Tailwind + shadcn/ui, TanStack Query, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-draftsim-design.md`. Visual reference (throwaway, do not port its code): `design/prototype/`, direction in `PRODUCT.md`, logo in `design/logo/`.

**Later plans, not this one:** beginner polish + cheat sheet + mock + results (step 3), Sleeper connect (4), Premier League (5), NBA (6), MLS (7). Design drawings for Sleeper-only fields are out of scope here; the `sleeperDraftId` column stays unused.

## Global Constraints

- TypeScript strict; Zod-parse every request body and every external API response (spec 4.1, 4.7).
- `src/engine/` has no database, network or `fetch` imports (spec 4.2).
- Draft id is `cuid()`, unguessable; no `User` table (spec 4.3).
- v1 drafts are snake or linear only; no auction or keeper (spec 1).
- Tap targets at least 44px; colour is never the only position indicator (spec 4.7).
- Every recommendation shows its data source and date (spec 4.4).
- Sleeper player map fetched at most once per day; attribute Fantasy Football Calculator in the footer (spec 2).
- Weights are constants in one file, `src/engine/weights.ts` (spec 4.4).
- Do not commit credentials; `.env` stays gitignored, `.env.example` is committed.

## Review Focus

1. Pick logged out of order or twice (same `overall` or same player): second write is rejected with 409, state unchanged. Owned by Task 8.
2. League where my slot is last in a snake (back-to-back picks) or teams = 2: `picksUntilMine` and survival stay correct. Owned by Task 3 and Task 5.
3. Empty or fully drafted pool, or every roster slot already full: `recommend` returns `[]` or only "bench" picks, never throws. Owned by Task 5.
4. A source returns garbage or is down: ingestion keeps old rows, records `SourceSync.lastError`, and the UI shows a stale-data banner. Owned by Task 7 and Task 11.
5. Player with no ADP (rookie or new signing): ranked by projection or last, never `NaN`. Owned by Task 5.

---

### Task 1: Scaffold

**Files:**
- Create: Next.js app via `create-next-app` (TypeScript, Tailwind, App Router, `src/` dir, no Turbopack flag needed), `docker-compose.yml` (Postgres 16), `.env.example` (`DATABASE_URL`, `CRON_SECRET`), `vitest.config.ts`, `README.md` (how to run, how to ingest)
- Modify: `package.json` scripts: `test`, `db:migrate`, `ingest`

**Interfaces:**
- Produces: `npm test` runs Vitest; `npm run dev` serves on 3000; Postgres reachable via `DATABASE_URL`.

- [ ] **Step 1:** Scaffold the app in the repo root, keeping existing `design/`, `docs/`, `PRODUCT.md`, `.impeccable/`. Install `prisma @prisma/client zod @tanstack/react-query vitest`. Init shadcn/ui.
- [ ] **Step 2:** Add `src/engine/smoke.test.ts` asserting `1 + 1 === 2`; run `npx vitest run`. Expected: PASS. Delete the smoke test.
- [ ] **Step 3:** Commit: `chore: scaffold Next.js, Prisma, Vitest`.

### Task 2: Prisma schema and client

**Files:**
- Create: `prisma/schema.prisma` (copy spec 4.3 exactly: `Sport`, `DraftMode`, `Experience`, `Player`, `PlayerRanking`, `Draft`, `DraftPick`, `SourceSync`), `src/lib/db.ts`

**Interfaces:**
- Produces: `export const db: PrismaClient` (singleton safe under Next dev reload).

- [ ] **Step 1:** Write the schema and run `npx prisma migrate dev --name init` against the Docker Postgres. Expected: migration applied, client generated.
- [ ] **Step 2:** Implement `db.ts` with the `globalThis` caching pattern.
- [ ] **Step 3:** Commit: `feat: prisma schema and client`.

### Task 3: Sports config and draft order (engine)

**Files:**
- Create: `src/engine/sports.ts`, `src/engine/order.ts`, `src/engine/types.ts`
- Test: `src/engine/order.test.ts`, `src/engine/sports.test.ts`

**Interfaces:**
- Produces (`types.ts`): `type Position = "QB"|"RB"|"WR"|"TE"|"K"|"DEF"`; `type RosterSlot = { slot: string; count: number }`; `type Rules = { teams: number; rounds: number; snake: boolean; scoring: "std"|"half"|"ppr"; rosterSlots: RosterSlot[]; myPosition: number }`; `type PlayerView = { id: string; name: string; team: string|null; positions: Position[]; adp: number|null; projection: number|null }`; `type Pick = { overall: number; team: number; playerId: string }`; `type DraftState = { picks: Pick[]; players: PlayerView[] }`.
- Produces (`sports.ts`): `NFL_DEFAULT_SLOTS: RosterSlot[]` (QB 1, RB 2, WR 2, TE 1, FLEX 1, K 1, DEF 1, BENCH 6) and `slotAccepts(slot: string, p: Position): boolean` (FLEX takes RB/WR/TE).
- Produces (`order.ts`): `teamOnClock(overall: number, teams: number, snake: boolean): number` (1-based slot); `nextPickFor(slot: number, afterOverall: number, rules: Rules): number | null`; `picksUntilMine(state: DraftState, rules: Rules): number`.

- [ ] **Step 1: Write failing tests.** `teamOnClock(1,12,true)===1`, `teamOnClock(12,12,true)===12`, `teamOnClock(13,12,true)===12`, `teamOnClock(24,12,true)===1`, `teamOnClock(13,12,false)===1`. `nextPickFor(12, 12, rules)===13` (back-to-back at the turn). `nextPickFor(slot, n, rules)===null` after the last round. teams = 2 case alternates 1,2,2,1.
- [ ] **Step 2:** Run `npx vitest run src/engine`. Expected: FAIL (not defined).
- [ ] **Step 3:** Implement both modules (snake: even rounds reverse).
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(engine): sports config and draft order`.

### Task 4: Survival probability (engine)

**Files:**
- Create: `src/engine/survival.ts`
- Test: `src/engine/survival.test.ts`

**Interfaces:**
- Consumes: `PlayerView`, `Rules`.
- Produces: `survivalChance(player: PlayerView, picksUntilMine: number, currentOverall: number): number` in `[0,1]`.

- [ ] **Step 1: Failing tests.** Player with ADP 5 and my pick 20 picks away from overall 10 returns `< 0.05`. ADP 60, same situation, returns `> 0.9`. `picksUntilMine === 0` returns `1`. `adp: null` returns `0.5` (unknown, never NaN).
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Model the player's pick position as normal around ADP, sigma = `SURVIVAL_SIGMA_BASE + adp * SURVIVAL_SIGMA_SLOPE` (constants in `weights.ts`); chance = P(pickedAt > currentOverall + picksUntilMine). Use an erf approximation; no new dependency.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit: `feat(engine): survival probability`.

### Task 5: Recommendation engine

**Files:**
- Create: `src/engine/weights.ts`, `src/engine/recommend.ts`
- Test: `src/engine/recommend.test.ts`

**Interfaces:**
- Consumes: Task 3 types and order helpers, Task 4 `survivalChance`.
- Produces: `type Recommendation = { player: PlayerView; score: number; reason: string; likelyGone: boolean; survival: number }`; `recommend(state: DraftState, rules: Rules, limit = 3): Recommendation[]`.

- [ ] **Step 1: Failing tests** (small fixture pool in the test file):
  - Roster with no RB: best RB outranks equal-value WR; reason contains "RB".
  - Roster with 1 K already: no second K in top 3 (never recommend a 3rd kicker rule from spec 4.4).
  - Player with ADP far past my next pick ranks below a similar-value player who won't survive.
  - `likelyGone === survival < 0.5`.
  - Review Focus 3: empty pool returns `[]`; all starters full returns only BENCH-eligible picks, no throw.
  - Review Focus 5: player with `adp: null, projection: null` is included, ranked last, `Number.isFinite(score)`.
  - Review Focus 2: my slot 12 of 12 at overall 12 (back-to-back) uses `picksUntilMine === 1`.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Score = value over replacement (projection, else `rankValue = 300 - adp`) minus replacement at that position for league size, plus need boost, minus full-slot penalty, plus scarcity boost, plus survival term, all weights from `weights.ts`. Reason string: pick the dominant factor and say it in plain words ("Best running back left. You have no RB yet.").
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit: `feat(engine): recommendation engine`.

### Task 6: Source adapters and name matcher

**Files:**
- Create: `src/sources/types.ts`, `src/sources/sleeper.ts`, `src/sources/ffc.ts`, `src/sources/match.ts`, `src/sources/fixtures/sleeper-players.json`, `src/sources/fixtures/ffc-adp.json` (recorded real responses, trimmed to ~30 players)
- Test: `src/sources/sleeper.test.ts`, `src/sources/ffc.test.ts`, `src/sources/match.test.ts`

**Interfaces:**
- Produces: `PlayerDTO = { externalId: string; name: string; team: string|null; positions: string[]; status: string|null }`; `RankingDTO = { name: string; team: string|null; position: string; adp: number; teams: number; format: "std"|"half"|"ppr"; season: number }`; `PlayerSource { sport: Sport; fetchPlayers(): Promise<PlayerDTO[]> }`; `RankingSource { sport: Sport; fetchRankings(opts: { season: number; teams: number; format: "std"|"half"|"ppr" }): Promise<RankingDTO[]> }`; `matchRanking(r: RankingDTO, players: PlayerDTO[]): PlayerDTO | null`.
- Both adapters take an injectable `fetch` for tests.

- [ ] **Step 1: Failing tests.** Sleeper: parses fixture, drops inactive non-fantasy positions, drops a row failing Zod, returns valid ones. FFC: maps fixture fields to `RankingDTO`. Matcher: matches on normalised name + team + position; "Kenneth Walker III" matches "Kenneth Walker"; two same-name players are disambiguated by team; unmatched returns `null` and is not guessed.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement with Zod schemas. Sleeper: `GET https://api.sleeper.app/v1/players/nfl`. FFC: `https://fantasyfootballcalculator.com/api/v1/adp/{format}?teams=&year=`. Check the real FFC field names against the fixture you record; the spec leaves the mapping to you.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit: `feat(sources): sleeper and ffc adapters with matcher`.

### Task 7: Ingestion route and SourceSync

**Files:**
- Create: `src/lib/ingest.ts`, `src/app/api/cron/ingest/route.ts`, `vercel.json` (daily cron)
- Test: `src/lib/ingest.test.ts`

**Interfaces:**
- Consumes: Task 6 sources, Task 2 `db`.
- Produces: `ingestNfl(deps: { players: PlayerSource; rankings: RankingSource; db: PrismaClient; now: Date; season: number }): Promise<{ players: number; rankings: number; unmatched: number }>`. Route `GET /api/cron/ingest` returns 401 without `Authorization: Bearer ${CRON_SECRET}`.

- [ ] **Step 1: Failing tests** (against a test database, or Prisma mock if no DB in CI): successful run upserts players and `PlayerRanking` and sets `SourceSync.lastOk`; a source throwing leaves existing rows untouched, sets `lastError` (Review Focus 4); unmatched ADP rows are counted, not inserted; running twice does not duplicate (unique key).
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement `ingestNfl`; the route checks the secret, calls it with real adapters for the three formats and the current season.
- [ ] **Step 4:** Run; expected PASS. Then run `npm run ingest` locally once and spot-check `Player` count > 500.
- [ ] **Step 5:** Commit: `feat: daily NFL ingestion`.

### Task 8: Draft API routes

**Files:**
- Create: `src/lib/schemas.ts`, `src/lib/rateLimit.ts`, `src/app/api/drafts/route.ts`, `src/app/api/drafts/[id]/route.ts`, `src/app/api/drafts/[id]/picks/route.ts`, `src/app/api/drafts/[id]/picks/last/route.ts`, `src/app/api/players/route.ts`
- Test: `src/app/api/drafts/drafts.test.ts`

**Interfaces:**
- Produces: `POST /api/drafts` body `{ sport:"NFL", experience, app, teams, myPosition, scoring, snake?, rounds? }` returns `{ id }` (defaults `rosterSlots = NFL_DEFAULT_SLOTS`, rounds 15). `GET /api/drafts/:id` returns draft plus picks. `POST .../picks` body `{ playerId, team? }` (team defaults to `teamOnClock`) returns the pick. `DELETE .../picks/last` removes the highest `overall`. `GET /api/players?sport&season&format&teams` returns `PlayerView[]`. `rateLimit(ip: string, bucket: string, max: number): boolean`.

- [ ] **Step 1: Failing tests.** Create then load round-trips; teams 1 or 40 rejected 400; logging a pick assigns `overall = picks+1`; Review Focus 1: same player twice returns 409 and the pick count is unchanged, concurrent same-`overall` writes yield one 201 and one 409 (rely on the unique constraints, map Prisma `P2002` to 409); undo on empty draft returns 404; 11th create from one IP in a minute returns 429.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement handlers with Zod. Rate limit is in-memory per instance. `// ponytail: per-instance map, swap for Upstash/Vercel KV if abuse appears.`
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit: `feat: draft and player API routes`.

### Task 9: App shell, tokens, home, onboarding

**Files:**
- Create: `src/app/layout.tsx` (fonts Barlow Condensed + Public Sans, query provider, footer with FFC and Sleeper attribution), `src/app/globals.css` (colour tokens from `PRODUCT.md`/prototype: ground `#EEF4F2`, ink `#0B1F2A`, teal `#14B8C6` for your pick and primary action only, tote `#0A0F14` with amber `#FFB400`, red `#D6322E` only for gone), `public/` logo copied from `design/logo/`, `src/app/page.tsx` (Home: NFL tile active, other sports shown as coming soon, Resume from localStorage), `src/app/setup/page.tsx` (quick setup wizard: experience, app, teams, pick number, then POST and redirect to `/draft/[id]`), `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Produces: `rememberDraft(id: string): void`, `lastDraftId(): string | null` (wrapped in try/catch, returns null when storage throws).

- [ ] **Step 1: Failing test:** `lastDraftId()` returns the id after `rememberDraft`, and returns `null` when `localStorage` throws.
- [ ] **Step 2:** Run; expected FAIL. Implement; run; expected PASS.
- [ ] **Step 3:** Build the pages. Follow the prototype's screens and copy for the setup flow; "If you don't know yet, we'll guess the middle" default for pick number is `ceil(teams/2)`.
- [ ] **Step 4:** Manual check: `npm run dev`, complete setup on a 390px viewport, land on the draft URL, reload and see Resume on Home.
- [ ] **Step 5:** Commit: `feat: app shell, home and quick setup`.

### Task 10: Draft room

**Files:**
- Create: `src/app/draft/[id]/page.tsx`, `src/components/draft/{TopBar,RecommendationCards,PlayerList,PlayerSheet,RosterPanel,RecentPicks}.tsx`, `src/lib/useDraft.ts`
- Test: `src/lib/useDraft.test.ts`

**Interfaces:**
- Consumes: Task 5 `recommend`, Task 8 routes.
- Produces: `useDraft(id: string): { state: DraftState; rules: Rules; recs: Recommendation[]; logPick(playerId: string, team?: number): Promise<void>; undo(): Promise<void>; onClock: number; picksUntilMine: number }`. Picks apply optimistically and roll back on a non-2xx.

- [ ] **Step 1: Failing test:** after `logPick` the player disappears from the available pool and `recs` recomputes without a network call; a 409 rolls the optimistic pick back.
- [ ] **Step 2:** Run; expected FAIL. Implement; run; expected PASS.
- [ ] **Step 3:** Build the screen per spec 3.2 item 3: top bar (round/pick, "you pick in N", "YOU'RE ON THE CLOCK"), top-3 cards with reason and likely-gone badge (Beginner: only top pick large with "Take this player"), searchable position-filtered list, "Mark as taken by [team]" defaulting to the team on the clock, always-visible Undo, roster with "You still need: …", recent picks. Beginner/Pro toggle in the top bar.
- [ ] **Step 4:** Manual check at 390px and 1280px: log 5 picks, undo one, reload; state persists.
- [ ] **Step 5:** Commit: `feat: NFL draft room`.

### Task 11: Freshness, source status and stale banner

**Files:**
- Create: `src/app/api/status/route.ts`, `src/components/DataStatus.tsx`
- Modify: `src/app/draft/[id]/page.tsx` (render `DataStatus`)
- Test: `src/components/DataStatus.test.tsx`

**Interfaces:**
- Produces: `GET /api/status` returns `{ sources: { source: string; lastOk: string|null; lastError: string|null }[] }`; `DataStatus` shows "ADP from Fantasy Football Calculator · updated {relative}" and a visible banner when `lastOk` is older than 48h or `lastError` is set (Review Focus 4).

- [ ] **Step 1: Failing test:** 3-day-old `lastOk` renders the stale banner; fresh data renders only the source line; null `lastOk` renders "no data yet".
- [ ] **Step 2:** Run; expected FAIL. Implement; run; expected PASS.
- [ ] **Step 3:** Commit: `feat: data freshness and stale banner`.

### Task 12: Draft board

**Files:**
- Create: `src/app/draft/[id]/board/page.tsx`, `src/components/draft/Board.tsx`
- Test: `src/components/draft/Board.test.tsx`

**Interfaces:**
- Consumes: `useDraft`, `teamOnClock`.
- Produces: grid of teams x rounds; cell for pick `n` sits at the column `teamOnClock(n)`; position shown by text label plus a hatch/fill pattern, never colour alone; my column highlighted teal.

- [ ] **Step 1: Failing test:** with picks 1, 12, 13 in a 12-team snake, cells render in round 1 slot 1, round 1 slot 12, round 2 slot 12; each cell contains its position text.
- [ ] **Step 2:** Run; expected FAIL. Implement; run; expected PASS.
- [ ] **Step 3:** Manual check at 390px (horizontal scroll with sticky round column) and 1280px.
- [ ] **Step 4:** Commit: `feat: draft board`.

### Task 13: End-to-end check and README

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Fresh clone flow: `docker compose up -d`, `cp .env.example .env`, `npx prisma migrate deploy`, `npm run ingest`, `npm run dev`. Complete a 12-team draft setup on a phone-width viewport and log picks to round 3. Expected: recommendations change after each pick, undo works, board matches.
- [ ] **Step 2:** `npx vitest run` and `npx tsc --noEmit` and `npm run build`. Expected: all pass.
- [ ] **Step 3:** Document the above and the known gaps (no Sleeper, mock, cheat sheet, results, glossary yet) in `README.md`.
- [ ] **Step 4:** Commit: `docs: README run and ingest instructions`.

---

## Self-review notes

- **Spec coverage:** build-order steps 1 and 2 are covered (onboarding quick setup, ingestion, engine, draft room, undo, board, freshness, rate limiting, attribution). Steps 3 to 7, glossary, results, cheat sheet, mock, settings screen and Sleeper connect are deliberately deferred to later plans.
- **Gap to confirm:** the spec lists "Settings" as a screen, but no step 1 or 2 deliverable needs it. Only the Beginner/Pro toggle lives in the draft room for now.
