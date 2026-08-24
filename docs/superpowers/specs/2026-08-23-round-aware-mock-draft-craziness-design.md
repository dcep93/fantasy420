# Round-Aware Mock-Draft Craziness

## Goal

Keep default mock-draft choices disciplined in early rounds while allowing the same craziness setting to produce progressively larger rank differences later in the draft. No round will impose a hard reach limit.

## Historical Model

The current calibration fits one Gumbel temperature across all fourteen rounds. That pooled temperature is dominated by late-round reaches: the 2024–2025 first-round sample has a maximum available-player rank of nine, while later rounds contain ranks as deep as ninety-nine. Applying the pooled temperature to round one therefore produces unsupported early reaches such as rank forty-one.

The replacement model will jointly fit:

- a round-one base temperature;
- a nonnegative round-growth exponent;
- the position-saturation penalty; and
- the nonnegative same-position bye penalty.

The runtime temperature will be:

`baseTemperature * round^roundGrowth * sqrt(craziness)`

This smooth power curve uses all historical observations without fitting fourteen noisy per-round parameters. A nonnegative growth constraint guarantees that equal craziness never narrows the distribution in later rounds. The Gumbel choice process remains unbounded, so every eligible player retains nonzero selection probability.

## Runtime Behavior

The simulator will calculate the current round from the chronological pick index and apply the fitted round-aware temperature when scoring opponent choices. Position and bye settings retain their existing meanings and are refit jointly with the new temperature curve. Seeded replay remains deterministic.

At craziness `1`, each round represents the fitted historical baseline for that stage of the draft rather than a single pooled spread. Values below or above one continue to narrow or widen every round through the existing square-root scaling.

## Reporting and Tests

The calibration report will record the base temperature, round-growth exponent, likelihood, and expected-versus-actual available-player rank by round. Tests will verify:

- fitted constants agree with the deterministic calibration;
- default first-round behavior is substantially tighter than the pooled model;
- the same craziness value produces a wider distribution in late rounds;
- no candidate window or hard reach ceiling is introduced;
- seeded drafts remain deterministic; and
- the focused suites, complete frontend suite, calibration command, and production build pass.

