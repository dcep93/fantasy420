# Wider NFL Team Cards Design

## Goal

Give each `NFLTeams` card enough horizontal space for its player rows and six-column schedule without wrapping names or adding a scrollbar inside the card.

## Layout

- Increase the grid's minimum card width from 420 pixels to 700 pixels.
- Limit each position group to two player columns so extra card width makes player rows wider instead of creating more columns. A position group with one player continues to use the full row.
- Keep all six schedule columns visible in each row.
- Remove the schedule's internal horizontal scrolling.
- Give every player tile two deliberate lines: the non-wrapping player name first, followed by a non-wrapping `ADP · position rank` metadata line. Preserve the existing non-wrapping team-name rules.
- When the viewport is narrower than a card, allow the overall page to extend horizontally rather than compressing or scrolling content inside the card.

## Verification

- Confirm the stylesheet uses a 700-pixel minimum card width, keeps both player-tile lines from wrapping, and contains no internal schedule overflow rule.
- Run the configured Vitest suite and production build.
- Commit the implementation and push `main` to its configured upstream.
