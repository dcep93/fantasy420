# DraftBoard Year Composite Design

## Goal

Compare each historical pick with the composite ranking available for that same fantasy season, while preserving the board's actual-draft and season-performance context.

## Ranking source

Use the Draft page's existing format-aware composite pipeline with the selected season's ranking sources, player ids, and positions. This produces the same raw, superflex-aware overall composite rank as the Draft page and does not include My score.

Seasons 2021 and 2022 have no checked-in ranking-source files, so their composite ADP is unavailable and displays as an em dash. Never substitute the current year's rankings.

## Display

Render each pick summary as:

`pick / composite ADP) positional draft rank/positional performance rank`

For example, a player taken twentieth, ranked fourteenth by that year's composite, drafted as the eighth wide receiver, and finishing as the thirty-third wide receiver displays `20 / 14) WR8/WR33`.

Missing composite or performance ranks display as `—`. An empty selected-year draft renders a short empty-state message rather than trying to sort empty team columns; this prevents the current 2026 crash.

## Verification

Add pure coverage for year-specific composite lookup, unavailable early-season rankings, pick formatting, missing ranks, and the empty draft. Add component coverage that switches historical years without borrowing another season's composite. Run the affected suite and production build before publishing.
