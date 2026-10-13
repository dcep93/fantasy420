# Matchup probability chart correction

The user reported a flat Sunday trace for Breece Lightning vs One Big Beautiful Bell (2026, Week 1) and requested fantasy matchup win probability using the Multisport model.

## Evidence and correction

Week 1 includes a Wednesday September 9 opener. The chunk classifier previously put every Monday/Tuesday/Wednesday game in post Sunday. This gave that chunk the earliest kickoff of the whole week, misassigned Sunday points, and clipped the Sunday-night window to a negative duration. The underlying Sunday projected differential ranged from approximately -10.46 to +19.40; its calculation was present but its chart placement was wrong.

When Sunday games exist, classify other games chronologically relative to that Sunday. This correctly places both early Wednesday openers and games postponed to the following Wednesday. Keep the established missing-Sunday fallback.

## Probability display

Reuse Fantasy420's existing Scoreboard/headToHeadProbability function, verified identical to Multisport420's scoreboard model. Feed each reconstructed point's earned scores and projected finishes into that model. The chart uses a fixed 0–100% first-team win-probability axis with a 50% midpoint; tooltips display both probabilities and retain earned/projected points. Explain shrinking uncertainty from projected points remaining, reconstruction limitations, and the model's final-tie display convention. Keep competitive point-margin spice ranking and capped final-slot favorite-change bonuses.

## Verification

60 targeted tests passed across timeline/chunking, probability chart, and the existing scoreboard probability model. New regressions cover the Wednesday opener, the following Wednesday, Sunday scoring in its proper chart interval, monotonic x positions, shrinking uncertainty, and completed wins/losses/ties. TypeScript and production build passed. Browser verification of the reported matchup shows the Sunday probability reversal in the Sunday pre-final-slot section, correct percentage ticks and both probabilities in the tooltip. Existing untracked dist remains untouched.
