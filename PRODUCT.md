# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript, Next.js (App Router), Prisma on Postgres, Tailwind CSS with shadcn/ui. TypeScript and Prisma were the owner's choice; the rest was delegated to the builder. See `docs/superpowers/specs/2026-10-27-draftsim-design.md`.

## Users

Anyone doing a fantasy sports draft, from a complete beginner who knows neither the rules nor any players to a veteran who plays every year and wants a quick plan. They are often on a phone, mid-draft with a clock running, or planning ahead of time.

## Product Purpose

Help anyone draft the best possible team for NFL, NBA, Premier League and MLS fantasy leagues. v1 ships NFL first. Success: a beginner finishes a draft with a strong team without knowing the rules; a veteran sets up in under a minute.

## Positioning

A neutral companion that sits beside whatever app the league uses (ESPN, Yahoo, Sleeper, other). It adapts live to the real draft, because other teams' picks are logged by hand or synced from Sleeper, and it explains each recommendation in plain language. It never makes picks inside other apps.

## Operating Context

Used next to another fantasy app during a live draft with a pick clock, or beforehand for planning and mock drafts. Draft formats are snake and linear. No accounts: an unguessable draft link is the key.

## Capabilities and Constraints

Best-pick recommendations computed by the site's own engine from player data and ADP (NFL: Sleeper players, Fantasy Football Calculator ADP). Manual pick entry for every app; Sleeper live sync for NFL/NBA. Beginner and Pro modes. Non-goals for v1: accounts, in-season management, auction/keeper drafts, budget-squad games. Sleeper's API is free for non-commercial use only. Screens: home, onboarding wizard, draft room, draft board, player detail, cheat sheet, mock draft, results, glossary, settings.

## Brand Commitments

Name: DraftSim. Logo: a DS monogram in `design/logo/` (D and S entwined, teal accent `#14B8C6`). Tone: modern and futuristic but sober; no sports clichés.

## Evidence on Hand

No real users, testimonials or metrics exist yet. Do not fabricate any. Player and ADP data come from third-party sources and must show source and last-updated.

## Product Principles

1. The beginner path never requires understanding a setting; the veteran path never slows down for explanation.
2. Every recommendation says why, in plain words.
3. Never show stale or wrong data silently; show source and freshness.
4. Fast on a phone under a ticking clock: one-tap pick logging, always-visible undo.

## Accessibility & Inclusion

Colour is never the only position indicator, tap targets at least 44px, readable contrast, keyboard-usable player search.
