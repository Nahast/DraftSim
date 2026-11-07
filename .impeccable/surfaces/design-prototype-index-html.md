---
version: 1
slug: "design-prototype-index-html"
primary_target: "design/prototype/index.html"
related_targets: []
---

# Surface brief: DraftSim prototype (design/prototype/index.html)

Scope: Operate mode. Mobile-first clickable HTML/CSS/JS prototype (throwaway reference for the Next.js build) of: home, onboarding wizard, draft room, draft board, player detail, results. Phone first (390px), usable at desktop width. Code-led build. Sample data labelled as such.

Audience/job: anyone mid-draft or planning, beginner to veteran; pick the best player, understand why, log other teams' picks fast. Constraints: PRODUCT.md; the spec in docs/superpowers/specs/2026-10-27-draftsim-design.md; logo in design/logo/. No fabricated commercial claims.

Chosen direction: The Handicapper's Sheet (assigned, user confirmed). Raised lines: visible construction grid on the Draft Board (from Crouwel); teal only for "your pick" and the primary action (from monochrome); taken/needed/held states also carried by hatch and rule weight (from exposure record).

## Direction contract

THESIS: A pick is a bet on who will still be there, so the screen is a handicapper's sheet with a live tote; it refuses the dark card-list sports-app draft room.
OWN-WORLD: Cool pale ground #EEF4F2, ink #0B1F2A, teal #14B8C6 only for your pick and the primary action, tote panels #0A0F14 with amber #FFB400 lit digits, red #D6322E only for gone/taken with hatch. Barlow Condensed tabular agate form lines over Public Sans sentences; hairline rules and a double rule under the status; no cards, no coloured side borders above 1px.
STORY: A beginner sees one top pick with a plain reason and a big button; a veteran reads the ranked form lines and tote percentages; both log picks in one tap and watch the numbers update.
FIRST VIEWPORT: 390x844 draft room: top bar (logo, DraftSim, Beginner chip, settings), double-ruled status line "Round 3 · Pick 27 · YOU'RE ON THE CLOCK", the top pick as a form line with a tote cell, plain reason, full-width teal "Take this player", two alternates, a hatched roster strip with needs, last three picks, bottom tab bar.
FORM: Racing-form handicapping sheet and tote board, assigned index 4 of the grounded list. seed:6ba7983ae9da1d03
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
