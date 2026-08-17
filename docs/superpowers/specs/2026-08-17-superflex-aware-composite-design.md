# Superflex-Aware Draft Composite Design

## Goal

Allow strong non-superflex rankings to improve the draft composite's RB, WR, TE, K, and D/ST ordering without giving those sources any influence over quarterback value. Non-superflex source tabs will also render as clearly labeled superflex-adjusted boards.

## Source classification

A source is native superflex when its key contains `super`, case-insensitively. Existing source keys from 2023 through 2026 follow this convention. Empty separator keys remain inert and are never adjusted.

## Quarterback scaffold

First compute a provisional composite from native superflex sources only, using the current midpoint-rank and missing-player behavior. Its ordered quarterbacks define an immutable scaffold: each quarterback's identity, relative order, and overall slot come exclusively from native superflex evidence.

Only quarterbacks present in at least one native superflex source enter the scaffold. A quarterback found solely in a non-superflex source cannot enter the composite.

## Non-quarterback composite

Remove quarterbacks from every source and rerank each remaining board. Auction ties continue to receive shared midpoint ranks, and missing players remain ignored. Average these ranks to produce a single all-source non-quarterback order.

Construct the final composite by retaining every quarterback in the exact slot defined by the native superflex scaffold and filling every other slot with the all-source non-quarterback order. This guarantees that non-superflex sources cannot add, remove, move, or reorder quarterbacks while still allowing them to improve ordering among other positions.

## Adjusted source views

Native superflex source tabs render unchanged. For every non-superflex source with ranking data:

1. Remove its original quarterbacks.
2. Preserve the source's non-quarterback ordering.
3. Insert every quarterback from the native superflex scaffold into its scaffold slot.
4. Label the source as `SF-adjusted` in the source selector and active-source heading.

These inserted quarterbacks are display scaffolding, not claims attributed to the original source, and they never contribute a rank back into the composite.

## Fallback and compatibility

If a selected year has no usable native superflex source, retain the current raw composite and raw source rendering. This prevents malformed or future datasets from producing an empty board.

## Implementation boundaries

Pure ranking helpers will own source classification, midpoint-aware composite scoring, quarterback scaffold extraction, non-quarterback ordering, and scaffold merging. The React component will only supply source maps and player positions, then render the returned composite and adjusted sources.

## Validation

Focused tests will verify:

- case-insensitive `super` classification and separator handling;
- exact preservation of quarterback identities, order, and slots;
- zero effect from changing or omitting quarterbacks in non-superflex sources;
- non-quarterback influence from every source;
- shared midpoint treatment for tied source values;
- insertion of quarterbacks omitted by a non-superflex source;
- adjusted-source labeling; and
- raw fallback behavior when no superflex source exists.

The full test suite and production build must pass after integration.

