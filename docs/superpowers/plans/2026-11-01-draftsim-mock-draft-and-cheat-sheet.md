# DraftSim Mock Draft, Results and Cheat Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone rehearse a draft against ADP-driven bots, see a graded result, and print a pre-draft cheat sheet with tiers and a round-by-round plan for their pick slot.

**Architecture:** Bots and the plan simulator are pure functions in `src/engine/` (seeded, no I/O). The server advances a mock draft in one serializable transaction (`POST /api/drafts/:id/advance`) so a refresh or double tap cannot duplicate or skip picks. The cheat sheet and results are read-only pages built from the same pool and engine as the draft room.

**Tech Stack:** Unchanged: Next.js App Router, Prisma 7 + Postgres, Zod, TanStack Query, Vitest (+ jsdom/testing-library for components).

**Spec:** `docs/superpowers/specs/2026-10-27-draftsim-design.md`, sections 3.1 step 5, 3.2 items 6 to 8, 3.4. Builds on `docs/superpowers/plans/2026-10-31-draftsim-nfl-manual-draft-room.md` (done, on `main`).

**Not in this plan:** glossary, settings, Sleeper connect, other sports, the deferred minors from the last review except the two folded into Task 1.

## Global Constraints

- `src/engine/` has no database, network, `fetch` or `Math.random` imports; all randomness comes from a seeded generator (spec 4.2, and so tests are repeatable).
- Zod-parse every request body; conflicts return 409, never 500 (spec 4.7; last review).
- A mock draft is never confused with a live one: "Practice" is shown as text, it never syncs, and live drafts reject mock-only calls (spec 3.4).
- Tap targets at least 44px; position is never shown by colour alone (spec 4.7).
- Every recommendation or ADP number shows its source and date (spec 4.4); reuse `DataStatusLoader`.
- Weights and thresholds are constants in `src/engine/weights.ts` (spec 4.4).
- Draft id in the URL is the only credential; no accounts (spec 4.3).
- Never use `| grep` or `| head` as the last stage of a chain whose exit code matters.

## Review Focus

1. A full bot draft (12 teams, 15 rounds, many seeds): no player drafted twice, no team over its roster capacity, no kicker or defense before the late rounds, never a throw when the pool runs thin. Owned by Task 2.
2. Double tap or two tabs: two simultaneous `advance` calls produce no duplicate pick, no gap, and never pick for my slot. Owned by Task 4.
3. My slot is first, last (back-to-back picks), or the draft ends on a bot's pick: `advance` stops exactly at my turn or at completion. Owned by Task 4.
4. Thin or empty data (fewer ranked players than picks, players with no ADP, teams = 2): bots, the plan and the tiers return fewer rows instead of throwing. Owned by Tasks 2 and 7.
5. Leaving a mock early or finishing with an empty or one-position roster: the grade and its text still read sensibly, never NaN. Owned by Task 6.
6. A live draft hit with mock-only calls (`advance`, or a mock rewind) and a mock draft hit with another team's manual pick: both refused. Owned by Task 4.

---

### Task 1: Seeded random, and two fixes the simulator depends on

**Files:**
- Create: `src/engine/rng.ts`
- Modify: `src/engine/recommend.ts:36-42` (survival at my last pick), `src/components/draft/TopBar.tsx` + `DraftRoom.tsx:37` (round text when complete)
- Test: `src/engine/rng.test.ts`, `src/engine/recommend.test.ts`, `src/components/draft/TopBar.test.tsx`

**Interfaces:**
- Produces: `seeded(seed: string): () => number` returning values in `[0, 1)`; same seed gives the same sequence. `gaussian(rng: () => number): number` (standard normal, Box-Muller).

- [ ] **Step 1: Failing tests.** `seeded("a")` twice yields identical first 5 numbers; `seeded("a")` and `seeded("b")` differ; all values in `[0,1)`; mean of 2000 `gaussian(seeded("g"))` within 0.1 of 0 and stddev within 0.1 of 1. In `recommend.test.ts`: `teams: 2, rounds: 1, myPosition: 2`, state with 1 pick made (so I am on the clock at my final pick), every recommendation has `survival === 1` and `likelyGone === false`. In `TopBar.test.tsx` (jsdom): `complete: true, round: 16` for a 15-round draft renders "15 rounds", not "16 rounds" (pass `rounds` prop).
- [ ] **Step 2:** Run `npx vitest run src/engine src/components/draft/TopBar`. Expected: FAIL (missing module / wrong values).
- [ ] **Step 3:** Implement `seeded` (mulberry32 over a 32-bit hash of the seed string) and `gaussian`. In `recommend.ts` set `survival = until === Infinity ? 1 : survivalChance(...)`. Add `rounds: number` to `TopBar` props and print it when `complete`.
- [ ] **Step 4:** Run the same command. Expected: PASS. Then `npx vitest run`: all prior tests pass.
- [ ] **Step 5:** Commit `feat(engine): seeded random; fix last-pick survival and completed round text`.

