# Simplify Draft Source Labels

## Goal

Make the `/draft` source list less explanatory and remove the unwanted half-PPR ranking board. Non-Superflex handling should remain implicit in the source key and composite behavior.

## Changes

- Remove `rotostreet_half_ppr` and all of its rankings from `Draft/2026.json` so it no longer appears as a source or influences the composite.
- Remove the RotoStreet depth, representative-value, and matching expectations from `Draft/2026.test.ts`.
- Change source-label formatting so it returns the source name without appending ` (SF-adjusted)`.
- Keep separators blank and preserve all existing Superflex classification, QB-neutralization, and composite calculations.

## Validation

- Update the source-label unit test to assert that a non-Superflex source is displayed verbatim.
- Run the complete test suite and production build.
- Confirm the JSON source order remains unchanged apart from the removed RotoStreet entry.

## Non-goals

- Do not rename other source keys or hide their scoring formats.
- Do not change how native Superflex and non-Superflex boards contribute to the composite.
- Do not replace RotoStreet with another source.
