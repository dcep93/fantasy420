# Wrapped chart clarity

Approved by the user with `yesi` on 2026-10-06.

## PointsAgainst

Keep the ranking scatter plot and position selector. Explicitly draw bright,
outlined dots against the dark chart canvas. Place abbreviated NFL team labels
beside their actual points, give the axes descriptive titles, and show team,
average points allowed per game, total, and games counted in tooltips. Preserve
the weekly player breakdown. Do not produce NaN averages when no weeks exist.

## BestByPosition

Plot a ranked horizontal bar chart for each real roster position (QB, RB, WR,
TE, K, DST). Each bar represents a fantasy manager's total starter points at
that position through the selected season's latest scoring period. Sort high
to low, show manager names and numeric totals, and use a consistent manager
color across positions. Retain the underlying player/week breakdown in
expandable content that works without hovering. Exclude preseason and future
rosters; safely skip missing players. Handle no scored starts explicitly.

## SpiciestMatchups

Replace the heuristic probability display with an estimated score-lead chart.
Positive values mean the first named team leads; negative values mean the
second named team leads; zero is tied. Use a real, linear date/time axis and
tooltips containing time, both estimated scores, and the lead. Show team names
and direction above each chart. Remove dense, ambiguous player-impact labels.

Explain that final player totals are distributed over approximate NFL game
windows: the timeline is a reconstruction, not recorded live scoring or win
odds. Preserve this approximation rather than claiming play-level accuracy.
Show actual recorded starter totals as the final score and ensure the
reconstructed timeline ends at those totals, including negative totals.

Rank completed-week matchups by lead changes plus 0.5 for each change in the
last 45 estimated minutes of that matchup. Display the formula and its actual
inputs per card. A lead change requires switching from one team to the other;
the initial move out of a tie does not count, and passing through a tie counts
only once when the opposite team takes the lead. Show the latest change as a
weekday/time, not minutes since the first kickoff. Handle loading, error, no
available matchups, and stale asynchronous responses separately.

## Implementation and verification

Use existing React/Recharts and night-theme conventions, with responsive
containers and readable layouts on narrow screens. Keep the points-lead chart
in a focused component and extract pure ranking logic only as useful for
meaningful tests. Test ties, repeated leads, late-change weighting, week limits,
and reconstructed final totals. Run the affected tests and production build;
inspect all three tabs in a browser, including narrow-screen presentation and
tooltips. Commit task-owned changes and push main, preserving unrelated work.

## Verification completed

21 focused tests and the production build pass. Browser checks cover the three
tabs, tooltips and expandable details, current and historical matchup seasons,
and narrow/wide layouts. The matchup tooltip announces keyboard updates with
a polite live region. Independent code review also checked all 340 matchups
across saved 2021–2026 data for finite scores, chronological timestamps, and
final-score agreement.
