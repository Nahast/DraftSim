# DraftSim — Design

Status: draft for approval (2026-10-27). Nothing is built yet; the repo holds only `LICENSE` and `.gitignore`.

## 1. Intent

A website that helps anyone do a fantasy draft well, for **NFL, NBA, Premier League and MLS**. It is a neutral companion that sits next to whatever app the league uses (ESPN, Yahoo, Sleeper, other). It tells you who to take, explains why in plain language, and adapts as the draft unfolds.

Who it is for, in the user's words: from "a housewife that doesn't understand how it works" to "someone who plays fantasy every year and wants to do a quick planning". Some people don't know the rules or any players. Some plan in advance, some do it on the fly during the draft.

### Goals
- A beginner can finish a draft with a good team without knowing the rules or any players.
- A veteran can set up in under a minute and use it as a fast cheat sheet.
- During a draft, the site shows the best available picks for your next turn, updated after every pick anyone makes.
- Users can enter other people's picks so the site knows the real draft state and adapts.
- Where a free public data source exists, pull real data automatically (player lists, rankings/ADP, and, for Sleeper, live picks).
- Work before the draft too: a mock draft and a pre-draft cheat sheet.

### Non-goals (v1)
- **Making picks inside the other apps for the user.** No fantasy app offers a write API; automating it would break their terms and be fragile. The site shows the pick, the user taps it in their own app.
- Accounts, logins, payments, social/leagues-of-friends features.
- In-season management (trades, waivers, lineups).
- Budget/salary-cap squad games (e.g. classic FPL). v1 is draft formats only. See open question 2.
- Auction and keeper/dynasty drafts. v1 is snake and linear only. *(My call: auction needs bids and budgets, a different data model.)*
- Other sports.

### Anti-goals (a failure even if it technically works)
- Jargon the beginner can't parse (ADP, VORP, WR2, flex) shown without explanation.
- A setup flow that takes longer than the draft clock allows. The veteran path must be fast.
- Recommendations that ignore the league's actual rules (roster slots, scoring).
- Silently showing stale or wrong data. Every data source shows "last updated" and the site says so when a source is down.

## 2. What the data situation really is (researched 2026-10-27)

"Can we query a public API for the best recommendations?" Partly. Player lists and ADP exist for free in some sports. **Ready-made "best pick" recommendations do not exist as a free API, so the site computes them itself** (section 6) from player data plus ADP/rankings.

| Sport | Player identity + live draft picks | Rankings / ADP | Verdict |
|---|---|---|---|
| NFL | **Sleeper API**: free, read-only, no auth, <1000 calls/min, player map ~5MB cache daily. Has drafts + picks endpoints. | **Fantasy Football Calculator ADP REST API**: free, JSON, params for scoring/teams/year/position, updates daily, attribution requested. FantasyPros has ECR/ADP/projections but needs a key (free tier unconfirmed). | Good. Fully automatable. |
| NBA | Sleeper covers NBA players and drafts too. | **No free ADP source found.** balldontlie free tier has basic player/game data only (limits reported inconsistently); season stats are paid. | Gap. See open question 1. |
| Premier League | **FPL API** (`fantasy.premierleague.com/api/bootstrap-static/`): unofficial, undocumented, no auth. All players, team, price, points, form, `selected_by_percent`, expected points. | Derive a ranking from the same payload (points, form, ownership). No ADP. | Usable for players/ranking. Draft-mode endpoints unconfirmed. |
| MLS | No official or free API found. Third parties (Sportmonks, TheStatsAPI) are paid or trial-only. | None free. | Gap. See open question 1. |

Terms to respect:
- **Sleeper is free for non-commercial use only**; commercial use needs a licence from Sleeper. Trending data needs attribution. Respect the 1000/min limit and fetch the player map at most once a day.
- Fantasy Football Calculator asks for a link/mention. We include it in the footer and on player data.
- FPL's API is unofficial: it can change without notice. All FPL access goes through one adapter with a stored snapshot fallback.

## 3. Product description

### 3.1 Onboarding

Goal: reach the draft room in as few taps as possible, with presets so a beginner never has to understand a setting.

