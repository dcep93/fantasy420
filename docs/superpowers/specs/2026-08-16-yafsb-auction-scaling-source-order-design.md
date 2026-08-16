# YAFSB Auction Scaling and Draft Source Order Design

## Goal

Represent YAFSB auction values as dollars for a $200 budget and make the 2026 draft source tabs render in the requested domain order.

## Data transformation

Multiply every value in `yafsb_10_ppr_super_auction` by two. The source currently stores each player's percentage of a $100 baseline as a negative number; doubling converts it to the equivalent dollar value for a $200 budget while retaining the app's convention that more valuable auction players have more-negative values.

The conversion belongs in `2026.json`, not in rendering code. This keeps every auction source in directly comparable stored units and avoids source-specific behavior in the composite calculation.

## Source order

Reorder the outer keys of `2026.json` so insertion order—and therefore the UI order—is:

1. `espn_10_ppr_super_auction`
2. `draftsharks_ppr_super_auction`
3. `tapthatdraft_10_ppr_super_auction`
4. `yafsb_10_ppr_super_auction`
5. The remaining sources in their existing relative order: FantasyPros, RotoBaller, Sports Illustrated, Harris Football, and Reddit
6. `rotoworld`

No ranking rows or values outside YAFSB will change.

## Validation

The 2026 ranking test will assert the exact source order and representative YAFSB values after scaling, in addition to its existing source-size and auction-sign checks. The full test suite and production build must pass before the changes are committed and pushed to `origin/main`.

