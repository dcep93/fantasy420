# Mock Draft Appetite and Reach Control Design

## Goal

Keep mock-manager choices probabilistic while making extreme early reaches substantially rarer, expose the raw composite rank behind every drafted player, and let mock drafts express a league-wide preference for each major fantasy position.

The triggering draft selected composite-rank 14 Jalen Hurts first overall and composite-rank 25 Trevor Lawrence eleventh overall. The current linear rank cost plus unbounded Gumbel noise gave those players approximately 14 and 18 ranks of random benefit. Lowering all randomness would also suppress realistic choices between nearby players, while a reach cap would assign some eligible players zero probability.

## Convex overall-rank cost

Continue using seeded Gumbel-max selection so every eligible player retains a continuous, nonzero selection probability. Replace the linear overall-rank cost with a convex cost based on the player's distance from the best eligible player's original composite rank at that pick:

`rankCost = (overallRank - bestEligibleOverallRank + 1) ^ rankExponent`

An exponent above one leaves close choices relatively flexible while penalizing large original-rank gaps increasingly strongly. It does not use the player's ordinal position in the remaining list. Refit the exponent together with the existing position penalty, base temperature, and round growth against 2024 and 2025 league history, with calibration reporting and tests covering reach behavior. Craziness continues to scale temperature, so higher values still broaden every choice without adding a branch or hard cutoff.

## Position appetites

Add QB, RB, WR, and TE appetite numbers to mock-draft settings. Each defaults to `1` and applies to every computer manager. For an eligible player, incorporate appetite into the deterministic score as:

`adjustedCost = rankCost + rosterCosts - temperature * ln(positionAppetite)`

Under Gumbel-max selection this multiplies that position's choice weight directly: `2` doubles its odds relative to an otherwise identical candidate, while `0.5` halves them. Appetite `1` is exactly neutral. Appetites must be positive finite values and use the same practical input normalization limits as the existing risk controls. Positions outside QB/RB/WR/TE remain neutral.

Saved-draft hashes will include the four appetites. Older hashes that omit them load with all four values set to `1`; their picks remain readable and editable.

## Composite-rank display

Add the player's one-based rank in the original raw composite order to each draft-board pick. Render `composite #N` directly beneath the existing round/overall pick label. This value is computed from the mock draft's raw composite ranking and never includes My score.

Keep the rank between the arrows unchanged: it remains the player's pick-time rank among available players so the better/worse history controls retain their current meaning.

## Verification

Simulator tests will cover convex original-rank gaps, exact appetite weight behavior, neutral defaults, deterministic seeded replay, and nonzero access to deep players. Hash tests will cover appetite round trips and migration of old hashes. View and component tests will verify raw composite ranks and placement beneath pick labels. Historical calibration will fit and report the new exponent, and simulation checks will ensure baseline craziness no longer produces first-round reach tails at the current rate while preserving nearby-player variation. The full frontend test suite, calibration command, and production build must pass.
