# ManagerPlot win graphs

Approved with `yesi` on 2026-10-03.

## User-visible behavior

Add two charts to ManagerPlot for the selected season: **Total wins by week**
and **Wins above/below league average**. Reuse the existing team colors and
hover highlighting. Show week numbers and visible win axes, with whole-number
ticks for total wins and a zero reference line for the relative chart.
Tooltips show manager names, integer total wins, and signed differences from
the league average where relevant. Existing points and FantasyCalc graphs stay
available.

## Data and boundaries

Derive cumulative wins from starting-player scores and recorded head-to-head
matchups. A team earns one win only if both rosters exist and its score is
strictly higher than its opponent's. Ties and byes earn no wins. Use numeric
week ordering with a zero-win Week 0 baseline and consistent weeks for every
manager. Honor `latestScoringPeriod`, including zero, to exclude unfinished
weeks. For legacy seasons without that field, use recorded roster weeks.
Weeks without matchup records keep cumulative wins unchanged; historical
snapshots only record matchups through Week 13. Do not infer playoff results.

Keep win calculation in a small pure helper so its boundaries can be verified
without rendering charts. Safely handle missing players, missing opponent
rosters, and empty seasons. Calculate the league mean over all managers.
Use the same corrected totals in existing points-chart tooltip win counts.

## Verification

Test cumulative outcomes, ties, byes, missing rosters, nonconsecutive weeks,
unfinished weeks, a zero completion cutoff, legacy seasons, and empty data.
Verify both chart series and tooltip values through component tests. Run the
focused tests and production build, then inspect both charts in the browser.
Commit task-owned changes on main and push according to workspace policy.

## Alternatives and scope

A single cumulative chart would be smaller but would not match the existing
league-relative comparisons. A single relative chart would hide absolute
records. The approved pair makes both readings available. No data refresh,
new dependencies, or unrelated chart redesign is needed.
