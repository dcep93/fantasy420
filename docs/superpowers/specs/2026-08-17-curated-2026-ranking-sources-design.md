# Curated 2026 Ranking Sources Design

## Goal

Add a curated group of complete, current 2026 redraft rankings to `Draft/2026.json`. The additions should improve the composite with distinct, high-quality opinions without targeting an arbitrary source count or importing weak, stale, derivative, or incomplete lists.

## Selected sources

The implementation will attempt these eight domains, using one ranking per domain:

1. `ringer_ppr_super_auction`: The Ringer's public PPR Superflex auction values.
2. `pfn_ppr_super`: PFN's current Superflex PPR overall rankings.
3. `footballguys_10_ppr_super`: Footballguys' public custom Top 300 configured for 10 teams, PPR, and Superflex.
4. `yahoo_boone_ppr`: Justin Boone's full-PPR Top 300 from Yahoo.
5. `qblist_ppr`: QB List's independent PPR Top 300.
6. `cbs_ppr_auction`: CBS's public PPR Top 200 auction values.
7. `fftoday_ppr`: FFToday's current public PPR Top 225.
8. `rotostreet_half_ppr`: The Wolf's individual half-PPR Top 250, exposed through the FantasyPros widget for expert 960.

A selected source will be omitted if its current complete board cannot be retrieved or if player-name matching cannot be made reliable. It will not be replaced merely to preserve the count of eight.

## Exclusions

- Sharp Football Analysis, Establish The Run, and PFF are excluded because their unauthenticated pages and public API responses expose only teaser content. The implementation will not bypass authentication or paywalls.
- RotoWire, Yahoo consensus, and other broad consensus boards are excluded because FantasyPros is already present and additional consensus sources would amplify correlated opinion.
- Additional Reddit rankings are excluded because Kyon already represents that domain.
- Dynasty, best-ball, knockout, devy, ADP-comparison, and VBD tools are excluded because they answer different questions from this redraft composite.
- Stale, partial, positional-only, opaque, or low-confidence sources will not be imported.

## Data representation

The legacy JSON structure remains unchanged:

```json
{
  "source_name": {
    "Player Name": 1
  }
}
```

Ordinal ranks remain positive, with lower numbers preferred. Auction prices are stored as negative dollar values, so higher prices sort first. Equal auction prices continue to receive shared midpoint ranks at render time.

Only rankings that are natively Superflex include `super` in their source key. This is required by the format-aware composite:

- Native Superflex sources contribute QB and non-QB opinion.
- Non-Superflex sources contribute RB, WR, and TE opinion but have zero QB influence.

## Collection and normalization

Rankings will be extracted from the current public HTML, embedded page data, public CSV, or unauthenticated endpoint supplied to the page. No previous-season values will be used.

Player names receive only compatibility normalization required to match the 2026 wrapped ESPN player pool, including typographic apostrophes, common suffix differences, full names in place of initials, and obvious team-defense naming differences. Source ordering and auction prices otherwise remain unchanged.

The source order will preserve the established layout:

1. ESPN
2. DraftSharks
3. Tap That Draft
4. YAFSB
5. all other sources, with the new exact-format and auction sources placed first within this group
6. Rotoworld last

## Validation

For every imported source, validation will check:

- the expected minimum depth;
- numeric, finite values;
- no duplicate normalized player names;
- a strong match rate against the 2026 wrapped player pool;
- non-positive values for auction sources;
- correct `super` classification from the source key.

The existing `2026.test.ts` expectations will be updated to cover the final included set and ordering. The complete test suite and production build must pass. A local `/draft` smoke test will confirm that the new source tabs appear, non-Superflex tabs show as SF-adjusted, and the composite renders without errors.

## Deliverable

The deliverable is the updated `2026.json` snapshot and its validation tests. A reusable automated refresh system is outside this task's scope. Final reporting will identify any designed source that was omitted and the concrete completeness or matching reason.
