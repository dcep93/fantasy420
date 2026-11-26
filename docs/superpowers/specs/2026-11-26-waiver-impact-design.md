# Waiver Impact beta

Approved by `yesi` on 2026-11-26, including the user's addition that quantity must be represented.

## Purpose and UI

Add a season-only **Waiver Impact** module under Beta. Rank managers by estimated starting-lineup waiver points per completed week, counting zero-contribution weeks. Show a compact sortable leaderboard and selectable manager detail with a weekly chart against the league average, plus an accessible week selector and player breakdown. Match the app's dark theme and work on narrow screens.

Metrics: points/week, total waiver points, share of lineup points, best week, top contributing pickup, inferred pickups (acquisition events including bench additions and re-adds), unique pickups started, and waiver-player starts (one per player per week). Add points/start as an efficiency statistic. Sort by points/week, total points, share, best week, pickups, unique starters, starts, or points/start. Ties use manager name then ID for deterministic order. The selected manager remains selected when sorting.

Chart modes: weekly points, waiver-player starts, and new pickups. Counts are visible alongside points in the weekly breakdown. League averages use managers with a recorded roster that week. Excluding K/DST filters all metrics and the lineup-point denominator consistently. Default includes every position. Completed weeks only; no current roster `0` or partial/future weeks.

## Attribution contract

Use existing draft and weekly roster snapshots; no fetcher or source-data changes. This is explicitly an estimate covering waiver claims and free agents together, not a claim to verified transactions.

Build league-wide ownership for the draft baseline and each chronological week. At Week 1, a player absent from every team's complete draft is an inferred pickup. In subsequent weeks, a player absent from every team's complete previous-week roster is an inferred pickup. Carry waiver status forward only while the same manager continuously holds the player. Starting points count only during that manager's inferred waiver stint. Dropping and re-adding after an observed unrostered week is a new pickup even for the original drafter. Transfers directly between managers, including pre-Week-1 transfers from draft owners, have unknown origin and are excluded. Never assume every player not drafted by the current manager is a waiver pickup.

Missing league snapshots prevent inference from absence. A gap in a player's own manager's roster history breaks continuity; do not guess across it. If another manager's roster is missing, a recorded same-manager waiver stint may continue, but new acquisitions cannot be inferred. Duplicate ownership is ambiguous and excluded. A draft baseline is complete only if every team has a nonempty draft. Quantity counts only observable inferred acquisitions, not invisible same-week churn.

Each manager's average uses their recorded completed weeks, including genuine zero weeks. Missing weeks appear as unavailable, not zero, and coverage is disclosed. Missing player scores remain unknown: count observable acquisitions/starts, sum known points, and visibly flag partial scoring. Preserve negative and zero scores. Zero denominators display an em dash rather than infinity or NaN.

## Structure and validation

Pure inference/aggregation lives in `tabs/waiverImpact.ts`; React rendering and controls in `tabs/WaiverImpact.tsx`; scoped styles in `tabs/WaiverImpact.css`. Register the module, friendly label, Beta navigation, and season-only explanation. Unit tests cover attribution, carryover, bench additions, re-adds, ambiguous moves, missing rosters/scores, zero and negative scoring, counts, filtering, ranking, and incomplete-week exclusion. Component tests cover navigation registration, sorting, manager/week selection, chart modes, and position filtering. Run targeted tests, TypeScript/production build to a temporary output directory, then inspect desktop/mobile rendering. Preserve the existing untracked `dist/` directory.

## Scope

No transaction feed, FAAB efficiency, speculative wins added, all-years aggregation, or league-data refresh. Existing main-branch commit/push instructions apply. The written spec and plan have been self-reviewed for counting definitions, attribution ambiguity, denominator consistency, and empty states; no further approval is required.
