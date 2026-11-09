# Cascading playoff tiebreaks

Approved with `yesi` on November 8, 2026. Rank teams by season wins, resolving each tied win group one seed at a time. For the remaining teams, use head-to-head record when every pair has played the same positive number of games; otherwise use points for. Retain points for as the fallback for equal head-to-head records and team name as the final deterministic fallback. Remove only the selected team, then restart all eligibility and record calculations using the remaining teams. A singleton needs no tiebreak.

In the reported example, Monday Night Ducking earns the next seed on points for because the three-team schedule is uneven. Malik Makai Bells and Buckyball then restart at head-to-head, regardless of their relative points totals. A split or absent head-to-head record falls back to points for.

Keep this change inside PlayoffMachine's standings calculation and existing component tests. The explanations must describe each round's remaining teams, selected team, and deciding criterion, so a three-team points-for decision is followed by the two-team head-to-head explanation. Keep the existing team colors and name fallback, simulated results, completed-week boundary, and manual points controls.

Add component regressions for uneven three-team schedules, recalculation after a head-to-head winner, split and absent head-to-head records, and points adjustments. Run the PlayoffMachine and playoffStrength tests and TypeScript checking. Preserve unrelated dist output. Commit task-owned files and push main.

Self-review: scope is limited to ranking and explanations; selection always removes one team, guaranteeing termination. Existing scoring and head-to-head tie accounting are outside this change.
