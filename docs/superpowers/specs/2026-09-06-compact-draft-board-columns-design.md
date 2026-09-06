# Compact Draft Board Columns Design

## Goal

Reduce the excessive horizontal empty space in DraftBoard by making every manager column narrower while retaining the fixed grid alignment introduced for long names. Apply the same density to ReachesAndSteals because both views intentionally share one board component.

## Layout

Change the shared draft-board column width from `15em` to `11.5em`, a reduction of roughly 23%. The width remains fixed rather than responsive so every team column has predictable geometry and the number of teams visible at a given viewport does not vary with card content.

Keep the current header and player row heights. Team and player names may wrap inside their cells, and the existing overflow containment ensures they cannot resize a column or shift later rows. The pick/ADP summary remains on the first line; live visual verification will confirm that representative long summaries and the additional ReachesAndSteals verdict line fit within the narrower cards.

## Scope and Verification

- Update the shared CSS custom property only; do not create view-specific widths.
- Extend the shared-grid regression test to assert the compact width token.
- Preserve DraftBoard round/position sorting, keyboard behavior, ReachesAndSteals gradients and labels, and all empty states.
- Run the focused board tests, complete Vitest suite, and production build.
- Inspect DraftBoard and ReachesAndSteals in the live app at desktop width, checking visible column density, aligned row geometry, clipped or overflowing content, and browser runtime errors.
- Commit the implementation and push `main` to its configured upstream.