1. **Pick a sport**: NFL / NBA / Premier League / MLS (big tiles).
2. **How well do you know fantasy?** Three choices: "I've never played" / "I've played a bit" / "I play every year". This sets *Beginner mode* (plain-language reasons, glossary links, simplified list, defaults for everything) or *Pro mode* (dense table, all columns, no hand-holding). Changeable anytime.
3. **Which app is your league on?** ESPN / Yahoo / Sleeper / Other / I don't know. Sleeper unlocks "Connect" (step 4b). Everything else uses manual entry. "I don't know" is treated as Other with default rules.
4. **League setup**, two paths:
   - **4a. Quick setup (default for beginners):** app-specific preset (e.g. "ESPN standard NFL, 10 teams, PPR"), plus two questions: *How many teams?* and *What pick number are you?* ("If you don't know yet, we'll guess the middle and you can change it.")
   - **4b. Connect Sleeper:** enter Sleeper username → list of leagues for the season → pick the league → pick the draft. Settings, order and picks import automatically. Falls back to 4a if anything fails.
   - Pro users get an "Edit rules" panel: roster slots, scoring format (standard / half-PPR / PPR), draft type (snake / linear), rounds, timer.
5. **Go to the draft room** (live) or **"Practice first"** (mock draft, 3.4).

The draft is saved immediately under an unguessable id in the URL, and the id is also kept in browser storage, so closing the tab never loses it.

### 3.2 Screens

1. **Home**: sport tiles, "Resume your draft" (from browser storage), "Practice a mock draft".
2. **Onboarding wizard**: as above, one question per screen on mobile.
3. **Draft room** (the main screen, mobile-first because people draft on their phones):
   - **Top bar**: round/pick, "you pick in N picks" / "YOU'RE ON THE CLOCK", optional timer, sync status ("Synced with Sleeper · 3s ago" or "Manual").
   - **Recommendations panel**: top 3 picks as cards. Each card: player, team, position, one plain-language reason ("Best running back left. You have no RB yet."), and a "likely gone by your next pick?" badge. In Beginner mode, only the top pick is large with a single "Take this player" button.
   - **Available players**: searchable, filterable by position, sortable; tap a player to open the detail drawer.
   - **Log a pick**: tap a player → "Mark as taken by [team]" (defaults to whoever is on the clock) or "I took him". One tap in the common case. Undo last pick always visible.
   - **My roster**: starting slots with filled/empty state and needs highlighted ("You still need: QB, TE").
   - **Recent picks** feed.
4. **Draft board**: full grid (teams × rounds), colour by position, your picks highlighted. Reached from the draft room.
5. **Player detail drawer/page**: stats, projected points or rank, ADP, injury/status, why recommended, source and last-updated.
6. **Cheat sheet (pre-draft)**: tiers by position, "targets by round" for your pick slot, printable. Pro users like this; beginners get "your plan" in three lines.
7. **Mock draft**: same room, bots pick by ADP with some randomness so users can rehearse. Ends in the results screen.
8. **Results**: your final team by slot, a simple grade with strengths/weaknesses in plain language, share/copy link. Draft rooms can also end here when all rounds are done.
9. **Glossary / help**: short entries (ADP, snake draft, flex, PPR...), reachable from every jargon term in Beginner mode via inline "?".
10. **Settings**: mode (beginner/pro), edit league rules, reconnect Sleeper, data-source status.

### 3.3 Live data flow in the draft room

- **Manual**: user logs each pick; the draft state updates instantly and recommendations recompute locally.
- **Sleeper-connected** (NFL and NBA): the server polls Sleeper's `draft/<id>/picks` every ~3 s while the draft is open and pushes new picks to the client; the user can still correct picks by hand. The client keeps working in manual mode if Sleeper is unreachable.

### 3.4 Mock draft

Bots draft by ADP with noise, following the same roster rules. Same room UI, flagged "Practice" so it's never confused with a live draft, no sync, results at the end.

## 4. Technical design

### 4.1 Stack (user chose TypeScript + Prisma; the rest are my calls)

- **Language:** TypeScript everywhere (strict).
- **App:** Next.js (App Router) — one project for UI and API route handlers. *My call.*
- **Database:** PostgreSQL via **Prisma**. Postgres locally in Docker, hosted Postgres (Neon or Supabase) in production. *My call: Postgres in both so dev and prod behave the same.*
- **UI:** Tailwind CSS + shadcn/ui; mobile-first. TanStack Query for fetching/polling. *My call.*
- **Validation:** Zod for every request body and every external API response.
- **Tests:** Vitest. Scope: the recommendation engine and source adapters (with recorded fixtures). No E2E suite in v1.
- **Hosting/jobs:** Vercel with Vercel Cron for daily data ingestion. *My call; swappable.*

