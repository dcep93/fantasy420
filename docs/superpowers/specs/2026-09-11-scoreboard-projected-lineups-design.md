# Optimized scoreboard projected lineups

Approved by the user with `yesi` on 2026-09-11, including implementation,
verification, commit, and push.

## Scope and behavior

Optimize only league 203836968/team 6 and league 367176096/team 1. Recalculate
on scoreboard fetch, using the team's own current roster and ESPN's weekly
league-scored projections. Do not write lineups to ESPN. Other teams retain
ESPN totals. Probabilities use the corrected projected team total.

Preserve locked starters in their exact slot type, including FLEX/OP, and never
promote a locked bench player. Exclude IR from the candidate pool. Respect the
league's configured starting-slot counts and each player's eligible slots.
Fill the maximum possible number of starting slots, then maximize their combined
projection across all legal assignments. This includes FLEX and QB-eligible OP;
a sequential greedy slot fill is insufficient. Among equal-scoring assignments,
prefer later kickoffs in flexible slots when kickoff data is available, with a
stable deterministic final tie-break. Questionable status alone does not exclude
a player with a valid projection. Preserve valid zero and negative projections.
When kickoff times are absent, equivalent lineups prioritize higher projections
in dedicated slots before OP/FLEX, then use player IDs for deterministic ties.

Use the current scoring period's roster and player projections. Keep locked
players' live/final contributions by applying the optimized unlocked-projection
delta to ESPN's live team projection. Thus actual team points do not change,
and completed players are never reset to their pregame projection. Do not
invent missing projections or lock information: retain the original ESPN total
and report why optimization could not be applied when required data is missing.

## Implementation boundaries

A dedicated pure lineup module reads the ESPN roster/settings fields and solves
the constrained assignment. The scoreboard mapper applies it to the exact
league/team pairs. Log once per successful fetch after the snapshot update,
including league/team/week and all selected starters' names, slots, projections,
and lock status. No render-time logging or additional automatic polling.

Inspect actual ESPN payloads to establish lock and projection fields before
coding assumptions. Reuse the existing extension transport; supplement it only
if the current views lack required data. Keep failures explicit and preserve the
last useful scoreboard behavior.

## Verification

Cover exact targeting, both schedule formats, league-specific positions,
locked starter/FLEX/bench behavior, globally optimal FLEX/OP assignment,
zero/negative/missing projections, no duplicate players, unavailable roster
metadata, live total preservation, and one log per successful coalesced fetch.
Compare against the current two league rosters, run app tests and build, run
extension tests if extension behavior changes, inspect the final diff, then
commit task-owned changes and push main.

## Self-review

The scope, objective priority, lock behavior, projection source, live accounting,
error fallback, and logging location are explicit. No open design checkpoints.
