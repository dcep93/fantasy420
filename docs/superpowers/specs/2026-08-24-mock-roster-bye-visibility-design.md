# Mock Roster Bye-Week Visibility

## Goal

Keep every drafted player's bye-week number visible in the narrow mock-roster cards on a standard Mac viewport.

## Design

Keep the roster column at its existing 118px width so the rankings table does not lose horizontal space. Split the current inline `POSITION · bye WEEK` detail into two stacked lines: the position on the first line and `bye WEEK` on the second. Each line fits inside the narrow text area beside the player image, including two-digit bye weeks.

This changes only the detail layout. Player names, images, pick numbers, rank controls, card dimensions, colors, and draft behavior remain unchanged.

## Testing

Add component coverage that verifies the position and complete bye-week label render as separate detail elements. Add a CSS regression assertion that the detail container uses a vertical layout. Run the focused mock-draft component tests and production build.