### 4.2 Layout

```
prisma/schema.prisma
src/
  app/                    # pages + API route handlers
    api/drafts/...        # create draft, log pick, undo, sync
    api/cron/ingest/...   # daily ingestion, protected by CRON_SECRET
  engine/                 # PURE functions, no I/O, runs in the browser too
    sports.ts             # per-sport config: positions, default roster slots, scoring presets
    recommend.ts          # ranks available players for the next pick
    survival.ts           # chance a player is still there at my next pick
    mock.ts               # bot pick logic
  sources/                # one adapter per external provider
    types.ts              # RankingSource / PlayerSource interfaces
    sleeper.ts  ffc.ts  fpl.ts
  components/ lib/
```

`engine/` stays free of database and network code so the draft room recomputes recommendations instantly after each pick on the client, with no round trip, and the same code is unit-testable.

### 4.3 Data model (Prisma, sketch)

```prisma
enum Sport      { NFL NBA EPL MLS }
enum DraftMode  { LIVE MOCK }
enum Experience { BEGINNER PRO }

model Player {
  id         String   @id @default(cuid())
  sport      Sport
  name       String
  team       String?
  positions  String[]                  // ["RB"] or ["WR","TE"] etc.
  status     String?                   // injury / availability
  externalIds Json                     // { sleeper: "4046", fpl: 318 }
  rankings   PlayerRanking[]
  picks      DraftPick[]
  @@index([sport])
}

model PlayerRanking {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  source    String                     // "ffc", "fpl", "seed"
  season    Int
  format    String                     // "ppr" | "half" | "std" | "default"
  teams     Int?                       // league size the ADP was measured at
  adp       Float?
  rank      Int?
  projection Float?                    // projected fantasy points, when available
  fetchedAt DateTime
  @@unique([playerId, source, season, format, teams])
}

model Draft {
  id          String     @id @default(cuid())   // unguessable; it's the access key
  sport       Sport
  mode        DraftMode
  experience  Experience
  app         String                           // "espn" | "yahoo" | "sleeper" | "other"
  teams       Int
  rounds      Int
  myPosition  Int                              // 1-based draft slot
  snake       Boolean    @default(true)
  scoring     String
  rosterSlots Json                             // [{ slot: "QB", count: 1 }, { slot: "FLEX", ... }]
  sleeperDraftId String?                       // set when connected
  createdAt   DateTime   @default(now())
  picks       DraftPick[]
}

model DraftPick {
  id        String   @id @default(cuid())
  draftId   String
  draft     Draft    @relation(fields: [draftId], references: [id], onDelete: Cascade)
  overall   Int                                // 1..teams*rounds
  team      Int                                // draft slot that took the player
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  source    String                             // "manual" | "sleeper"
  @@unique([draftId, overall])
  @@unique([draftId, playerId])
}

model SourceSync {                              // powers "last updated" + failure banners
  source    String   @id
  lastOk    DateTime?
  lastError String?
}
```

No `User` table in v1; the draft id is the credential. Drafts older than 90 days are purged by the same cron job.

### 4.4 Recommendation engine (the core)

Given the available players, the league rules and my roster, return the top picks with a reason for each. Pure function: `recommend(state, rules) → Recommendation[]`.