### Task 2: Bot picks

**Files:**
- Create: `src/engine/mock.ts`
- Modify: `src/engine/weights.ts` (add `BOT_NOISE_BASE = 2`, `BOT_NOISE_SLOPE = 0.12`, `BOT_LATE_ROUNDS = 2` meaning K and DEF only in the last 2 rounds)
- Test: `src/engine/mock.test.ts`

**Interfaces:**
- Consumes: `openSlots` (roster.ts), `slotAccepts` (sports.ts), `teamOnClock` (order.ts), `gaussian`/`seeded` (Task 1).
- Produces: `botPick(state: DraftState, rules: Rules, team: number, rng: () => number): string | null` returns the `playerId` the bot on `team` takes at overall `state.picks.length + 1`, or `null` when no eligible player exists. `simulateRest(state: DraftState, rules: Rules, seed: string): Pick[]` returns every remaining pick for all teams including mine, using `botPick` for everyone (used only by tests and the cheat sheet).

- [ ] **Step 1: Failing tests.**
  - `botPick` with `rng` forced to 0.5 (noise 0) takes the lowest-ADP available player the team can seat.
  - A team with a full QB slot and bench of QBs-only room never gets another QB; a team whose K slot is open still passes on a kicker in round 5 of 15 but takes one in round 14.
  - A team with every slot full returns `null`; an empty pool returns `null`; a pool of only players with `adp: null` returns `null`.
  - Same seed gives the same pick; different seeds sometimes differ (Review Focus 1).
  - Property test, seeds `s0..s19`: `simulateRest` for 12 teams x 15 rounds over a 200-player pool yields unique `playerId`s and, per team, `openSlots` never goes negative; for a pool of only 60 players it returns fewer picks and does not throw (Review Focus 4).
- [ ] **Step 2:** Run `npx vitest run src/engine/mock`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `botPick`: candidates are available players with a non-null ADP that the team's roster can still seat (direct slot, FLEX, or BENCH via `openSlots`), excluding K/DEF before the last `BOT_LATE_ROUNDS` rounds and excluding K/DEF without their own open slot. Score each candidate as `adp + gaussian(rng) * (BOT_NOISE_BASE + adp * BOT_NOISE_SLOPE)`; take the lowest. Implement `simulateRest` as a loop that appends picks until the draft is complete or `botPick` returns `null` for the team on the clock (then stop).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(engine): ADP bots and draft simulation`.

### Task 3: Shared player pool

**Files:**
- Create: `src/lib/pool.ts`
- Modify: `src/app/api/players/route.ts`
- Test: existing `src/app/api/drafts/drafts.test.ts` (GET /api/players cases) plus `src/lib/pool.test.ts`

**Interfaces:**
- Produces: `loadPool(db: PrismaClient, opts: { format: Scoring; teams: number }): Promise<PlayerView[]>`: the exact logic now inside the players route (season with the most rows, nearest league size, unranked players last). The route becomes: parse query, `Response.json(await loadPool(db, ...))`.

- [ ] **Step 1:** Write `pool.test.ts` calling `loadPool(testDb, ...)`: seeded ranked and unranked players come back ranked first (same assertions as the route tests, one case only).
- [ ] **Step 2:** Run `npx vitest run src/lib/pool`. Expected: FAIL (module missing).
- [ ] **Step 3:** Move the logic into `loadPool`; make the route call it.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS (route behaviour unchanged).
- [ ] **Step 5:** Commit `refactor: share the player pool loader`.

### Task 4: Mock draft API

**Files:**
- Modify: `src/lib/schemas.ts` (`CreateDraft` gets `mode: z.enum(["LIVE","MOCK"]).default("LIVE")`), `src/app/api/drafts/route.ts` (use `body.data.mode`), `src/app/api/drafts/[id]/picks/route.ts`, `src/app/api/drafts/[id]/picks/last/route.ts`
- Create: `src/app/api/drafts/[id]/advance/route.ts`
- Test: `src/app/api/drafts/mock.test.ts`

