# Historical Mock-Draft Calibration Report

## Result

The maximum-likelihood overall-rank, round-aware baseline for slider inputs of `1` is:

| Coefficient | Legacy | Previous pooled fit | Overall-rank round-aware fit |
| --- | ---: | ---: | ---: |
| Position saturation penalty | 16 | 10.849574 | 28.421761 |
| Same-position bye penalty | 9 | 0 | 0 |
| Round-one Gumbel temperature | 3.5 | 8.737719 | 2.254317 |
| Round-growth exponent | 0 | 0 | 0.920315 |

The runtime temperature is `2.254317 * round^0.920315 * sqrt(craziness)`. It grows smoothly from `2.254317` in round one to `25.574892` in round fourteen and never limits the eligible candidate set. The bye coefficient again reached the nonnegative boundary, so runtime records it as zero.

Opponent costs now use each candidate's original index in the complete eligible composite ranking. Removing already-drafted players no longer renumbers the remaining choices. Original rank gaps therefore continue to affect head-to-head selection probability throughout the draft.

## Data Coverage

| Season | Raw sources | Usable normalized sources | First-14-round picks | Eligible non-K picks | Likelihood observations | Missing composite ranks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 11 | 9 | 140 | 139 | 139 | 0 |
| 2025 | 9 | 8 | 140 | 137 | 137 | 0 |
| Total | 20 | 17 | 280 | 276 | 276 | 0 |

The replay uses each season's format-aware composite ranking and the historical roster's required DST capacity of one. That historical capacity remains independent from the current no-DST default. Actual kicker selections remain in chronological and team history but are excluded as choice observations under the current no-kicker mock-draft rule.

## Likelihood

| Model | Total negative log likelihood | Mean per pick | Effective choices per pick |
| --- | ---: | ---: | ---: |
| Legacy `16 / 9 / 3.5 / 0` | 1948.268356 | 7.058943 | 1163.2154 |
| Previous pooled `10.849574 / 0 / 8.737719 / 0` | 1062.454842 | 3.849474 | 46.9684 |
| Overall-rank round-aware `28.421761 / 0 / 2.254317 / 0.920315` | 851.732928 | 3.085989 | 21.8891 |

Lower negative log likelihood is better. The refitted overall-rank model improves total negative log likelihood by `210.721915`, or approximately `19.8%`, over the previous pooled fit under the same overall-rank feature.

## Expected-vs-Actual Diagnostics

The ranking feature and diagnostics below are zero-based overall composite indices, not renumbered positions among available players. The expected mean tracks the historical mean across the full draft while the smooth temperature curve keeps early picks disciplined and permits wider overall-rank gaps later.

| Round | Temperature | Actual overall index | Expected overall index |
| ---: | ---: | ---: | ---: |
| 1 | 2.254317 | 4.950000 | 4.419886 |
| 2 | 4.266359 | 15.500000 | 15.688381 |
| 3 | 6.196077 | 26.550000 | 26.795320 |
| 4 | 8.074206 | 36.150000 | 37.070042 |
| 5 | 9.914882 | 46.000000 | 48.062424 |
| 6 | 11.726253 | 59.550000 | 54.641546 |
| 7 | 13.513610 | 64.050000 | 64.058094 |
| 8 | 15.280665 | 74.550000 | 77.909442 |
| 9 | 17.030158 | 86.000000 | 87.446495 |
| 10 | 18.764197 | 98.900000 | 105.005689 |
| 11 | 20.484449 | 113.550000 | 111.392783 |
| 12 | 22.192267 | 132.444444 | 116.451480 |
| 13 | 23.888769 | 118.950000 | 122.041904 |
| 14 | 25.574892 | 125.555556 | 132.424604 |

The curve is deliberately smooth and monotonic rather than fitting fourteen independent temperatures to only eighteen or twenty observations per round. Individual rounds can sit above or below the curve, especially the unusually adventurous round twelve.

## Reproduction

From `app/fantasy420`, run:

```sh
npm run calibrate:mock-draft
```

The command rebuilds all observations from checked-in 2024 and 2025 data, fits the coefficients deterministically, and prints the complete machine-readable report.