Scoring of each available player combines:
1. **Value over replacement** — projected points (or rank-derived value where projections don't exist) minus what a typical replacement-level player at that position would give, given league size and roster slots.
2. **Roster need** — boost for a position where my starting slots are empty, penalty where they are full (beginner-safe: never recommend a 3rd kicker).
3. **Scarcity / run risk** — boost when few good players remain at that position relative to teams still needing it.
4. **Survival** — `survival.ts` estimates the chance each player is still available at my next pick from the player's ADP and its spread. If a player will almost certainly last, prefer taking the one who won't.
5. **Reason string** — generated from whichever factors dominated, in plain language for Beginner mode.

**Scoring models differ by sport.** NFL and the draft games use points. Many NBA leagues use 9-category scoring, where value is the sum of per-category z-scores rather than projected points, and roster slots are mostly flexible (G/F/UTIL) rather than strict positions. *(My call: `scoring` selects a value model, `points` or `categories`, behind the same `recommend()` signature; NBA supports both, categories first because it's the most common on ESPN and Yahoo.)* The Premier League target is the actual FPL Draft game (15-man squad, no shared players), and its roster presets are confirmed when that step starts. *(My call.)*

First version uses fixed, documented weights; weights are constants in one file so they can be tuned. Ranking quality is only as good as the ADP/projection inputs; the UI shows the data source and date next to every recommendation.

### 4.5 Source adapters

```ts
interface PlayerSource  { sport: Sport; fetchPlayers(): Promise<PlayerDTO[]> }
interface RankingSource { sport: Sport; fetchRankings(opts): Promise<RankingDTO[]> }
```

- `sleeper.ts` — player map (daily), user/league/draft lookup, draft picks (polled). Output validated with Zod; players matched on `externalIds.sleeper`.
- `ffc.ts` — ADP per scoring format and league size for NFL.
- `fpl.ts` — `bootstrap-static` → players + a derived ranking; snapshot stored in the DB so the site still works if the unofficial API changes.
- NBA and MLS ranking inputs: pending open question 1; the adapter interface lets a CSV seed or a paid API slot in without touching the engine.

Cross-source name matching (e.g. FFC player ↔ Sleeper player) goes through a small matcher using name + team + position, with unmatched rows logged rather than guessed.

### 4.6 API routes (all Zod-validated)

- `POST /api/drafts` create; `GET /api/drafts/:id` load with picks.
- `POST /api/drafts/:id/picks` log a pick; `DELETE /api/drafts/:id/picks/last` undo.
- `POST /api/drafts/:id/sleeper` connect; `GET /api/drafts/:id/sync` pulls new picks (short server cache so many viewers don't multiply Sleeper calls).
- `GET /api/players?sport&season&format&teams` players + rankings for the engine.
- `GET /api/cron/ingest` (secret-protected) refreshes players and rankings, writes `SourceSync`.

### 4.7 Quality and safety
- Rate-limit by IP on draft creation and sync routes; Sleeper polling is server-side and cached to stay far under its limit.
- Never trust external payloads: Zod-parse, drop bad rows, record the error in `SourceSync`.
- Accessibility basics: colour is never the only position indicator, tap targets ≥ 44px, readable contrast, keyboard-usable player search.

## 5. Build order (each step is usable on its own)

1. **Scaffold**: Next.js + Prisma + Postgres + Vitest, CI-less, one `README` with how to run.
2. **NFL manual draft room**: onboarding (quick setup), Sleeper player map + FFC ADP ingestion, engine, draft room, undo, board. *This is the first shippable version.*
3. **Beginner polish + pre-draft**: plain-language reasons, glossary, cheat sheet, mock draft, results.
4. **Sleeper connect** for NFL.
5. **Premier League** via the FPL adapter.
6. **NBA**: Sleeper identity/connect + whichever ranking source question 1 settles on.
7. **MLS**: after a data source is chosen.

## 6. Decisions on the open questions

1. **Build NFL first** (owner's decision). NFL drafts are next August, so until then NFL is tested against the 2026 season's data and refreshed when 2027 ADP appears. Real NFL users arrive late, so the mock draft and cheat sheet matter early.
2. **NBA and MLS rankings:** ship NFL, then Premier League, then NBA with a curated CSV stopgap, then MLS once a data source is chosen. *(My call.)*
3. **Premier League and MLS:** draft formats only in v1. A "build a squad under budget" mode is a later, separate decision. *(My call.)*
4. **Commercial intent:** assume non-commercial for now, so Sleeper stays the NFL player backbone. Any ads or subscriptions need a Sleeper licence first, and the adapter layer means identity can move to another source. *(My call; owner to correct if the plan is to monetise.)*
5. **Hosting:** Vercel plus a hosted Postgres. *(My call.)*

## 7. Left to the builder
Exact visual design, component structure, the numeric weights in 4.4, ingestion schedules and Prisma migration details, how Beginner-mode reason text is phrased, and the exact FFC/FPL field mapping.
