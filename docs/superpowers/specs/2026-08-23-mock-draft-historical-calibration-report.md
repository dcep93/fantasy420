# Historical Mock-Draft Calibration Report

## Result

The maximum-likelihood round-aware baseline for slider inputs of `1` is:

| Coefficient | Legacy | Previous pooled fit | Round-aware fit |
| --- | ---: | ---: | ---: |
| Position saturation penalty | 16 | 10.849574 | 14.174711 |
| Same-position bye penalty | 9 | 0 | 0 |
| Round-one Gumbel temperature | 3.5 | 8.737719 | 1.639461 |
| Round-growth exponent | 0 | 0 | 0.842035 |

The runtime temperature is `1.639461 * round^0.842035 * sqrt(craziness)`. It grows smoothly from `1.639461` in round one to `15.127982` in round fourteen and never limits the eligible candidate set. The bye coefficient again reached the nonnegative boundary; its optimizer result is recorded as zero in runtime code.

## Data Coverage

| Season | Raw sources | Usable normalized sources | First-14-round picks | Eligible non-K picks | Likelihood observations | Missing composite ranks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 11 | 9 | 140 | 139 | 139 | 0 |
| 2025 | 9 | 8 | 140 | 137 | 137 | 0 |
| Total | 20 | 17 | 280 | 276 | 276 | 0 |

The replay uses each season's format-aware composite ranking and the historical roster's required DST capacity of one. That historical capacity is explicit and intentionally independent from the current no-DST default. Actual kicker selections remain in chronological and team history but are excluded as choice observations under the current no-kicker mock-draft rule.

## Likelihood

| Model | Total negative log likelihood | Mean per pick | Effective choices per pick |
| --- | ---: | ---: | ---: |
| Legacy `16 / 9 / 3.5 / 0` | 1187.886663 | 4.303937 | 73.9905 |
| Previous pooled `10.849574 / 0 / 8.737719 / 0` | 877.755239 | 3.180273 | 24.0533 |
| Round-aware `14.174711 / 0 / 1.639461 / 0.842035` | 827.536645 | 2.998321 | 20.0518 |

Lower negative log likelihood is better. The round-aware model improves total negative log likelihood by `50.218594`, or approximately `5.7%`, over the previous pooled fit.

## Expected-vs-Actual Diagnostics

The previous fit applied late-round variance to every pick. In the historical sample, first-round selections averaged available-player rank `2.5` and never exceeded rank `9`, while later selections reached as deep as rank `99`. The smooth curve reflects that changing spread without a hard reach ceiling.

| Round | Temperature | Actual available rank | Expected available rank |
| ---: | ---: | ---: | ---: |
| 1 | 1.639461 | 2.500000 | 2.189978 |
| 2 | 2.938860 | 3.700000 | 3.604993 |
| 3 | 4.134794 | 6.450000 | 5.296648 |
| 4 | 5.268132 | 6.850000 | 6.545792 |
| 5 | 6.357089 | 6.050000 | 7.641099 |
| 6 | 7.411936 | 9.650000 | 9.213132 |
| 7 | 8.439238 | 7.800000 | 10.183051 |
| 8 | 9.443532 | 8.100000 | 11.254371 |
| 9 | 10.428136 | 10.250000 | 12.619318 |
| 10 | 11.395571 | 11.950000 | 13.560812 |
| 11 | 12.347817 | 16.550000 | 14.419882 |
| 12 | 13.286466 | 26.000000 | 14.988529 |
| 13 | 14.212824 | 13.150000 | 15.457346 |
| 14 | 15.127982 | 13.444444 | 15.761841 |

The curve is deliberately smooth and monotonic rather than fitting fourteen independent temperatures to only eighteen or twenty observations per round. Individual rounds can therefore sit above or below the curve, especially the unusually adventurous round twelve.

## Reproduction

From `app/fantasy420`, run:

```sh
npm run calibrate:mock-draft
```

The command rebuilds all observations from checked-in 2024 and 2025 data, fits the coefficients deterministically, and prints the complete machine-readable report.
