# Missing historical weekly projections

Fix the reported false-certainty bug by preserving unknown projections and enforcing the existing rule that matchups without weekly projections are excluded. Historical snapshots were produced by a fetcher that replaced absent ESPN weekly stat records with zero. Unmarked legacy zeros are therefore ambiguous and cannot be trusted; positive/nonzero finite projections remain usable. New fetches declare weeklyProjectionDataVersion 1, meaning absent or nonfinite records are omitted and an explicit ESPN zero can be distinguished from missing data.

Extract weekly projections only from records matching the requested season, week, and projection source. Prefer archived matchup lineup player records when present; use matching records on the team roster as fallback. Never use season averages, another week, generic projections, final outcomes, or fake uncertainty to fill gaps. ESPN's archived endpoint was blocked by the connected browser during this investigation, so no historical values are being invented or backfilled.

SpiciestMatchups will count and disclose omitted matchups by year before ranking the remaining complete data. Preserve computeSpiciestMatchups' array API through an analysis wrapper returning coverage diagnostics for the loader. Fix the 2023 Week 1 reported matchup in both single-year and all-years views by excluding its unreliable projection timeline. No snapshot mass rewrite and no changes to other probability consumers.

Verification: exact weekly extraction, explicit zero preservation, missing/invalid record omission, archived-record preference, legacy zero rejection, finite nonzero backward compatibility, the actual 2023 fixture, all-years omission counts, and UI explanation. Run focused tests, TypeScript/build, and browser checks.

Request audit: prior removals, all-years aggregates, chunking, spicy ranking improvements, probability model/axis, zoom/play details, below-graph panel, and PlayoffMachine cutoff are complete. MHJ's team/bye mismatch remains unresolved because the recent ESPN fetch still reports Arizona; no override has been requested or applied.

Validation: 61 focused tests passed, including the reported 2023 snapshot regression; TypeScript and production build passed. Browser checks show 6 omitted 2023 matchups and 15 across all years (2023: 6, 2024: 4, 2025: 5), with the remaining rankings populated. Historical data files were not rewritten.
