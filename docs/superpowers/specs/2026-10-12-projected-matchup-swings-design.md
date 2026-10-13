# Projected matchup finishes and meaningful spice swings

The user requested both changes after reviewing the projection formula and
swing-based ranking approach, with “fix both” on 2026-10-12.

## Projection model

For each starter use the roster's week-specific projection, not the generic
player projection. Projected finish is estimated points earned plus the weekly
projection multiplied by the remaining fraction of that player's estimated game
window. Before kickoff it equals the weekly projection; after game completion it
equals the actual final total. Use the existing three-hour/game-clock model,
including its estimated overtime duration. Retain actual points separately.

Keep final-score allocation over matching plays (or all plays when unmatched).
When no usable plays exist, spread the final total uniformly over the game window
instead of inventing an end-of-game scoring cliff. Include kickoff/end and scoring
events in the timeline, with a point immediately before each scoring event so
linear projected decay and scoring jumps are both represented. Include the final
NFL slot's boundaries to distinguish earlier swings from late changes.

Missing/nonfinite weekly projections exclude a matchup from projection rankings;
do not substitute actual totals or an unrelated player projection. Stored zero
projections remain zero. Explain that older fetches can encode unavailable
projections as zero. This remains a retrospective approximation rather than a
record of live ESPN projections, because scoring uses final totals and projections
are not timestamped throughout the week.

## Ranking

Calculate differential using projected finishes. Track directional peaks and
troughs with a 5-point reversal threshold. Small intermediate reversals do not
split a larger swing. Include the final unfinished directional swing if at least
5 points. Sum the three largest swing magnitudes as the primary score. This counts
large movements in either direction even when the same team remains favored.

Add 2 spice per projected-leader change in the week's final NFL kickoff slot,
capped at 10 bonus points. The slot starts at the latest kickoff in the full
weekly schedule and lasts through its estimated completion; it may be Monday,
Tuesday, or Sunday and is distinct from the chart's Sunday final slot. Initial
lead acquisition is not a flip; ties preserve the preceding leader. Round
differentials to cents to avoid floating-point tie changes. Interpolate crossing
times on continuous segments, treating immediate scoring jumps as event-time
crossings. Earlier tiny flips contribute nothing.

## Presentation and verification

Retain the four chunks and actual final score on each card. Plot projected finish
differential and label it explicitly. The tooltip shows local time, both estimated
current scores, both projected finishes, and projected winning margin. The card
shows the three swing amounts, their total, actual final-slot flip count, capped
bonus, total spice, and last final-slot flip time. Explain formula and limitations.

Tests cover pregame/midgame/final projected totals, different kickoff times,
negative scores/overtime, missing projections/plays, early versus late wiggles,
large movements without a lead change, reversal filtering, bonus cap, ties,
crossing-time boundaries, chunk continuity, and rendered formula copy. Run focused
tests, TypeScript/build to a temporary output, and inspect browser rendering and
tooltips. Commit and push task-owned changes on main, preserving untracked dist.

Self-review: rejects counting every scoring movement, preserves all four approved
chunks, distinguishes the week's final slot from Sunday night, and explicitly
handles missing projections and approximate historical data.

## Verification completed

On 2026-10-13, all 26 focused ranking, reconstruction, chunking, page and chart
tooltip tests pass. Used Vitest's fork pool after the installed Node 25 runtime
crashed during worker-thread teardown; the fork-pool run exits successfully.
TypeScript checking and the production build pass. Browser verification on the
2025 season confirms changed rankings, the precise swing breakdown, full weekly
projections before kickoff, separate earned/projected tooltip values, and the
four chunks. Narrow-layout label bounds do not overlap or overflow the viewport.
The existing untracked dist directory was preserved.
