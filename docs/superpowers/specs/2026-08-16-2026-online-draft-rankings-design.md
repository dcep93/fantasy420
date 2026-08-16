# 2026 Online Draft Rankings Design

## Goal

Populate `Draft/2026.json` with a broad but curated collection of complete 2026 fantasy-football rankings downloaded or scraped from current online sources. No ranking values will be inferred from prior-year JSON files.

## Source policy

- Include roughly eight to ten credible, accessible domains with complete overall lists.
- Prefer auction, 10-team, PPR, and superflex variants, in that order, when a domain exposes multiple choices.
- Keep materially different auction and ordinal lists from the same major platform when both add useful information.
- Include one strong, complete community ranking sourced through Reddit.
- Exclude partial articles, positional-only lists, stale 2025 data, paywalled fragments, mirrors, redundant same-domain variants, and datasets with inadequate sample sizes.
- Candidate domains include ESPN, DraftSharks, FantasyPros, Yahoo, Rotoworld, Harris Football, RotoBaller, YAFSB, and Reddit-linked community rankings. A candidate is included only if its complete list can be retrieved reliably.

## Data shape and ranking semantics

The existing JSON shape remains unchanged:

```json
{
  "source_name": {
    "Player Name": 1
  }
}
```

Ordinal rankings and ADP values remain positive, with lower values preferred. Auction values are stored as negative dollars so higher prices sort earlier in the existing UI. Source keys will identify important variants such as `super`, `ppr`, or `auction` without adding metadata that the current renderer cannot consume.

## Collection and normalization

Each included list will be extracted from its current 2026 page, PDF, CSV, sheet, or public endpoint. Extraction may use small local scripts for repeatability during this update, but the requested deliverable is the populated JSON snapshot rather than a new refresh subsystem.

Names will receive only compatibility normalization needed to match the 2026 ESPN player pool, such as typographic apostrophes, suffix spacing, defense naming, and obvious source decorations. Rankings and auction values will otherwise retain the source's ordering or price.

## Validation

For every source, validation will report entry count, duplicate names, numeric values, and match rate against the 2026 wrapped player dataset. Sources that are incomplete or match poorly will be fixed or excluded. Final checks include JSON parsing, frontend tests, the production build, and a browser smoke test confirming that every source appears and renders on `/draft`.

## Security and provenance

No credentials or private browser data will be stored. The implementation summary will identify the online pages used and note any candidate sources excluded for completeness or accessibility reasons.
