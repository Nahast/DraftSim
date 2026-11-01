# DraftSim

A fantasy draft helper. It tells you who to pick, says why in plain words, and adapts as you log everyone else's picks. NFL first; NBA, Premier League and MLS are planned. Design: `docs/superpowers/specs/2026-10-27-draftsim-design.md`.

## Run it

    cp .env.example .env            # set POSTGRES_PASSWORD, DATABASE_URL, CRON_SECRET
    docker compose up -d            # Postgres 16 on 127.0.0.1:5432 (or point DATABASE_URL at any Postgres)
    npx prisma migrate deploy
    npm run ingest                  # players (Sleeper) and ADP (Fantasy Football Calculator)
    npm run dev                     # http://localhost:3000

`npm run ingest` also runs daily in production through Vercel Cron (`vercel.json`) at `/api/cron/ingest`, which needs `Authorization: Bearer $CRON_SECRET`.

## Tests

    npm test                        # needs a second database: createdb draftsim_test, then set TEST_DATABASE_URL
    DATABASE_URL=<test db url> npx prisma migrate deploy   # once, to create its tables

Tests point `DATABASE_URL` at `TEST_DATABASE_URL`, so they never touch your dev data.

## What works today

Quick setup, draft room (best picks with reasons, log other teams' picks, undo, roster needs, recent picks), draft board, data freshness banner.

## Not built yet

Mock draft, cheat sheet, results, glossary, settings, Sleeper live sync, Premier League, NBA, MLS. The next work is in `docs/superpowers/plans/`.

## Known limits

- The rate limiter keeps counts in each server instance's memory. Use a shared store (Upstash, Vercel KV) before relying on it across instances.
- The player list only includes players that have ADP; a player with no ADP cannot be logged yet.
- Fantasy Football Calculator serves 12-team ADP only, so other league sizes use the 12-team numbers.
- Sleeper's API is free for non-commercial use only.
