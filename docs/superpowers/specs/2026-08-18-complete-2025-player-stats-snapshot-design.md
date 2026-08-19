# Complete 2025 Player Stats Snapshot

## Problem

`PlayerStats/data.json` is the historical player-stat snapshot used by the
PlayerStats tab and its ranking consumers. Its 2025 entries were captured in
October 2025 and contain only the first part of the season. The UI only overlays
the season identified by `currentYear`, which is now 2026, so the partial 2025
entries are displayed unchanged even though `Wrapped/dataJson/2025.json`
contains the complete season.

## Chosen approach

Treat `PlayerStats/data.json` as the canonical completed-season history through
2025. Refresh its 2025 season entries from the complete bundled 2025 wrapped
data while preserving every pre-2025 entry exactly.

Two alternatives were considered:

1. Overlay every bundled season in the React component. This would hide stale
   snapshots at runtime, but it would leave shared consumers such as position
   rankings initialized from stale data and would duplicate derivation work in
   the browser.
2. Fetch and regenerate the entire historical dataset from the external
   nflquery application. This could produce a clean full export, but it adds an
   unnecessary external dependency and risks changing unrelated history.

Updating only the completed 2025 slice is the smallest deterministic change
and matches the existing snapshot-plus-current-season architecture.

## Data transformation

Add a repository script that reads:

- `Wrapped/tabs/PlayerStats/data.json` as the historical snapshot.
- `Wrapped/dataJson/2025.json` as the authoritative 2025 season.

For each 2025 NFL player with a non-zero season total:

1. Build an 18-element weekly score array for weeks 1 through 18, using `null`
   for absent weeks and preserving explicit zero scores.
2. Use the wrapped player's position and season total.
3. Match an existing snapshot player by exact name. Replace that player's 2025
   entry, or append a new player record when no historical record exists.
4. Re-sort a player's seasons chronologically and recompute the player's career
   total from all season totals.

Remove stale 2025 entries that are not present among the authoritative 2025
scorers. Preserve the existing top-level player ordering where possible, then
append genuinely new 2025 players in a deterministic name order. The generated
JSON remains formatted consistently with the current file.

## Validation and error handling

The generator fails without writing when the source year is not 2025, the
source does not contain all 18 scoring periods, player names are duplicated in
either input, or a score/total is not numeric. It writes through a temporary
file and replaces the snapshot only after all validation succeeds.

Automated tests cover replacement of a partial 2025 entry, preservation of
explicit zeroes and missing-week `null` values, insertion of a new player,
removal of a stale 2025-only entry, preservation of older seasons, and career
total recomputation. A repository-level verification checks known complete
totals such as Aaron Rodgers at 227.08 and confirms that every generated 2025
score array has 18 weeks.

## UI impact

No presentation or interaction changes are required. PlayerStats, position
rankings, career totals, and other consumers of `playerStatsData` will receive
the complete 2025 values from the refreshed snapshot. The existing 2026 live
overlay remains responsible for the active season.

