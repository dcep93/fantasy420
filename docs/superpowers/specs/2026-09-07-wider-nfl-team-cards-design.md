# Wider NFL Team Cards Design

## Goal

Give each `NFLTeams` card enough horizontal space for its player rows and six-column schedule without wrapping names or adding a scrollbar inside the card.

## Layout

- Increase the grid's minimum card width from 420 pixels to 700 pixels.
- Keep all six schedule columns visible in each row.
- Remove the schedule's internal horizontal scrolling.
- Keep each full player row on one line, including the ADP and position rank, and preserve the existing non-wrapping team-name rules.
- When the viewport is narrower than a card, allow the overall page to extend horizontally rather than compressing or scrolling content inside the card.

## Verification

- Confirm the stylesheet uses a 700-pixel minimum card width, prevents full player rows from wrapping, and contains no internal schedule overflow rule.
- Run the configured Vitest suite and production build.
- Commit the implementation and push `main` to its configured upstream.
