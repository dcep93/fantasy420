# Overall-Rank Mock Opponent Choices

## Goal

Make mock managers choose between players according to their original overall composite rankings instead of renumbering the remaining players before every pick.

## Choice Model

Each eligible candidate will retain its zero-based index in the complete ordered composite ranking. That overall-rank index will replace the candidate's temporary index among available players in the existing Gumbel score:

`overall rank + position penalty + bye penalty - round temperature * gumbel noise`

Only score differences affect a choice. Consequently, removing players ranked between two candidates preserves their original rank gap. If Josh Allen is overall rank 1, Lamar Jackson is rank 2, and Joe Burrow is lower, Allen will have a larger probability advantage over Burrow than Jackson has even when each comparison contains only those two available players.

Position saturation, same-position bye risk, round-aware variance, craziness scaling, roster eligibility, and deterministic seeded replay remain unchanged.

## Historical Calibration

Historical observations will use every candidate's overall composite index as the ranking feature. The deterministic maximum-likelihood calibration will refit the position penalty, bye penalty, round-one temperature, and round-growth exponent against the same 2024 and 2025 draft histories.

Calibration summaries and the checked-in report will describe overall composite rank rather than available-player rank. Existing coverage and missing-player validation remain unchanged.

## Testing

A focused simulation regression will compare two-player choices across many deterministic seeds. It will verify that rank 1 defeats the same lower-ranked candidate more often than rank 2 does, which the remaining-player model cannot represent.

Calibration tests will continue to require reproducible checked-in coefficients and improved likelihood over legacy baselines. The focused simulator and calibration tests, full frontend suite, calibration command, and production build will run before delivery.
