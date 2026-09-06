# Seven-Em Draft Board Columns Design

## Goal

Set the shared DraftBoard and ReachesAndSteals manager columns to the user's exact `7em` width target while preserving fixed row alignment and readable card content.

## Layout

Change `--draft-board-column-width` from `11.5em` to `7em`. Keep the existing fixed header and card row tracks so wrapping in one column never moves later rows out of alignment.

Preserve every existing pick summary, player name, and ReachesAndSteals verdict label. Long text continues to wrap and remains available through existing team-name titles and accessible card labels. If live verification shows clipping at the narrower width, reduce only cell margins and padding; do not abbreviate data, expand individual columns, or remove labels.

## Verification and Delivery

- Update the CSS custom-property regression test to require `7em`.
- Run the focused board tests, complete Vitest suite, and production build.
- Inspect both live boards at desktop width, confirming denser columns, identical row geometry, and no clipped content for representative long team and player names.
- Commit the implementation and push `main` to its configured upstream.
