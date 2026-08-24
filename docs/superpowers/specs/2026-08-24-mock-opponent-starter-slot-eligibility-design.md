# Mock Opponent Starter-Slot Eligibility Design

## Goal

Prevent mock opponents from drafting a bench player while any non-TE starting roster slot remains empty. An empty dedicated TE slot is the only exception.

## Selection rule

Before each opponent pick, compute the maximum number of legal starter slots that the opponent's current roster can fill. Account for dedicated QB, RB, WR, TE, and DST slots as well as FLEX and SUPERFLEX eligibility.

When at least one unfilled starter slot is not a dedicated TE slot, restrict the probabilistic candidate pool to players whose addition increases the maximum filled-starter count. This is an eligibility rule, not a score coefficient: overall ranking, position risk, bye risk, craziness, Gumbel randomness, and seeded determinism continue to choose among eligible candidates.

An unfilled dedicated TE slot does not trigger the restriction. Therefore a manager may deliberately postpone TE and draft bench depth, matching the league's 2024-2025 history. Once every non-TE starter slot is filled, normal bench drafting resumes even if TE remains empty.

The rule applies only to automatically simulated opponent selections, including replay after a historical nudge. User picks and direct historical nudge choices remain unrestricted except for their existing eligibility and availability rules.

## Lineup feasibility

Determine starter capacity from the configured roster rather than fixed default counts. A player can occupy these slots:

- QB: QB or SUPERFLEX;
- RB: RB, FLEX, or SUPERFLEX;
- WR: WR, FLEX, or SUPERFLEX;
- TE: TE, FLEX, or SUPERFLEX;
- DST: DST;
- K remains ineligible under the existing mock-draft rule.

Because FLEX and SUPERFLEX assignments can be rearranged, eligibility must compare optimal legal lineup assignments before and after the candidate rather than comparing raw position counts.

## Failure behavior

With a valid ranking and normal player pool, an open non-TE slot has a compatible candidate. If no available candidate can increase the filled-starter count, the opponent simulation stops through its existing no-pick path rather than violating the rule.

## Verification

Automated tests will cover dedicated RB, WR, QB, and DST vacancies; flexible-slot reassignment; the dedicated-TE exception; normal bench selection after non-TE starters are filled; seeded opponent replay; and historical-nudge replay. The full frontend test suite, historical calibration command, and production build must continue to pass.
