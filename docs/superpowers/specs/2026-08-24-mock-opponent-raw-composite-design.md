# Mock Opponents Use the Raw Composite

## Goal

Ensure simulated mock-draft opponents base their choices on the format-aware composite ranking before personal `My score` adjustments. Personal scores should continue to affect the user's displayed composite board without influencing opponent behavior.

## Design

The draft page will retain both forms of the composite produced during ranking calculation:

- the raw format-aware composite, used as the ordered ranking for mock-opponent simulation; and
- the personal-score-adjusted composite, exposed as the existing visible `composite` source.

Opponent simulation will no longer depend on the selected rankings tab. Starting a mock draft, advancing after a user pick, and replaying simulated picks after a historical nudge will all receive the raw-composite order. Existing mock-draft eligibility rules, position and bye penalties, craziness, and seeded determinism remain unchanged.

The visible rankings table, personal-score magnitude inspection, and stored personal scores retain their current behavior. Mock-draft rank labels and nudge comparisons will use the same raw composite supplied to the mock-draft engine so the board describes the baseline that drove opponent decisions.

## Code Boundaries

`Draft/index.tsx` will expose the raw composite alongside the existing rankings result and derive a stable raw-composite player order. Existing pure mock-draft helpers remain unaware of personal scores and continue accepting a single ordered ranking.

## Verification

An integration regression test will start equivalent mock drafts with and without a large personal score and assert that opponents make identical opening selections. It will also verify that the personal score still changes the displayed composite order. Existing focused mock-draft tests, the full frontend test suite, and the production build will run after implementation.
