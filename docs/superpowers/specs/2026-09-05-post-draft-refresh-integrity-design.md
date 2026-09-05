# Post-Draft Refresh Integrity Design

## Goal

Refresh the 2026 league snapshot immediately after the draft while preserving
only valid 2026 season statistics and keeping the draft-ranking integrity check
meaningful.

## Observed data

The hosted refresh returned all 10 fantasy teams, 160 unique draft picks, 160
week-0 roster entries, the complete schedule, and a new FantasyCalc valuation
snapshot. ESPN still reports `latestScoringPeriod` as `0`, which is correct
before the first official game.

Two data-shape issues require narrowly scoped handling:

1. ESPN's defense player cards expose prior-season weekly defense totals before
   the new season begins. Those values must not be copied into unplayed 2026
   games.
2. Ranking sources use full defense names such as `Houston Texans`, while ESPN
   uses names such as `Texans D/ST`. The integrity test currently treats those
   equivalent defenses as missing players.

## Design

### Official-game defense guard

When assembling `nflGamesByScoringPeriod`, apply defense `yardsAllowed` and
`pointsAllowed` only when the corresponding pro game has `statsOfficial` set.
For scheduled but unplayed games, retain the opponent and schedule entry while
setting both statistics to zero. Play-by-play fields already fetch only for
official games and retain their existing behavior.

This removes stale preseason values from generated snapshots and continues to
populate real statistics after each game becomes official.

### Defense-name normalization

Extend the draft-ranking integrity test's local name normalizer so known NFL
team forms normalize to their ESPN defense nickname. It will treat forms such
as `Houston Texans`, `Houston`, and `Texans D/ST` as the same defense without
lowering the 85% matching threshold. Ordinary player-name normalization remains
unchanged.

### Snapshot update

Commit the validated hosted refresh to `Wrapped/dataJson/2026.json`. The final
snapshot must contain:

- 10 fantasy teams;
- 160 unique draft picks and 160 current roster entries;
- 16 players on every team;
- no drafted player missing from `nflPlayers`;
- matching draft and week-0 roster membership;
- scoring period `0` and no nonzero unplayed-game defense totals;
- a new nonempty FantasyCalc history entry.

## Verification

- Add a focused unit test showing that an unofficial game ignores defense stats
  supplied by ESPN.
- Keep the existing schedule symmetry and ranking-source thresholds.
- Verify all defense naming forms used by current ranking sources normalize to
  the ESPN names.
- Run the full Vitest suite and production build.
- Inspect the staged diff, commit, push `main`, and confirm the deployment job.

## Non-goals

- Do not change mock-draft behavior, rankings, scoring, or the Strength of
  Season calculation.
- Do not lower validation thresholds or preserve players that ESPN no longer
  returns merely to satisfy a test.
- Do not use localhost or change the extension protocol.
