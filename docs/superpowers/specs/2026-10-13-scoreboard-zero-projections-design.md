# Scoreboard missing forecasts and tied lineups

The user requests treating Tyreek Hill's absent Week 6 forecast as zero and correcting Nice We Won's lineup mismatch. Live ESPN shows 136.4 total while Scoreboard shows 136.39, which agrees after rounding. The optimizer swaps active zero-projection starter Tyson Bagent for zero-projection bye player Aaron Jones solely due its positional/ID tie ordering.

Use zero when a valid stats array has no forecast row for the requested season/week. Preserve explicit finite zero and negative forecasts. Missing/malformed stats arrays, conflicting rows and nonfinite totals remain unavailable; historical projection validation is untouched. This fixes the opposing Breece Lightning roster that currently withholds odds for both sides of the Monday Night Fucking matchup.

After maximizing filled slots and total projection, prefer keeping more existing starters before the current dedicated-position and player-ID tie breaks. This retains Bagent without reducing optimal projected points; actual projection improvements still replace starters. Locked starters, locked bench exclusions and IR restrictions stay as they are. No ESPN roster mutations. Clarify the zero-default and tie behavior in the Live Scoreboard copy.

Tests cover missing weekly forecasts versus malformed stats, valid zero, equal-score starter retention versus true improvements, order independence with the same starting membership, locked/IR constraints and live odds availability. Run Scoreboard suite and production build; verify Week 6 live in Chrome using the local app's existing authenticated extension, inspect both affected matchups, capture screenshot, commit and push main. Preserve untracked dist output.
