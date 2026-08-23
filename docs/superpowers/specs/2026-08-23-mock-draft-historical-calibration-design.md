# Historical Mock-Draft Coefficient Calibration

## Goal

Calibrate mock-draft position risk, bye-week risk, and craziness against the actual 2024 and 2025 league drafts so an input value of `1` represents historically typical behavior.

## Historical Sample

The calibration will reconstruct each season's composite rankings from that season's checked-in ranking sources and player data. It will replay the first fourteen chronological rounds of the actual league draft, matching the current mock-draft horizon. Kicker selections will remain part of chronological history but will not become calibration observations because kickers are ineligible under current mock-draft rules.

This produces 139 eligible observations from 2024 and 137 from 2025. Every observed pick, including an excluded kicker or a player missing from the composite board, will still update availability and the selecting team's prior roster before the next pick.

## Choice Model

For each eligible observed pick, the calibration will rebuild the candidates available at that moment and calculate the same three features used by the simulator:

- available-player rank index;
- same-position roster saturation; and
- same-position bye-week conflicts.

The simulator's Gumbel selection is equivalent to a multinomial-logit choice model. The calibration will minimize the negative log likelihood of the observed choices under that model. Rank keeps a fixed raw coefficient of one, which identifies the fitted Gumbel temperature. The other fitted weights become the position-saturation and bye-conflict coefficients.

The runtime formula remains:

`rankIndex + positionCoefficient * positionRisk * saturation + byeCoefficient * byeRisk * byeMatches - temperature * sqrt(craziness) * gumbel`

Thus `positionRisk = 1`, `byeRisk = 1`, and `craziness = 1` reproduce the fitted historical baseline. Values near zero and larger values retain their existing interpretation.

## Reproducibility and Reporting

A checked-in calibration script will rebuild observations, fit the nonnegative coefficients deterministically, and print:

- source and observation coverage;
- fitted coefficients;
- current-versus-fitted negative log likelihood; and
- per-year actual-versus-model expected rank, saturation, and bye-conflict means.

The final fitted values and coverage summary will be recorded in a checked-in report. The runtime will use named exported constants instead of inline magic numbers.

## Failure Handling

The calibration will fail when either season is unavailable, the historical pick sequence is incomplete, an observed eligible player cannot be mapped to player data, or the optimizer does not converge. Missing composite ranks will be reported and excluded from likelihood observations while the underlying actual selection still updates replay state.

## Testing

Automated coverage will verify the historical observation counts, deterministic fitting, coefficient/report agreement, and the runtime's use of the fitted constants. Existing simulator behavior tests, the full frontend suite, the calibration command, and the production build will all run after implementation.
