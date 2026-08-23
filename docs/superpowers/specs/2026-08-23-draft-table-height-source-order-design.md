# Draft Table Height, Source Order, and Drafted Opacity

## Goal

Give the rankings table a full viewport of visible working space, place the source controls after that workspace, and make drafted players recede more clearly in the table.

## Layout

The rankings workspace will render before the existing `draft-rankings-controls` block. The workspace will occupy one viewport height and will continue to contain the optional mock-draft roster alongside the rankings table scroller. The rankings table and its filters will remain inside `mock-draft-player-scroller`, which will scroll internally without expanding the workspace.

The complete source block will follow the full-height workspace. Keeping the source list, active-source summary, and optional regeneration/debug details together preserves their existing relationship while ensuring none of them consume the table's viewport-height allocation. Users will reach the source block by scrolling the page below the table workspace.

## Drafted Rows

Drafted rankings cells other than the first metadata cell will render at `opacity: 0.5`, replacing the current `0.8`. The first cell will remain fully opaque with its existing dark background and light text so the row retains a stable visual anchor.

## Responsive Behavior

The workspace will use `height: 100vh` and `min-height: 0`. Its rankings scroller will retain `height: 100%` and `overflow: auto`. The existing fixed-width mock roster and flexible table widths will not change.

## Testing

Focused integration and stylesheet tests will verify that:

- the source-controls block is the next sibling after the rankings workspace;
- the workspace receives the full viewport height;
- the rankings scroller retains internal scrolling; and
- drafted non-leading cells use 50% opacity while the first cell remains fully opaque.

The focused Vitest suites and production build will run after implementation.