**Interfaces:**
- Consumes: `loadPool` (Task 3), `botPick`/`seeded` (Tasks 1, 2), `teamOnClock`, `isConflict` (lib/conflict.ts).
- Produces: `POST /api/drafts` accepts `mode`. `POST /api/drafts/:id/advance` returns `200 { added: number, complete: boolean }`; `409` for a LIVE draft or a conflict; `404` unknown draft. It runs bot picks (source `"bot"`, RNG seed `` `${draftId}:${overall}` ``) for every team on the clock until it is my slot or the draft is complete, in one `Serializable` transaction. In a MOCK draft, `POST .../picks` rejects `team` other than `myPosition` with 400 and rejects a pick when I am not on the clock with 409. In a MOCK draft, `DELETE .../picks/last` removes every pick after my previous pick, plus that pick (rewinds to my turn); with none of my picks it removes everything.

- [ ] **Step 1: Failing tests** (create a mock draft via the route, seed 40 ranked players):
  - Create with `mode: "MOCK"` stores `MOCK`; default stays `LIVE`.
  - Slot 3 of 12: `advance` adds exactly 2 bot picks (overalls 1 and 2, `source: "bot"`, teams 1 and 2) and stops with me on the clock; a second `advance` adds 0.
  - Slot 1: `advance` adds 0 at the start. After my pick (overall 1), `advance` adds 22 bot picks and stops at overall 24, my next pick in a snake (Review Focus 3). Slot 12: after my pick at overall 12 it adds 0, because overall 13 is mine too (back-to-back).
  - `teams: 2, rounds: 1`: after my pick the draft is complete and `advance` returns `complete: true`; when the last pick belongs to a bot, `advance` makes it and reports complete.
  - Two simultaneous `advance` calls: all statuses in `{200, 409}`, overalls contiguous, no duplicate player, no pick by my slot (Review Focus 2).
  - Pool smaller than the picks needed: `advance` stops without error and returns `complete: false`.
  - `advance` on a LIVE draft is 409 and writes nothing; a manual pick with `team` 5 in a MOCK draft where I am slot 3 is 400; a pick when a bot is on the clock is 409 (Review Focus 6).
  - Mock undo after my second pick rewinds to the turn of my second pick (bots' picks since my first pick are removed too and my second pick is removed).
- [ ] **Step 2:** Run `npx vitest run src/app/api/drafts/mock`. Expected: FAIL.
- [ ] **Step 3:** Implement. `advance`: load draft and pool (`format = draft.scoring`, `teams = draft.teams`), then inside the serializable transaction read the current picks, loop calling `botPick`, `create` each pick, stop on my slot, completion, or `null` from `botPick`. Map `isConflict` to 409.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS; run the concurrency test 3 times to check it is stable.
- [ ] **Step 5:** Commit `feat: mock draft API with bot advance`.

### Task 5: Mock draft in the app

**Files:**
- Modify: `src/lib/useDraft.ts`, `src/components/draft/DraftRoom.tsx`, `PlayerSheet.tsx`, `TopBar.tsx`, `src/app/setup/SetupWizard.tsx`, `src/app/page.tsx`
- Test: `src/lib/useDraft.test.tsx`, `src/app/setup/SetupWizard.test.tsx`, `src/components/draft/PlayerSheet.test.tsx`

**Interfaces:**
- Consumes: `POST /api/drafts/:id/advance` (Task 4); `DraftDTO` gains `mode: "LIVE" | "MOCK"`.
- Produces: `useDraft` returns `mode` and `advancing: boolean`. For MOCK drafts it calls `advance` once when the draft is ready and the bot is on the clock, and after each successful `logPick`; for LIVE drafts it never calls `advance`.

- [ ] **Step 1: Failing tests.**
  - `useDraft`: MOCK draft whose clock belongs to a bot calls `POST /api/drafts/d1/advance` exactly once on load and the draft refetches afterwards; after `logPick` it calls `advance` again; a LIVE draft makes no `advance` call at all.
  - `SetupWizard`: step 3 has two buttons, "Start my draft" posting `mode: "LIVE"` and "Practice first" posting `mode: "MOCK"`; visiting `/setup?mode=mock` (mock `useSearchParams`) shows only "Start practice draft".
  - `PlayerSheet` in a MOCK draft hides the "Taken by" select and its button reads "I took him".
- [ ] **Step 2:** Run `npx vitest run src/lib/useDraft src/app/setup src/components/draft/PlayerSheet`. Expected: FAIL.
- [ ] **Step 3:** Implement. Draft room in MOCK: a "Practice draft" tag in the top bar (text, with the line "Practice only. Nothing here is saved to your league."), the on-clock status reads "Bots are picking…" while `advancing`, "Undo my last pick" label, "Take this player" always allowed when I am on the clock. Home gets a second link "Practice a mock draft" to `/setup?mode=mock`.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS. Then manual: practice a 12-team draft at slot 1 in the browser at 390px and 1280px through to the end of round 3; confirm bots fill in, undo rewinds to your turn, a refresh resumes.
- [ ] **Step 5:** Commit `feat: mock draft room`.

### Task 6: Results

**Files:**
- Create: `src/engine/grade.ts`, `src/app/draft/[id]/results/page.tsx`, `src/app/draft/[id]/results/ResultsView.tsx`
- Modify: `src/engine/weights.ts` (`GRADE_CUTS = [0.85, 0.7, 0.55]` for A, B, C, else D; `STEAL_MARGIN = 6` picks), `src/components/draft/DraftRoom.tsx` (when complete, link "See my team")
- Test: `src/engine/grade.test.ts`, `src/app/draft/[id]/results/ResultsView.test.tsx`

**Interfaces:**
- Consumes: `openSlots`, `stillNeeded` (roster.ts), `ADP` on `PlayerView`.
- Produces: `type Grade = { letter: "A"|"B"|"C"|"D"; score: number; strengths: string[]; weaknesses: string[]; steals: { name: string; overall: number; adp: number }[] }`; `gradeDraft(mine: { player: PlayerView; overall: number }[], rules: Rules): Grade`. `score` in `[0, 1]`: 60% starting-lineup completeness (filled starter slots / total starter slots) plus 40% value (share of picks taken at or after their ADP, capped), then letter by `GRADE_CUTS`.

- [ ] **Step 1: Failing tests.**
  - Full starting lineup with every pick at or after its ADP grades "A" and `weaknesses` is empty; the same roster with no QB, K or DEF lists "No QB", "No K", "No DEF" in `weaknesses`.
  - Empty `mine` returns letter "D", `score` 0, a weakness "You have not drafted anyone yet", and no `NaN` anywhere (Review Focus 5); one position only (6 RBs) is "D" with "Missing: QB, WR, TE, FLEX, K, DEF" style text built from `stillNeeded`.
  - A player taken 8 or more picks after his ADP appears in `steals`; one taken 8 picks before does not.
  - `ResultsView`: renders the roster by slot (each starter slot shows the player or "Open"), the letter grade, the strengths and weaknesses as sentences, a "Copy link" button that calls `navigator.clipboard.writeText` when present and shows "Link copied", and falls back to selecting the URL text when `clipboard` is undefined.
- [ ] **Step 2:** Run `npx vitest run src/engine/grade src/app/draft`. Expected: FAIL.
- [ ] **Step 3:** Implement `gradeDraft` and `ResultsView` (reuse `useDraft`; "Draft again" link to `/`; a "Practice" tag for mock drafts).
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: draft results with a plain-language grade`.

### Task 7: Cheat sheet engine

**Files:**
- Create: `src/engine/cheatsheet.ts`
- Modify: `src/engine/weights.ts` (`TIER_GAP_BASE = 4`, `TIER_GAP_SLOPE = 0.06`, `PLAN_ALTERNATES = 2`)
- Test: `src/engine/cheatsheet.test.ts`

**Interfaces:**
- Consumes: `recommend`, `simulateRest` (Task 2), `nextPickFor`, `teamOnClock`.
- Produces:
  - `buildTiers(players: PlayerView[], position: Position): { tier: number; players: PlayerView[] }[]`: players of that position with a non-null ADP sorted by ADP; a new tier starts when `adp - previousAdp > TIER_GAP_BASE + previousAdp * TIER_GAP_SLOPE`.
  - `type PlanRow = { round: number; overall: number; pick: PlayerView; alternates: PlayerView[]; reason: string }`; `buildPlan(state: DraftState, rules: Rules, seed: string): PlanRow[]`: starting from the current picks, simulates the other teams with `botPick` at zero noise and my own picks with `recommend(...)[0]` (alternates are recs 2 and 3), returning one row per remaining pick of mine.
  - `planSummary(rows: PlanRow[]): string[]` returns exactly 3 plain sentences (early rounds 1 to 3, middle rounds, last rounds), each naming positions, e.g. "Rounds 1 to 3: running back, wide receiver, wide receiver."

- [ ] **Step 1: Failing tests.**
  - `buildTiers`: ADPs 1, 2, 3, 12, 13, 30 give tiers `[1,2,3] [12,13] [30]`; players with `adp: null` are left out; an empty list returns `[]`.
  - `buildPlan` for a 12-team slot-5 draft over a fixture pool: first row is overall 5, then 20, 29 (snake); no player appears twice across `pick` and earlier rows; alternates differ from `pick`; running it twice with the same seed returns identical rows; started from a state with 3 of my picks made it returns only my remaining picks.
  - Thin data (Review Focus 4): pool of 10 players returns fewer rows than my remaining picks and does not throw; `teams: 2`; empty pool returns `[]`.
  - `planSummary` always returns 3 non-empty strings for a 15-row plan, and 3 strings with a fallback sentence ("We need more player data to plan your picks.") for `[]`.
- [ ] **Step 2:** Run `npx vitest run src/engine/cheatsheet`. Expected: FAIL.
- [ ] **Step 3:** Implement. `buildPlan`: loop overall from `state.picks.length + 1`; on my turn take `recommend(sim, rules, 1 + PLAN_ALTERNATES)`; otherwise `botPick(sim, rules, team, () => 0.5)` (rng 0.5 gives gaussian 0, the no-noise pick); stop when the pool or the draft ends. `planSummary` groups row positions by round band and joins position names in plain words.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(engine): tiers and a round-by-round plan`.

### Task 8: Cheat sheet page, print, and entry points

**Files:**
- Create: `src/app/draft/[id]/cheatsheet/page.tsx`, `CheatSheetView.tsx`
- Modify: `src/app/globals.css` (print rules), `src/components/draft/TopBar.tsx` (link)
- Test: `src/app/draft/[id]/cheatsheet/CheatSheetView.test.tsx`

**Interfaces:**
- Consumes: `useDraft`, `buildTiers`, `buildPlan`, `planSummary`, `DataStatusLoader`.
- Produces: page `/draft/:id/cheatsheet`. Beginner view: a "Your plan" card with the three `planSummary` sentences, then the round-by-round list (round, pick number, name, position, one alternate). Pro view: the same list with all alternates and the reason, then tiers per position (QB, RB, WR, TE, K, DEF) as compact tables. A "Print" button calls `window.print()`. Under `@media print` the site header, footer, top bar buttons and the mode toggle are hidden, tables avoid page breaks inside a row, and text is black on white.

- [ ] **Step 1: Failing tests** (jsdom, with `useDraft` mocked to return a fixture draft and pool): Beginner shows exactly 3 plan sentences and no tier tables; Pro shows a table per position with tier numbers; every row's position is written as text; the Print button calls `window.print`; with an empty pool the page shows "We need more player data" instead of an empty table (Review Focus 4); `DataStatusLoader` is rendered.
- [ ] **Step 2:** Run `npx vitest run src/app/draft`. Expected: FAIL.
- [ ] **Step 3:** Implement the view and print CSS; add a "Cheat sheet" link beside "Board" in the top bar.
- [ ] **Step 4:** Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`. Expected: all clean. Manual: open the sheet for a 12-team slot-6 draft at 390px, in both modes, and use the browser print preview to confirm only the sheet prints on one to two pages.
- [ ] **Step 5:** Commit `feat: printable cheat sheet`.

### Task 9: Whole-flow check and docs

**Files:**
- Modify: `README.md` ("What works today", "Not built yet")

- [ ] **Step 1:** In the browser: Home -> Practice a mock draft -> finish all rounds quickly (use the recommended pick each time) -> Results shows a grade -> open the cheat sheet for the same draft.
- [ ] **Step 2:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Expected: all pass.
- [ ] **Step 3:** Update `README.md`; commit `docs: mock draft, results and cheat sheet`.

---

## Self-review notes

- **Spec coverage:** mock draft (3.4, 3.1 step 5 "Practice first"), results (3.2 item 8, needed because the mock draft "ends in the results screen"), cheat sheet (3.2 item 6: tiers, targets by round for the pick slot, printable, beginner "your plan in three lines"). Not covered here on purpose: glossary, settings, share image, Sleeper, other sports.
- **Type consistency:** `botPick` and `simulateRest` (Task 2) are used by Tasks 4 and 7; `loadPool` (Task 3) by Task 4; `gradeDraft`'s input comes from `useDraft` state in Task 6; `DraftDTO.mode` added in Task 5 and returned by the existing GET route already.
- **Proportion:** the plan is written as signatures, test names and assertions; bodies appear nowhere.
