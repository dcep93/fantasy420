# Puka Nacua and Davante Adams Weekly Fantasy Score Graph Design

## Goal

Create one in-conversation line graph comparing Puka Nacua and Davante Adams by weekly fantasy score during the 2025 regular season.

## Data source and semantics

- Read each player's `scores` map from `app/fantasy420/src/fantasy420/app/Wrapped/dataJson/2025.json`.
- Use entries 1–18 as regular-season weeks; entry 0 is the season total and must not be plotted.
- Preserve every score exactly as stored, including explicit zeroes.
- Treat a missing week as missing data rather than inventing a zero. Both players lack a Week 8 entry, so their lines break at Week 8.

## Graph design

Use one responsive Cartesian line graph with regular-season week on the x-axis and fantasy points on the y-axis. Render one solid line per player. Preserve the established player-color mapping from the earlier chart: Puka uses the first series color and Davante uses the second. Use distinct circle and diamond markers so identity does not depend on color alone.

Provide a compact interactive legend with one toggle per player and a cross-series tooltip that interpolates between present adjacent observations while showing exact stored values at weekly markers. Use labeled axes, theme-aware colors, a concise accessible description, integer week ticks, and one-decimal score formatting.

## Verification

- Confirm all plotted weekly values against the two source `scores` maps.
- Confirm that Week 8 is a gap and explicit zeroes remain visible at zero.
- Check line and marker geometry, labels, and overflow at 736px and 360px.
- Check light and dark themes.
- Exercise both legend toggles and the cross-series tooltip.
- Confirm there are no browser console errors.

## Scope

The deliverable is a single in-conversation graph. It does not modify the Fantasy420 application or its source data.
