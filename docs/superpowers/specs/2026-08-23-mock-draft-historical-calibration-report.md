# Historical Mock-Draft Calibration Report

## Result

The maximum-likelihood pooled baseline for slider inputs of `1` is:

| Coefficient | Legacy | Fitted |
| --- | ---: | ---: |
| Position saturation penalty | 16 | 10.849574 |
| Same-position bye penalty | 9 | 0 |
| Gumbel temperature | 3.5 | 8.737719 |

The bye coefficient reached the nonnegative boundary. The optimizer's raw result was `3.09e-13`, which is recorded as zero in runtime code. The historical drafts do not support avoiding same-position bye conflicts; they contain slightly more such conflicts than a zero-penalty model expects. A positive penalty would therefore make the observed drafts less likely.

## Data Coverage

| Season | Raw sources | Usable normalized sources | First-14-round picks | Eligible non-K picks | Likelihood observations | Missing composite ranks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 11 | 9 | 140 | 139 | 139 | 0 |
| 2025 | 9 | 8 | 140 | 137 | 137 | 0 |
| Total | 20 | 17 | 280 | 276 | 276 | 0 |

The replay uses each season's format-aware composite ranking. Actual kicker selections remain in chronological and team history but are excluded as choice observations under the current no-kicker mock-draft rule.

## Likelihood

| Model | Total negative log likelihood | Mean per pick | Effective choices per pick |
| --- | ---: | ---: | ---: |
| Legacy `16 / 9 / 3.5` | 1187.886663 | 4.303937 | 73.9905 |
| Fitted `10.849574 / 0 / 8.737719` | 877.755239 | 3.180273 | 24.0533 |

Lower negative log likelihood is better. The fitted baseline improves total negative log likelihood by `310.131423`, or approximately `26.1%`.

## Expected-vs-Actual Diagnostics

The pooled fit matches the observed mean available-player rank and position saturation. This moment matching is the concrete meaning of the historical drafts being expected under the model.

| Sample | Actual rank index | Expected rank index | Actual saturation | Expected saturation | Actual bye conflicts | Expected bye conflicts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pooled | 9.036232 | 9.036232 | 0.370833 | 0.370833 | 0.152174 | 0.132934 |
| 2024 | 10.410072 | 9.450966 | 0.389568 | 0.410594 | 0.194245 | 0.142869 |
| 2025 | 7.642336 | 8.615444 | 0.351825 | 0.330493 | 0.109489 | 0.122853 |

The pooled coefficients sit between the two seasons: 2024 was more adventurous than the pooled expectation, while 2025 stayed closer to the top of the composite board. The same pooled baseline is used for both rather than overfitting one season.

## Reproduction

From `app/fantasy420`, run:

```sh
npm run calibrate:mock-draft
```

The command rebuilds all observations from checked-in 2024 and 2025 data, fits the coefficients deterministically, and prints the complete machine-readable report.
