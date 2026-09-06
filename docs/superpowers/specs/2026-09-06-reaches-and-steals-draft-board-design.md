# Reaches and Steals Draft Board Design

## Goal

Replace the split reaches-and-steals tables with a manager-column draft board that mirrors DraftBoard, rename the tab to ReachesAndSteals, place it immediately after DraftBoard, and keep every row aligned even when team or player names wrap.

## Shared Draft Board Grid

Extract the visual board into a small shared component used by DraftBoard and ReachesAndSteals. The component receives manager columns, card content, and card colors while owning the fixed-width column and fixed-height row layout. Team headers and player cards use CSS Grid sizing with border-box dimensions so a long name can wrap inside its cell without increasing that row's height or shifting later picks in one column.

DraftBoard retains its current behavior and content: columns are ordered by draft slot, cards show the pick/composite and positional-rank summary, position colors remain unchanged, and clicking or using Enter/Space toggles between round and position order.

## Reaches and Steals Behavior

Rename the module, component, source file, test file, tab key, and visible label from DraftDayReachesAndSteals to ReachesAndSteals. Register it immediately after DraftBoard in the Wrapped module map so the navigation order reflects their relationship.

ReachesAndSteals uses the same manager columns and card summary as DraftBoard but is permanently ordered by draft round and has no sorting interaction. Every resolved drafted player is included, including kickers and defenses. A pick earlier than composite ADP is a reach and uses the existing warm orange/red color; a pick later than composite ADP is a steal and uses the existing green color. Picks exactly at ADP and picks without composite ADP use a neutral gray. Missing player records cannot produce a player card and continue to be omitted safely.

The page keeps the existing season-specific states: it reports when ADP is unavailable for the selected year and separately reports when no draft picks exist.

## Data Flow and Boundaries

- `getDraftBoardColumns` remains the canonical transformation from Wrapped draft data to manager columns.
- The shared grid is presentation-only and does not fetch or classify data.
- DraftBoard owns its interactive ordering state and supplies position-based colors.
- ReachesAndSteals supplies unchanged round-order columns and classifies each card from overall pick number versus composite ADP.
- Existing market-analysis helpers that supported the removed tables are deleted rather than retained without a consumer.

No Wrapped data formats, draft data fetching, year selection, or unrelated tabs change.

## Verification

- Update DraftBoard tests to assert the shared CSS-grid structure and fixed row sizing while preserving round/position interaction coverage.
- Replace the table-oriented reaches-and-steals tests with board tests for manager columns, round order, card summaries, reach/steal/neutral colors, kicker and defense inclusion, missing ADP, and empty states.
- Verify the renamed module appears immediately after DraftBoard and the old module name is no longer registered.
- Run the focused Vitest suites, the full test suite, and the production build, then review the final diff for unrelated changes.
