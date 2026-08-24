# Wrapped Tab Clarity Design

## Goal

Make several Wrapped views easier to interpret without changing their layout or underlying league data. Remove the obsolete late-season ManagerPlot series, expose a meaningful per-game number in PlayerStats, explain ManagerTrend and StdDev in place, and verify whether ChosenWrong's counterfactual is sound.

## ManagerPlot

Remove `pointsForStartingW9` from the intermediate calculations and rendered chart collection. The remaining charts are FantasyCalc history when present, cumulative points for, and cumulative points against.

## PlayerStats

Each displayed player-season will include:

- `pointsPerGame`, rounded to two decimal places.
- `gamesPlayed`, so the denominator is visible rather than implicit.

A game is any non-zero weekly score. Both `null` and zero values are excluded because the historical source frequently records injured, inactive, or otherwise unused players as zero rather than `null`. Negative scores still count as appearances. The existing per-game position ranking will use the same denominator so the displayed metric and rank remain consistent.

The calculation will be a small exported pure helper with focused tests for null and zero exclusion, negative-score inclusion, rounding, and a season without qualifying games.

## ChosenWrong Review

ChosenWrong identifies the lower-scoring team in each matchup, builds that team's highest-scoring legal lineup from the roster, and includes the matchup only when that ideal lineup would have exceeded the opponent's actual score. It then shows which bench players would replace which starters.

Under the approved assumption that every manager fills every starting slot, its inferred lineup shape is correct for the league's historical nine-, ten-, and eleven-starter formats. Its comparison against the opponent's actual lineup is the appropriate counterfactual for “chosen wrong.” No implementation change is needed. Ties have not occurred in the archived matchup data, and normal fantasy scores are already stored at display precision.

## Explanatory Copy

ManagerTrend will end with approximately 100 words explaining:

- The started-score line and weekly league median.
- The league-high and league-low reference lines.
- Win/loss point markers and tooltip details.
- The beat-median count.
- The normalized boom/bust score and what it does not measure.

StdDev will begin with approximately 50 words explaining that positive cutoff rows cover projections above the threshold, negative cutoff rows cover projections below the cutoff's absolute value, `diff` is actual minus projected points, `mean` measures bias, `stddev` measures error spread, and `count` is sample size.

## Verification

- Add unit coverage for the PlayerStats per-game helper.
- Confirm `pointsForStartingW9` no longer appears in source.
- Run the complete Vitest suite.
- Run the TypeScript and Vite production build.
- Review the final diff for unrelated changes.
